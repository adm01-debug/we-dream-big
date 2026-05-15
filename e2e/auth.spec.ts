/**
 * E2E: Auth — login happy path + estados de erro.
 * Migrado para helpers SSOT (loginViaUI, gotoAndSettle, expectVisibleByTestId).
 */
import { test, expect } from "./fixtures/test-base";
import { Sel } from "./fixtures/selectors";
import { gotoAndSettle } from "./helpers/nav";
import { loginViaUI, expectUnauthenticated } from "./helpers/auth";
import { expectVisibleByTestId, clickTestId } from "./helpers/waits";

test.describe("Auth — Login Flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await gotoAndSettle(page, "/login");
  });

  test("renderiza form de login completo", async ({ page }) => {
    await expectVisibleByTestId(page, "login-email-input");
    await expectVisibleByTestId(page, "login-password-input");
    await expectVisibleByTestId(page, "login-submit");
  });

  test("erro de validação para email vazio", async ({ page }) => {
    await page.locator(Sel.login.password).fill("ValidPass123");
    await clickTestId(page, "login-submit");
    await expect(page.locator(Sel.login.errorMsg).first()).toBeVisible({
      timeout: 4_000,
    });
  });

  test("erro de validação para email inválido", async ({ page }) => {
    await page.locator(Sel.login.email).fill("notanemail");
    await page.locator(Sel.login.password).fill("ValidPass123");
    await clickTestId(page, "login-submit");
    await expect(page.locator(Sel.login.errorMsg).first()).toBeVisible({
      timeout: 4_000,
    });
  });

  test("erro de validação para senha curta", async ({ page }) => {
    await page.locator(Sel.login.email).fill("user@test.com");
    await page.locator(Sel.login.password).fill("123");
    await clickTestId(page, "login-submit");
    await expect(page.locator(Sel.login.errorMsg).first()).toBeVisible({
      timeout: 4_000,
    });
  });

  test("alterna visibilidade da senha", async ({ page }) => {
    const pwd = page.locator(Sel.login.password);
    await expect(pwd).toHaveAttribute("type", "password");
    const toggle = page.locator(Sel.login.toggle).first();
    if (await toggle.count()) {
      await toggle.click();
      await expect(pwd).toHaveAttribute("type", "text");
    }
  });

  test("abre tela de esqueci minha senha", async ({ page }) => {
    const link = page.locator(Sel.login.forgot).first();
    if (await link.count()) {
      await link.click();
      await expectVisibleByTestId(page, "forgot-password-screen", { timeout: 4_000 });
    }
  });

  test("rejeita credenciais inválidas e permanece em /login", async ({ page }) => {
    await loginViaUI(page, {
      email: "fake@nonexistent.com",
      password: "WrongPassword123",
      expectFail: true,
    });
    await expectUnauthenticated(page);
  });
});
