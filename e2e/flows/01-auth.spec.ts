/**
 * Fluxo: Auth — login OK, credenciais inválidas, validação, esqueci-senha.
 * Migrado para os helpers SSOT (loginViaUI, loginAs, gotoAndSettle,
 * expectVisibleByTestId). Sem `page.goto`/`waitForTimeout` direto.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { Sel } from "../fixtures/selectors";
import { gotoAndSettle } from "../helpers/nav";
import {
  loginAs,
  loginViaUI,
  expectAuthenticated,
  expectUnauthenticated,
} from "../helpers/auth";
import { expectVisibleByTestId } from "../helpers/waits";

test.describe("Fluxo: Auth", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("renderiza form de login com elementos essenciais", async ({ page }) => {
    await gotoAndSettle(page, "/login");
    await expectVisibleByTestId(page, "login-email-input");
    await expectVisibleByTestId(page, "login-password-input");
    await expectVisibleByTestId(page, "login-submit");
  });

  test("rejeita credenciais inválidas e permanece em /login", async ({ page }) => {
    await loginViaUI(page, {
      email: "naoexiste@example.com",
      password: "SenhaErrada123",
      expectFail: true,
    });
    await expectUnauthenticated(page);
  });

  test("valida email malformado", async ({ page }) => {
    await gotoAndSettle(page, "/login");
    await page.locator(Sel.login.email).fill("naoehemail");
    await page.locator(Sel.login.password).fill("Senha123");
    await page.locator(Sel.login.submit).first().click();
    await expect(page.locator(Sel.login.errorMsg).first()).toBeVisible({
      timeout: 4_000,
    });
  });

  test("alterna visibilidade da senha", async ({ page }) => {
    await gotoAndSettle(page, "/login");
    const pwd = page.locator(Sel.login.password);
    await expect(pwd).toHaveAttribute("type", "password");
    const toggle = page.locator(Sel.login.toggle).first();
    if (await toggle.count()) {
      await toggle.click();
      await expect(pwd).toHaveAttribute("type", "text");
    }
  });

  test("abre fluxo de esqueci minha senha", async ({ page }) => {
    await gotoAndSettle(page, "/login");
    const link = page.locator(Sel.login.forgot).first();
    if (await link.count()) {
      await link.click();
      await expectVisibleByTestId(page, "forgot-password-screen", { timeout: 4_000 });
    }
  });

  test("login com credenciais válidas redireciona para app", async ({ page }) => {
    requireAuth();
    await loginAs(page, "user");
    await expectAuthenticated(page);
  });
});
