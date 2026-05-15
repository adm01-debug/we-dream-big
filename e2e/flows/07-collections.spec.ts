/**
 * Fluxo: Coleções — lista, abre criação.
 * Seletores: Sel.page (SSOT).
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { Sel } from "../fixtures/selectors";

test.describe("Fluxo: Coleções", () => {
  test.beforeEach(() => requireAuth());

  test("lista de coleções carrega", async ({ page }) => {
    await gotoAndSettle(page, "/colecoes");
    await expect(page).toHaveURL(/colecoes/);
    await expect(page.locator(Sel.page.title("colecoes")).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
