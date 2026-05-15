/**
 * Helpers SSOT de autenticação para a suíte E2E.
 *
 * Política:
 *  - **Todo login UI** deve passar por `loginViaUI` ou `loginAs` — nunca usar
 *    `page.fill('#login-…')` ou `input[type=email]` em specs.
 *  - `loginAs` reaproveita `storageState` global gerado pelo `auth.setup`,
 *    apenas refazendo UI se a sessão não estiver presente.
 *  - Seletores vêm exclusivamente do SSOT `e2e/fixtures/selectors.ts`.
 *  - Asserts via `expect(page).toHaveURL(...)` (auto-retry do Playwright) —
 *    evita `waitForTimeout`.
 *
 * Uso típico:
 *   import { loginAs, loginViaUI, expectAuthenticated } from "../helpers/auth";
 *   await loginAs(page);                          // user comum
 *   await loginAs(page, "admin");                 // admin
 *   await loginViaUI(page, { email, password, expectFail: true });
 */
import { expect, type Page } from "@playwright/test";

import { Sel } from "../fixtures/selectors";
import { test } from "../fixtures/test-base";
import { gotoAndSettle, waitForRouteIdle } from "./nav";
import { clickTestId } from "./waits";

export interface LoginCreds {
  email: string;
  password: string;
  /** Quando true, espera permanecer em /login (validação/erro). */
  expectFail?: boolean;
  /** Timeout customizado para o redirect pós-login. */
  timeoutMs?: number;
}

export type Role = "user" | "admin" | "dev" | "editor";

const LOGIN_URL_RE = /\/login(\?|#|$)/;

/**
 * Executa o fluxo de login via UI usando seletores SSOT.
 * Retorna `true` se autenticado, `false` se ficou na tela de login (esperado em
 * `expectFail: true`).
 */
export async function loginViaUI(page: Page, creds: LoginCreds): Promise<boolean> {
  const timeout = creds.timeoutMs ?? 20_000;
  await gotoAndSettle(page, "/login");

  const emailLoc = page.locator(Sel.login.email).first();
  const passLoc = page.locator(Sel.login.password).first();
  await emailLoc.waitFor({ state: "visible", timeout: 10_000 });
  await emailLoc.fill(creds.email);
  await passLoc.fill(creds.password);

  await clickTestId(page, "login-submit");

  if (creds.expectFail) {
    // Continua em /login OU mostra mensagem de erro — auto-retry expect.
    await expect(page, "esperado falhar e permanecer em /login").toHaveURL(
      LOGIN_URL_RE,
      { timeout: 8_000 },
    );
    return false;
  }

  await expect(page, "esperado redirect para fora de /login").not.toHaveURL(
    LOGIN_URL_RE,
    { timeout },
  );
  await waitForRouteIdle(page);
  return true;
}

/**
 * Faz login com a credencial do papel solicitado, reaproveitando o
 * `storageState` quando já existe sessão. Marca o teste como `skip` se as
 * variáveis de ambiente não estiverem configuradas.
 */
export async function loginAs(page: Page, role: Role = "user"): Promise<void> {
  const email = role === "dev" ? process.env.E2E_DEV_EMAIL : 
                role === "admin" ? process.env.E2E_ADMIN_EMAIL : 
                role === "editor" ? (process.env.E2E_MANAGER_EMAIL || process.env.E2E_ADMIN_EMAIL) : 
                process.env.E2E_USER_EMAIL;
  const password = role === "dev" ? process.env.E2E_DEV_PASSWORD : 
                   role === "admin" ? process.env.E2E_ADMIN_PASSWORD : 
                   role === "editor" ? (process.env.E2E_MANAGER_PASSWORD || process.env.E2E_ADMIN_PASSWORD) : 
                   process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    test.skip(true, `Credenciais E2E_${role.toUpperCase()}_EMAIL/PASSWORD ausentes`);
  }

  // Se já estamos autenticados (storageState aplicado pelo project), uma
  // visita rápida à home não deve cair em /login.
  await gotoAndSettle(page, "/");
  if (!LOGIN_URL_RE.test(page.url())) {
    return;
  }

  await loginViaUI(page, { email: email!, password: password! });
}

/**
 * Encerra a sessão atual via UI (best-effort). Se não houver controle de
 * usuário visível, faz fallback removendo o storage manualmente.
 */
export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies().catch(() => {});
  await page.evaluate(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* noop */ }
  }).catch(() => {});
  await gotoAndSettle(page, "/login");
  await expect(page).toHaveURL(LOGIN_URL_RE, { timeout: 8_000 });
}

/** Asserts reutilizáveis. */
export async function expectAuthenticated(page: Page): Promise<void> {
  await expect(page, "deveria estar autenticado").not.toHaveURL(LOGIN_URL_RE, {
    timeout: 5_000,
  });
}

export async function expectUnauthenticated(page: Page): Promise<void> {
  await expect(page, "deveria estar deslogado / em /login").toHaveURL(LOGIN_URL_RE, {
    timeout: 5_000,
  });
}
