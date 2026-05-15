/**
 * Fluxo: Orçamentos — listar, abrir criação, validar form.
 * NÃO submete (evita poluir BD); valida apenas a navegação e UI.
 * Seletores: Sel.page / Sel.quote (SSOT).
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { Sel } from "../fixtures/selectors";

test.describe("Fluxo: Orçamentos", () => {
  test.beforeEach(() => requireAuth());

  test("lista orçamentos carrega", async ({ page }) => {
    await gotoAndSettle(page, "/orcamentos");
    await expect(page).toHaveURL(/orcamentos/);
    await expect(page.locator(Sel.page.title("orcamentos")).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("acessa kanban", async ({ page }) => {
    await gotoAndSettle(page, "/orcamentos/kanban");
    await expect(page).toHaveURL(/kanban/);
  });

  test("acessa dashboard de orçamentos", async ({ page }) => {
    await gotoAndSettle(page, "/orcamentos/dashboard");
    await expect(page).toHaveURL(/dashboard/);
  });

  test("abre criador de orçamento", async ({ page }) => {
    await gotoAndSettle(page, "/orcamentos/novo");
    await expect(page).toHaveURL(/orcamentos\/novo/);
    await expect(page.locator(Sel.quote.wizard).first()).toBeVisible({ timeout: 10_000 });
  });
});
