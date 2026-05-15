/**
 * Fluxo: Admin — guards de role.
 * Para usuário comum: deve negar acesso. Para admin: deve carregar.
 * Seletores: Sel.login (SSOT).
 */
import { test, expect, requireAuth, requireAdmin } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { Sel } from "../fixtures/selectors";

test.describe("Fluxo: Admin guards", () => {
  test("usuário sem role admin não acessa /admin/usuarios", async ({ page }) => {
    requireAuth();
    test.skip(
      !!process.env.E2E_USER_IS_ADMIN,
      "Usuário de teste é admin — verificação de bloqueio não aplicável",
    );
    await page.goto("/admin/usuarios");
    await page.waitForTimeout(1500);
    const ok =
      !/\/admin\/usuarios/.test(page.url()) ||
      (await page.locator(Sel.app.accessDenied).count()) > 0;
    expect(ok).toBeTruthy();
  });

  test("admin acessa /admin/usuarios", async ({ page }) => {
    requireAdmin();
    await page.goto("/login");
    await page.fill(Sel.login.email, process.env.E2E_ADMIN_EMAIL!);
    await page.fill(Sel.login.password, process.env.E2E_ADMIN_PASSWORD!);
    await page.locator(Sel.login.submit).first().click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    await gotoAndSettle(page, "/admin/usuarios");
    await expect(page).toHaveURL(/admin\/usuarios/);
  });
});
