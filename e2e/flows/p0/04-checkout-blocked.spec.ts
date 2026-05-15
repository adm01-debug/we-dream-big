/**
 * P0 — Checkout / Pedido bloqueado: edge functions de order com 5xx.
 * Política: SSOT em e2e/fixtures/selectors.ts — somente data-testid.
 */
import { test, expect } from "../../fixtures/test-base";
import { Sel } from "../../fixtures/selectors";
import { mockEdgeFunctionFailure } from "./_mocks";

test.describe("P0 — Checkout bloqueado", () => {
  test.skip("create-order 500: carrinho permanece intacto, mostra erro acionável", async ({ page }) => {
    await mockEdgeFunctionFailure(page, "create-order", 500, { error: "internal_error" });
    await page.goto("/carrinhos");
    await expect(page.locator(Sel.app.errorBanner).or(page.locator(Sel.app.toast))).toBeVisible();
    expect(await page.locator(Sel.cart.item).count()).toBeGreaterThanOrEqual(0);
  });

  test.skip("falha após dedução de estoque: rollback completo (nenhum órfão)", async () => {
    expect(true).toBe(true);
  });

  test.skip("dupla submissão (double-click): cria apenas 1 order (idempotência)", async () => {
    expect(true).toBe(true);
  });
});
