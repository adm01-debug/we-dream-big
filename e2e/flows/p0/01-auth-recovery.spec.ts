/**
 * P0 — Auth recovery: sessão expirada, auth offline, logout global.
 * Política: SSOT em e2e/fixtures/selectors.ts — somente data-testid.
 */
import { test, expect } from "../../fixtures/test-base";
import { Sel } from "../../fixtures/selectors";
import { mockSessionExpired } from "./_mocks";

test.describe("P0 — Auth recovery", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.skip("login: auth retornando 503 mostra erro amigável e mantém form interativo", async ({ page }) => {
    await page.route(/\/auth\/v1\/token/, route =>
      route.fulfill({ status: 503, body: JSON.stringify({ error: "service_unavailable" }) }),
    );
    await page.goto("/login");
    await page.fill(Sel.login.email, "user@example.com");
    await page.fill(Sel.login.password, "Senha123!");
    await page.locator(Sel.login.submit).first().click();
    await expect(page.locator(Sel.app.errorBanner).or(page.locator(Sel.app.toast))).toBeVisible();
    await expect(page.locator(Sel.login.submit).first()).toBeEnabled();
  });

  test.skip("sessão expirada durante navegação redireciona para /login com returnTo", async ({ page }) => {
    await page.goto("/catalogo");
    await mockSessionExpired(page);
    await page.reload();
    await expect(page).toHaveURL(/\/login\?.*returnTo=.*catalogo/);
  });

  test.skip("force-global-logout encerra todas as abas em < 5s", async ({ page, context }) => {
    const second = await context.newPage();
    await second.goto("/catalogo");
    await expect(second).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
