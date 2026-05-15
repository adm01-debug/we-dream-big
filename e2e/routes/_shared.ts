/**
 * Helpers compartilhados para a suíte por rota (e2e/routes/**).
 *
 * Provê mocks reutilizáveis (auth-fail, payload inválido, timeout, 5xx) via
 * `page.route()` e utilitários de a11y/mobile que padronizam os 8 casos por
 * rota: render, happy, auth-fail, payload-invalido, timeout, 5xx, a11y, mobile.
 */
import type { Page, Route } from "@playwright/test";
import { expect } from "@playwright/test";

const SUPABASE_HOST_RE = /supabase\.(co|in)/;
const FN_RE = /\/functions\/v1\//;
const REST_RE = /\/rest\/v1\//;
const AUTH_RE = /\/auth\/v1\//;

/* ============================================================
 * Mocks de falha
 * ============================================================ */

export async function mock5xxOnAllEdgeFns(page: Page) {
  await page.route(FN_RE, route =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "service_unavailable" }) }),
  );
}

export async function mockEdgeFn(
  page: Page,
  fnName: string,
  status: number,
  body: unknown,
  opts: { delayMs?: number } = {},
) {
  await page.route(new RegExp(`/functions/v1/${fnName}(\\?|$|/)`), async route => {
    if (opts.delayMs) await new Promise(r => setTimeout(r, opts.delayMs));
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
}

export async function mockTimeoutOnFn(page: Page, fnName: string, hangMs = 30_000) {
  await page.route(new RegExp(`/functions/v1/${fnName}(\\?|$|/)`), async route => {
    await new Promise(r => setTimeout(r, hangMs));
    await route.abort("timedout").catch(() => {});
  });
}

export async function mockRestTable5xx(page: Page, table: string) {
  await page.route(new RegExp(`/rest/v1/${table}(\\?|$)`), route =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "service unavailable" }) }),
  );
}

export async function mockRestTable401(page: Page, table: string) {
  await page.route(new RegExp(`/rest/v1/${table}(\\?|$)`), route =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "JWT expired", code: "PGRST301" }) }),
  );
}

export async function mockRestTablePayloadInvalid(page: Page, table: string) {
  await page.route(new RegExp(`/rest/v1/${table}(\\?|$)`), async route => {
    if (route.request().method() === "GET") return route.continue();
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "invalid input syntax", code: "22P02", details: "payload validation failed" }),
    });
  });
}

export async function mockSessionExpired(page: Page) {
  await page.route(AUTH_RE, route =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "invalid_grant", error_description: "JWT expired" }) }),
  );
}

/* ============================================================
 * Captura de chamadas (para asserts de no-leak / no-mutation)
 * ============================================================ */

export function spySupabaseRequests(page: Page) {
  const calls: Array<{ url: string; method: string; status?: number }> = [];
  page.on("request", req => {
    if (SUPABASE_HOST_RE.test(req.url())) calls.push({ url: req.url(), method: req.method() });
  });
  page.on("response", res => {
    const i = calls.findIndex(c => c.url === res.url() && c.status === undefined);
    if (i >= 0) calls[i].status = res.status();
  });
  return {
    get all() { return calls; },
    writes() { return calls.filter(c => ["POST", "PATCH", "PUT", "DELETE"].includes(c.method)); },
    reset() { calls.length = 0; },
  };
}

/* ============================================================
 * A11y leve (sem axe — checagens estruturais baratas)
 * ============================================================ */

export async function basicA11yChecks(page: Page) {
  // 1. Exatamente 1 <h1> visível (ou 0 — não falha; só checa não duplicar)
  const h1Count = await page.locator("h1:visible").count();
  expect(h1Count, "deve haver no máximo 1 <h1> visível por rota").toBeLessThanOrEqual(1);

  // 2. Inputs visíveis devem ter label, aria-label ou aria-labelledby
  const orphanInputs = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input:not([type=hidden]), select, textarea"));
    return inputs
      .filter(el => {
        const visible = (el as HTMLElement).offsetParent !== null;
        if (!visible) return false;
        const id = el.getAttribute("id");
        const hasLabelFor = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        const hasAria = el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby");
        const wrappedInLabel = el.closest("label") !== null;
        return !hasLabelFor && !hasAria && !wrappedInLabel;
      })
      .map(el => (el as HTMLElement).outerHTML.slice(0, 120));
  });
  expect(orphanInputs, "inputs sem label acessível: " + JSON.stringify(orphanInputs)).toHaveLength(0);

  // 3. Botões devem ter texto ou aria-label
  const orphanButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button:not([disabled])"));
    return btns
      .filter(b => {
        const visible = (b as HTMLElement).offsetParent !== null;
        if (!visible) return false;
        const text = (b.textContent ?? "").trim();
        const aria = b.getAttribute("aria-label");
        return !text && !aria;
      })
      .length;
  });
  expect(orphanButtons, "botões sem texto/aria-label").toBe(0);
}

/* ============================================================
 * Mobile
 * ============================================================ */

export const MOBILE_VIEWPORT = { width: 390, height: 844 };

export async function setMobileViewport(page: Page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
}

/* ============================================================
 * Espera robusta de carregamento de rota
 * ============================================================ */

/* ============================================================
 * Espera robusta de carregamento de rota
 *
 * `waitRouteReady` é mantido como alias de compatibilidade — delega ao
 * helper SSOT `waitForRouteIdle` em `e2e/helpers/nav.ts`. Use sempre o
 * SSOT em código novo.
 * ============================================================ */

import { waitForRouteIdle as _waitForRouteIdle } from "../helpers/nav";

export async function waitRouteReady(page: Page, opts: { timeout?: number } = {}) {
  await _waitForRouteIdle(page, opts);
}

/* ============================================================
 * Bloqueia toda chamada externa (útil em testes de a11y/render isolado)
 * ============================================================ */

export async function blockExternalAssets(page: Page) {
  await page.route(/\.(png|jpg|jpeg|webp|gif|mp4|webm|woff2?)$/, (route: Route) =>
    route.abort().catch(() => {}),
  );
}
