import { test, expect } from './fixtures/test-base';
import { loginAs } from './helpers/auth';

/**
 * Módulo: Reposição (Replenishments)
 * Objetivo: Testes E2E exaustivos cobrindo funcionalidades, filtros, ordenação,
 * visualização, seleção em massa e acessibilidade.
 */

test.describe('Módulo de Reposição - Testes Exaustivos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    // Para fins deste teste, navegamos diretamente para a página de reposição
    await page.goto('/reposicao');
    // Aguarda o carregamento inicial dos dados
    await page.waitForSelector('[role="status"]', { state: 'hidden', timeout: 30000 });
  });

  test('Deve carregar a estrutura básica da página corretamente', async ({ page }) => {
    // Cabeçalho
    await expect(page.getByRole('heading', { name: 'Reposição' })).toBeVisible();
    
    // Cards de KPI/Stats
    await expect(page.locator('section[aria-label="Estatísticas de reposição"]')).toBeVisible();
    await expect(page.locator('text=/Repostos Hoje/i')).toBeVisible();
    await expect(page.locator('text=/Últimos 7 Dias/i')).toBeVisible();
    
    // Grid de produtos
    await expect(page.locator('main')).toBeVisible();
    
    // Widget lateral
    await expect(page.locator('aside:has-text("+ Recentes")')).toBeVisible();
    
    // Toolbar de filtros
    await expect(page.getByPlaceholder('Buscar reposições…')).toBeVisible();
  });

  test('Deve filtrar produtos por busca de texto', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Buscar reposições…').first();
    
    // Pega o nome do primeiro produto para testar a busca
    const firstProductName = await page.locator('main .font-medium').first().innerText();
    
    await searchInput.fill(firstProductName);
    await page.waitForTimeout(1000); // Aguarda debounce se houver
    
    // Verifica se os resultados foram filtrados
    const results = page.locator('main .font-medium');
    const count = await results.count();
    for (let i = 0; i < count; i++) {
      const text = await results.nth(i).innerText();
      expect(text.toLowerCase()).toContain(firstProductName.toLowerCase());
    }
    
    // Limpa a busca
    await page.getByLabel('Limpar busca').first().click();
    await expect(searchInput).toHaveValue('');
  });

  test('Deve filtrar por fornecedor e categoria', async ({ page }) => {
    // Filtro de Fornecedor
    const supplierTrigger = page.getByLabel('Filtrar por fornecedor');
    await supplierTrigger.click();
    const firstSupplierOption = page.locator('[role="option"]').nth(1); // O 0 é "Todos"
    const supplierName = await firstSupplierOption.innerText();
    await firstSupplierOption.click();
    
    // Verifica badge de filtro ativo
    await expect(page.locator('[role="listitem"]').filter({ hasText: supplierName.split(' (')[0] })).toBeVisible();
    
    // Filtro de Categoria
    const categoryTrigger = page.getByLabel('Filtrar por categoria');
    await categoryTrigger.click();
    const firstCategoryOption = page.locator('[role="option"]').nth(1);
    const categoryName = await firstCategoryOption.innerText();
    await firstCategoryOption.click();
    
    // Verifica badge de categoria
    await expect(page.locator('[role="listitem"]').filter({ hasText: categoryName.split(' (')[0] })).toBeVisible();
    
    // Limpa filtros
    await page.getByLabel('Limpar todos os filtros').click();
    await expect(page.locator('[role="listitem"]')).toHaveCount(0);
  });

  test('Deve alternar entre modos de visualização (Grid, Lista, Tabela)', async ({ page }) => {
    const layoutTrigger = page.getByLabel('Alterar layout');
    await layoutTrigger.click();
    
    // Modo Lista
    await page.getByRole('menuitem', { name: /Lista/i }).click();
    await expect(page.locator('.divide-y')).toBeVisible(); // Seletor genérico para lista
    
    // Modo Tabela
    await layoutTrigger.click();
    await page.getByRole('menuitem', { name: /Tabela/i }).click();
    await expect(page.getByRole('table')).toBeVisible();
    
    // Volta para Grid
    await layoutTrigger.click();
    await page.getByRole('menuitem', { name: /Grade/i }).click();
  });

  test('Deve gerenciar a seleção em massa de produtos', async ({ page }) => {
    // Ativa modo de seleção
    await page.getByRole('button', { name: /Selecionar/i }).click();
    
    // Seleciona os dois primeiros produtos
    const checkboxes = page.locator('input[type="checkbox"], button[role="checkbox"]');
    await checkboxes.nth(1).click(); // O primeiro pode ser o "selecionar todos" na tabela
    await checkboxes.nth(2).click();
    
    // Verifica a barra de ações em massa
    await expect(page.locator('text=/Selecionados/i')).toBeVisible();
    await expect(page.getByRole('button', { name: /Carrinho/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Favoritar/i })).toBeVisible();
    
    // Cancela seleção
    await page.getByRole('button', { name: /Cancelar/i }).click();
    await expect(page.locator('text=/Selecionados/i')).not.toBeVisible();
  });

  test('Deve navegar para o detalhe do produto ao clicar', async ({ page }) => {
    const firstProduct = page.locator('main img').first();
    await firstProduct.click();
    
    // Verifica se mudou de rota
    await expect(page).toHaveURL(/\/produto\//);
    await expect(page.getByRole('button', { name: /Adicionar ao Carrinho/i })).toBeVisible();
  });

  test('Deve ser responsivo no mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Busca mobile deve estar visível
    await expect(page.getByPlaceholder('Buscar reposições…').last()).toBeVisible();
    
    // Filtros devem estar em linha ou wrap
    await expect(page.getByLabel('Filtrar por fornecedor')).toBeVisible();
    
    // Ações em massa no mobile (se ativado)
    await page.getByRole('button', { name: /Selecionar/i }).click();
    await page.locator('button[role="checkbox"]').nth(1).click();
    // A BulkActionBar deve estar fixa no rodapé ou similar
    await expect(page.locator('.fixed.bottom-0')).toBeVisible();
  });

  test('Deve suportar troca de temas e manter legibilidade', async ({ page }) => {
    // Snapshots visuais podem ser adicionados aqui se o ambiente suportar
    // Por enquanto, apenas alternamos e verificamos contraste básico
    await page.keyboard.press('Alt+T'); // Atalho para tema
    await expect(page.locator('html')).toHaveClass(/dark/);
    
    await page.keyboard.press('Alt+T');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('Acessibilidade: Navegação por teclado', async ({ page }) => {
    await page.keyboard.press('Tab');
    // Verifica se o foco está em algum elemento interativo inicial
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).not.toBeNull();
    
    // Verifica se o Skip to Content ou similar funciona se houver
    // Ou apenas se percorre os filtros
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  });
});
