/**
 * Fluxo: Simulador de preços.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";

test.describe("Fluxo: Simulador", () => {
  test.beforeEach(() => requireAuth());

  test("acessa simulador", async ({ page }) => {
    await gotoAndSettle(page, "/simulador");
    await expect(page).not.toHaveURL(/\/login/);
  });
});
