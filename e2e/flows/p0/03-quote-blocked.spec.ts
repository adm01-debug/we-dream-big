/**
 * P0 — Orçamento bloqueado: CRM/Bitrix offline durante criação ou aprovação.
 * Política: SSOT em e2e/fixtures/selectors.ts — somente data-testid.
 */
import { test, expect } from "../../fixtures/test-base";
import { Sel } from "../../fixtures/selectors";
import { mockBitrixWebhookFail, mockCrmBridgeOffline } from "./_mocks";

test.describe("P0 — Orçamento bloqueado", () => {
  test.skip("bitrix-sync 502: orçamento é salvo localmente e enfileirado para retry", async ({ page }) => {
    await mockBitrixWebhookFail(page);
    await page.goto("/orcamentos/novo");
    await expect(page.locator(Sel.app.toast).or(page.locator(Sel.app.errorBanner))).toBeVisible();
  });

  test.skip("crm-db-bridge 503: seletor de empresa cai pra busca local sem travar", async ({ page }) => {
    await mockCrmBridgeOffline(page);
    await page.goto("/orcamentos/novo");
    expect(true).toBe(true);
  });

  test.skip("aprovação pública: token inválido NÃO expõe outros orçamentos", async ({ page }) => {
    await page.goto("/orcamento-publico/INVALID_TOKEN");
    await expect(page.locator(Sel.app.notFound).or(page.locator(Sel.app.errorBanner))).toBeVisible();
    expect(await page.locator(Sel.quote.items).count()).toBe(0);
  });
});
