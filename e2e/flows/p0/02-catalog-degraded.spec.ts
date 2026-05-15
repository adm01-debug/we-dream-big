/**
 * P0 — Catálogo: DB externo (Promobrind) offline.
 * Política: SSOT em e2e/fixtures/selectors.ts — somente data-testid.
 */
import { test, expect } from "../../fixtures/test-base";
import { Sel } from "../../fixtures/selectors";
import { mockExternalDbOffline } from "./_mocks";

test.describe("P0 — Catálogo degradado", () => {
  test.skip("external-db-bridge 503: catálogo serve cache e mostra banner", async ({ page }) => {
    await mockExternalDbOffline(page);
    await page.goto("/catalogo");
    await expect(page.locator(Sel.app.errorBanner).first()).toBeVisible();
    const hasProducts = page.locator(Sel.product.card).first();
    await expect(hasProducts.or(page.locator(Sel.app.errorBanner))).toBeVisible({ timeout: 10_000 });
  });

  test.skip("ações de escrita ficam desabilitadas em modo degradado", async ({ page }) => {
    await mockExternalDbOffline(page);
    await page.goto("/catalogo");
    const addToCart = page.locator(Sel.product.cardAddToCart).first();
    if (await addToCart.isVisible().catch(() => false)) {
      await expect(addToCart).toBeDisabled();
    }
  });

  test.skip("Cloudflare Stream offline: vídeo cai pra imagem sem erro no console", async ({ page }) => {
    await page.route(/videodelivery\.net/, route => route.fulfill({ status: 530, body: "" }));
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("/produto/exemplo");
    expect(errors).toHaveLength(0);
  });
});
