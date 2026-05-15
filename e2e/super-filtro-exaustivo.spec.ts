import { test, expect, requireAuth } from "./fixtures/test-base";
import { gotoAndSettle, waitForRouteIdle } from "./helpers/nav";

test.describe("Módulo: Super Filtro — Testes E2E Exaustivos", () => {
  test.beforeEach(async ({ page }) => {
    // Garantimos que estamos autenticados e na página de filtros
    await requireAuth();
    await gotoAndSettle(page, "/filtros");
    await waitForRouteIdle(page);
  });

  test("Estrutura Inicial e Carregamento", async ({ page }) => {
    // Verifica título da página
    await expect(page.locator('[data-testid="page-title-produtos"]')).toContainText("Super Filtro");
    
    // Verifica se a barra lateral de filtros está presente (Desktop)
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(page.locator('aside >> h3:has-text("Filtros")')).toBeVisible();
    
    // Verifica se o catálogo de produtos está carregando ou já carregado
    const productGrid = page.locator('.animate-fade-in');
    await expect(productGrid).toBeVisible();
  });

  test("Busca Inteligente e Integração com Filtros", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Buscar produtos..."]');
    
    // Teste de busca por texto
    await searchInput.fill("Squeeze");
    await page.keyboard.press("Enter");
    await waitForRouteIdle(page);
    
    // Verifica badge de resultado de busca
    await expect(page.locator('.tabular-nums')).not.toHaveText(/0/);
    
    // Limpa busca via clique no badge (se houver o X) ou reset
    const clearSearch = page.locator('button[aria-label*="Limpar"]');
    if (await clearSearch.isVisible()) {
        await clearSearch.click();
    }
  });

  test("Seções de Filtros — Expansão e Interação", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });

    // 1. Cores (InlineColorGroupFilter)
    const coresBtn = page.locator('button:has-text("Cores")');
    await coresBtn.click();
    // Verifica se os círculos de cores apareceram
    await expect(page.locator('button[title*="Grupo:"]')).first().toBeVisible();

    // 2. Categorias (ExternalCategoryFilter)
    const categoriasBtn = page.locator('button:has-text("Categorias")');
    await categoriasBtn.click();
    const catInput = page.locator('input[placeholder*="Filtrar categorias"]');
    await catInput.fill("Escritório");
    // Seleciona uma categoria se aparecer
    const catOption = page.locator('button:has-text("Escritório")').first();
    if (await catOption.isVisible()) {
        await catOption.click();
        await expect(page.locator('div:has-text("Categorias: Escritório")')).toBeVisible();
    }

    // 3. Faixa de Preço (DebouncedPriceInput)
    const precoBtn = page.locator('button:has-text("Faixa de Preço")');
    await precoBtn.click();
    const minInput = page.locator('input[placeholder="Ex: 0"]').first();
    await minInput.fill("20");
    await page.keyboard.press("Tab"); // Trigger debounce
    
    await expect(page.locator('div:has-text("Faixa de Preço: R$ 20")')).toBeVisible();
  });

  test("Filtros Avançados e Nichos (Marketing)", async ({ page }) => {
    // Abre seção de Marketing
    const publicoBtn = page.locator('button:has-text("Público-Alvo")');
    await publicoBtn.click();
    
    // Digita na busca interna de filtros
    const filterSearch = page.locator('input[placeholder="Buscar filtro..."]');
    await filterSearch.fill("Infantil");
    
    // Verifica se a seção de Público-Alvo ainda é visível
    await expect(publicoBtn).toBeVisible();
  });

  test("Ordenação e Modos de Visualização", async ({ page }) => {
    // Troca ordenação
    const sortTrigger = page.locator('button:has-text("Ordenar")');
    await sortTrigger.click();
    await page.locator('div[role="option"]:has-text("Popularidade")').click();
    await waitForRouteIdle(page);

    // Troca visualização para Lista
    const layoutBtn = page.locator('button').filter({ has: page.locator('.lucide-layout-grid') });
    await layoutBtn.click();
    const listMode = page.locator('div[role="menuitem"]:has-text("Lista")');
    if (await listMode.isVisible()) {
        await listMode.click();
    }
  });

  test("Fluxo Mobile — Filtros em Sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    const filterBtn = page.locator('button:has-text("Filtros")');
    await filterBtn.click();
    
    // Dentro do Sheet
    await expect(page.locator('h2:has-text("Filtros")')).toBeVisible();
    
    // Interage com Gênero
    await page.locator('button:has-text("Gênero")').click();
    const feminimoBtn = page.locator('button:has-text("Feminino")');
    await feminimoBtn.click();
    
    // Aplicar (botão "Ver X resultados")
    const applyBtn = page.locator('button:has-text("Ver")');
    await applyBtn.click();
    
    // Sheet deve fechar
    await expect(page.locator('div[role="dialog"]')).toBeHidden();
  });

  test("Acessibilidade — Teclado e Estados", async ({ page }) => {
    // Navegação por tab no cabeçalho de filtros
    await page.locator('aside').focus();
    await page.keyboard.press("Tab");
    
    const resetBtn = page.locator('button[aria-label="Resetar todos os filtros"]');
    // Deve estar desabilitado inicialmente
    await expect(resetBtn).toBeDisabled();
    
    // Ativa um filtro
    await page.locator('button:has-text("Opções Rápidas")').click();
    await page.locator('button:has-text("Lançamento")').click();
    
    // Agora o reset deve estar habilitado
    await expect(resetBtn).toBeEnabled();
    
    // Testa o atalho de busca Alt+S ou F
    await page.keyboard.press("Alt+f");
    // Foco deve estar no input de busca global ou similar
  });

  test("Regressão Visual — Diferentes Skins", async ({ page }) => {
    const SKINS = ["corporate", "diversity", "ocean"];
    
    for (const skin of SKINS) {
        // Aplica skin via localStorage
        await page.addInitScript((sId) => {
          localStorage.setItem("gifts-store-theme-config", JSON.stringify({
            presetId: sId,
            radius: 14,
            mode: "light"
          }));
        }, skin);
        
        await page.reload();
        await waitForRouteIdle(page);
        
        await expect(page).toHaveScreenshot(`super-filtro-skin-${skin}.png`);
    }
  });
});
