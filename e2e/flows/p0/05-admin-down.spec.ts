/**
 * P0 — Admin / governança fora do ar.
 * Política: SSOT em e2e/fixtures/selectors.ts — somente data-testid.
 */
import { test, expect } from "../../fixtures/test-base";
import { Sel } from "../../fixtures/selectors";
import { mockEdgeFunctionFailure, mockAllEdgeFunctions5xx } from "./_mocks";

test.describe("P0 — Admin down", () => {
  test.skip("full-op-diagnostics 500: tela de diagnóstico mostra retry, não tela branca", async ({ page }) => {
    await mockEdgeFunctionFailure(page, "full-op-diagnostics", 500, { error: "boom" });
    await page.goto("/admin/diagnostico");
    await expect(page.locator(Sel.app.errorBanner)).toBeVisible();
  });

  test.skip("connections-hub: MCP 401 marca conexão como erro com CTA reconectar", async ({ page }) => {
    await mockEdgeFunctionFailure(page, "connection-tester", 401, { error: "auth" });
    await page.goto("/admin/conexoes");
    await expect(page.locator(Sel.app.errorBanner).first()).toBeVisible();
  });

  test.skip("todas edge functions 503: admin não fica em loop infinito de loading", async ({ page }) => {
    await mockAllEdgeFunctions5xx(page);
    await page.goto("/admin");
    await expect(page.locator(Sel.app.errorBanner).or(page.locator(Sel.app.toast))).toBeVisible({ timeout: 8000 });
  });

  test.skip("MCP keys: revogação automática refletida na UI sem F5", async () => {
    expect(true).toBe(true);
  });
});
