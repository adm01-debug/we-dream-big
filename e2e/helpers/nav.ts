/**
 * Navegação e esperas resilientes — anti-flake.
 *
 * Estratégia do gotoAndSettle:
 *  1. goto domcontentloaded
 *  2. networkidle curto (best-effort)
 *  3. hidratação React (#root populado)
 *  4. ausência de skeletons
 *  5. body sem aria-busy
 *  6. CSS kill-switch de animações (defensivo)
 */
import { expect, type Locator, type Page } from "@playwright/test";

const ANIM_KILL_CSS = `
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
    scroll-behavior: auto !important;
  }
`;

const STYLED_PAGES = new WeakSet<Page>();

async function injectAnimKill(page: Page) {
  if (STYLED_PAGES.has(page)) return;
  try {
    await page.addStyleTag({ content: ANIM_KILL_CSS });
    STYLED_PAGES.add(page);
  } catch {
    /* página pode estar navegando — tolerável */
  }
}

/**
 * Aguarda a rota chegar a um estado idle (DOM + sem skeletons + sem aria-busy).
 * Substitui usos de `waitForLoadState("networkidle")` em specs (proibido pelo
 * lint), pois `networkidle` é flaky em SPAs com realtime/polling.
 */
export async function waitForRouteIdle(page: Page, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 10_000;
  await page.waitForLoadState("domcontentloaded", { timeout });
  await page
    .waitForFunction(
      () => !document.querySelector('[data-state="loading"], [data-skeleton]'),
      { timeout: Math.min(timeout, 8_000) },
    )
    .catch(() => {});
  await page
    .waitForFunction(() => !document.querySelector('[aria-busy="true"]'), {
      timeout: Math.min(timeout, 3_000),
    })
    .catch(() => {});
}

/**
 * Asserção SSOT de URL atual (usa o auto-retry do `expect`). Substitui
 * `expect(page.url()).toContain(...)` cru, que não faz retry.
 */
export async function expectOnRoute(
  page: Page,
  pathOrRegex: string | RegExp,
  opts?: { timeout?: number },
) {
  const re = typeof pathOrRegex === "string"
    ? new RegExp(pathOrRegex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    : pathOrRegex;
  await expect(page, `esperado URL match ${re}`).toHaveURL(re, {
    timeout: opts?.timeout ?? 10_000,
  });
}

export async function gotoAndSettle(page: Page, path: string, opts?: { timeout?: number }) {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: opts?.timeout ?? 20_000 });

  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {
    /* best-effort: SPA pode manter conexões abertas (websockets/realtime) */
  });

  // Hidratação React: #root deve ter filhos
  await page
    .waitForFunction(
      () => {
        const root = document.querySelector("#root");
        return !!root && root.children.length > 0;
      },
      { timeout: 10_000 },
    )
    .catch(() => {
      /* tolerável: rotas que não usam #root */
    });

  // Skeletons devem sumir
  await page
    .waitForFunction(
      () => !document.querySelector('[data-state="loading"], [data-skeleton]'),
      { timeout: 8_000 },
    )
    .catch(() => {
      /* tolerável: pode não haver skeleton */
    });

  // aria-busy false (best-effort)
  await page
    .waitForFunction(
      () => {
        const busy = document.querySelector('[aria-busy="true"]');
        return !busy;
      },
      { timeout: 3_000 },
    )
    .catch(() => {
      /* tolerável */
    });

  await injectAnimKill(page);
}

/**
 * Aguarda o término de fetches/skeletons após uma ação (clique que dispara mutação).
 */
export async function settleAfterAction(page: Page, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 5_000;
  await page.waitForLoadState("networkidle", { timeout }).catch(() => {});
  await page
    .waitForFunction(
      () => !document.querySelector('[data-state="loading"], [data-skeleton]'),
      { timeout },
    )
    .catch(() => {});
}

/**
 * Espera centralizada por elemento visível — substitui `.first().waitFor({state:"visible"})`.
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  timeout = 10_000,
): Promise<Locator> {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout });
  return loc;
}

/**
 * Espera por contagem específica de elementos.
 */
export async function waitForCount(
  locator: Locator,
  expected: number,
  timeout = 10_000,
): Promise<void> {
  await expect
    .poll(() => locator.count(), {
      timeout,
      message: `Aguardando count=${expected} para locator`,
    })
    .toBe(expected);
}

export async function expectNoConsoleErrors(consoleLogs: Array<{ type: string; text: string }>) {
  const errors = consoleLogs.filter(
    (l) =>
      l.type === "error" &&
      // ruído conhecido aceitável
      !/Download the React DevTools/.test(l.text) &&
      !/ResizeObserver loop/.test(l.text) &&
      !/Failed to load resource: the server responded with a status of 401/.test(l.text) &&
      !/ChunkLoadError/i.test(l.text) &&
      !/Loading chunk \d+ failed/i.test(l.text) &&
      !/analytics/i.test(l.text),
  );
  if (errors.length > 0) {
    throw new Error(`Console errors detected:\n${errors.map((e) => e.text).join("\n")}`);
  }
}
