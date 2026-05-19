import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { Sel, TID } from "../fixtures/selectors";

test.describe("E2E: Catálogo e Lógica de Filtragem", () => {
  test.beforeEach(() => requireAuth());

  test("deve renderizar catálogo e carregar produtos sem erros", async ({ page, evidence }) => {
    await gotoAndSettle(page, "/");
    
    // Verifica título da página (vêm do Sel.page.title("produtos"))
    await expect(page.locator(Sel.page.title("produtos"))).toBeVisible({ timeout: 15000 });
    
    // Verifica se cards de produtos aparecem
    await expect(page.locator(Sel.product.card).first()).toBeVisible({ timeout: 15000 });

    // Garante que não houve erro crítico de runtime (ex: hasColorFilters is not defined)
    const fatal = evidence.pageErrors.filter(
      (e) => !/ResizeObserver|loading chunk/i.test(e.message)
    );
    expect(fatal, "O catálogo quebrou no carregamento inicial").toHaveLength(0);
  });

  test("deve aplicar filtros de cor sem quebrar a tela (valida hasColorFilters logic)", async ({ page, evidence }) => {
    await gotoAndSettle(page, "/");
    
    // 1. Abre o painel de filtros (Toolbar)
    // No CatalogToolbar.tsx: aria-label="Abrir filtros do catálogo"
    await page.click('button[aria-label="Abrir filtros do catálogo"]');
    
    // 2. Aguarda carregar o painel (Lazy load)
    // No FilterPanelHeader.tsx (provavelmente) ou seções
    // Vamos procurar por um seletor de cor no painel. 
    // InlineColorGroupFilter renderiza InlineColorSwatch que tem aria-label="Filtrar por cor ..."
    const swatch = page.locator('button[aria-label^="Filtrar por cor"]').first();
    await expect(swatch).toBeVisible({ timeout: 10000 });

    // 3. Clica em um swatch de cor
    await swatch.click();
    
    // 4. Verifica se o badge de filtro ativo apareceu no topo
    // No CatalogActiveFilters.tsx, os badges vêm com classes de cursor-pointer e emojis
    await expect(page.locator('span:has-text("🌈"), span:has-text("🎨"), span:has-text("🖌️")').first()).toBeVisible();

    // 5. Verifica se o grid de produtos ainda é renderizado (pode ser vazio ou com resultados, mas não quebrado)
    // Se a lógica de useCatalogFiltering estivesse quebrada (ReferenceError), evidence teria erros.
    const fatal = evidence.pageErrors.filter(
      (e) => !/ResizeObserver|loading chunk/i.test(e.message)
    );
    expect(fatal, "O filtro de cor quebrou a lógica de filtragem").toHaveLength(0);
  });

  test("deve navegar pelas principais páginas pós-login sem erros internos", async ({ page, evidence }) => {
    const mainRoutes = ["/", "/favoritos", "/comparar", "/orcamentos", "/carrinhos", "/simulador", "/novidades", "/estoque"];
    
    for (const route of mainRoutes) {
      await test.step(`Navegando para ${route}`, async () => {
        await gotoAndSettle(page, route);
        
        // Verifica se a URL mudou
        if (route === "/") {
          expect(page.url()).toMatch(/\/$/);
        } else {
          expect(page.url()).toContain(route);
        }

        // Verifica se não há erros de console fatais
        const fatal = evidence.pageErrors.filter(
          (e) => !/ResizeObserver|loading chunk/i.test(e.message)
        );
        expect(fatal, `A rota ${route} apresentou erro fatal`).toHaveLength(0);
      });
    }
  });

  test("deve permitir busca por SKU e filtrar corretamente", async ({ page, evidence }) => {
    await gotoAndSettle(page, "/");
    
    // Pega o SKU do primeiro produto carregado
    const firstSkuElement = page.locator('.font-mono.truncate').first();
    await expect(firstSkuElement).toBeVisible();
    const sku = (await firstSkuElement.textContent())?.trim();
    
    if (!sku) {
        console.warn("Nenhum SKU encontrado para testar busca");
        return;
    }

    // Realiza a busca no SmartSearchInput
    await page.fill(Sel.catalog.searchInput, sku);
    await page.press(Sel.catalog.searchInput, 'Enter');

    // Aguarda atualização
    await page.waitForTimeout(1000);

    // Verifica se pelo menos um produto aparece (o próprio)
    await expect(page.locator(Sel.product.card)).toBeVisible();
    
    const fatal = evidence.pageErrors.filter(
      (e) => !/ResizeObserver|loading chunk/i.test(e.message)
    );
    expect(fatal, "A busca quebrou a renderização").toHaveLength(0);
  });
});
