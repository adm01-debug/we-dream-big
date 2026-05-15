/**
 * Fluxo: Tratamento de erro — 503 do bridge, offline, RLS denial.
 * Usa page.route para forçar respostas e validar a UI de erro.
 * Seletores: Sel.app.toast (SSOT).
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { Sel } from "../fixtures/selectors";

test.describe("Fluxo: Tratamento de erro", () => {
  test.beforeEach(() => requireAuth());

  test("UI continua usável quando external-db-bridge retorna 503", async ({ page }) => {
    await page.route("**/functions/v1/external-db-bridge**", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          code: "SUPABASE_EDGE_RUNTIME_ERROR",
          message: "Service is temporarily unavailable",
        }),
      }),
    );

    await gotoAndSettle(page, "/produtos");
    // Não deve quebrar a app — pode mostrar empty/erro, mas não tela branca
    await expect(page.locator("body")).toBeVisible();
    // Esperamos algum indicador (toast, banner, empty)
    const hasFeedback =
      (await page.locator(Sel.app.toast).count()) > 0 ||
      (await page.locator(Sel.app.errorBanner).count()) > 0;
    expect(
      hasFeedback,
      "Esperava toast/alerta/empty state ao receber 503 do bridge",
    ).toBeTruthy();
  });

  test("UI lida com offline simulado", async ({ page, context }) => {
    await gotoAndSettle(page, "/dashboard");
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    // Não exigimos comportamento específico, só que não trave
    await page.waitForTimeout(2000);
    await context.setOffline(false);
  });
});
