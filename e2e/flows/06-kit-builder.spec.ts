/**
 * Fluxo: Kit Builder — abre wizard, valida etapas.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";

test.describe("Fluxo: Kit Builder", () => {
  test.beforeEach(() => requireAuth());

  test("acessa página de kit builder", async ({ page }) => {
    await gotoAndSettle(page, "/kit-builder");
    // Pode redirecionar; aceitamos qualquer rota não-login
    await expect(page).not.toHaveURL(/\/login/);
  });
});
