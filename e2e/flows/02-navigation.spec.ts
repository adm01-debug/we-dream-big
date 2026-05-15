/**
 * Fluxo: Navegação — sidebar, deep-links, 404, voltar.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { Sel } from "../fixtures/selectors";

const ROUTES = [
  "/",
  "/dashboard",
  "/produtos",
  "/orcamentos",
  "/pedidos",
  "/colecoes",
  "/favoritos",
  "/carrinhos",
  "/simulador",
  "/novidades",
];

test.describe("Fluxo: Navegação", () => {
  test.beforeEach(() => requireAuth());

  for (const route of ROUTES) {
    test(`carrega deep-link ${route} sem erro`, async ({ page, evidence }) => {
      await gotoAndSettle(page, route);
      // Não deve ter redirecionado para login
      await expect(page).not.toHaveURL(/\/login/);
      // Não deve haver page errors críticos
      const fatal = evidence.pageErrors.filter(
        (e) => !/ResizeObserver|loading chunk/i.test(e.message),
      );
      expect(fatal, `Page errors em ${route}`).toHaveLength(0);
    });
  }

  test("rota inexistente exibe 404", async ({ page }) => {
    await page.goto("/rota-que-nao-existe-xyz");
    await expect(page.locator(Sel.app.notFound).first()).toBeVisible({
      timeout: 8000,
    });
  });

  test("voltar do navegador retorna à rota anterior", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    await gotoAndSettle(page, "/favoritos");
    await page.goBack();
    await expect(page).toHaveURL(/\/produtos/);
  });
});
