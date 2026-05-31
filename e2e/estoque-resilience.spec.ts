
import { test, expect } from './fixtures/test-base';
import { loginAs } from './helpers/auth';

/**
 * Módulo: Estoque
 * Objetivo: Validar que a busca de estoque funciona via PostgREST mesmo com a Edge Function em 410.
 */

test.describe('Estoque - Resiliência PostgREST (Caminho B)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('Deve carregar a página de estoque via PostgREST mesmo se a Edge Function retornar 410', async ({ page }) => {
    // 1. Interceptar a chamada à Edge Function e retornar 410
    await page.route('**/functions/v1/external-db-bridge', async (route) => {
      console.log('Intercepted bridge call, returning 410');
      await route.fulfill({
        status: 410,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: "Gone", 
          switch: "edge_external_db_bridge", 
          message: "Esta função foi descontinuada." 
        })
      });
    });

    // 2. Navegar para a página de estoque
    await page.goto('/estoque');

    // 3. Aguardar o carregamento (não deve haver blank screen)
    await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 30000 });

    // 4. Validar que a estrutura básica carregou (Visão Geral)
    await expect(page.getByRole('heading', { name: 'Visão Geral' })).toBeVisible();
    
    // 5. Validar que a tabela de estoque está visível (indicando que o fetch do PostgREST funcionou)
    const stockTable = page.locator('table');
    await expect(stockTable).toBeVisible();
    
    // Como criamos dados na migração, deve haver pelo menos um produto se o banco estiver populado.
    // Em ambientes de teste limpos, pode estar vazio, mas a UI não deve quebrar.
    const emptyMessage = page.locator('text=/Nenhum produto encontrado/i');
    const tableRows = page.locator('table tbody tr');
    
    const isVisible = await emptyMessage.isVisible() || await tableRows.first().isVisible();
    expect(isVisible).toBe(true);
  });
});
