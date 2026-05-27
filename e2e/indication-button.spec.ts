import { test, expect } from '@playwright/test';

test.describe('Botão de Indicação no Detalhe do Produto', () => {
  const PRODUCT_WITH_TAGS_ID = '92411869-ad2b-4115-b12f-9bf6a8aebeb6';
  const PRODUCT_WITHOUT_TAGS_ID = 'bea8bd6e-14f4-4482-921d-ecc179391166';

  test('deve estar desabilitado e mostrar tooltip quando não houver tags', async ({ page }) => {
    // Navega para um produto sem tags
    await page.goto(`/produto/${PRODUCT_WITHOUT_TAGS_ID}`);
    
    // Localiza o botão de Indicação
    const indicationBtn = page.getByRole('button', { name: 'Indicação' });
    
    // Verifica se está desabilitado
    await expect(indicationBtn).toBeDisabled();
    
    // Verifica o título (tooltip nativo)
    const title = await indicationBtn.getAttribute('title');
    expect(title).toBe('Sem dados de indicação para este produto');
  });

  test('deve estar habilitado e abrir modal com agrupamento de tags quando houver dados', async ({ page }) => {
    // Navega para um produto com tags (usando o ID mockado no productService)
    await page.goto(`/produto/${PRODUCT_WITH_TAGS_ID}`);
    
    // Localiza o botão de Indicação
    const indicationBtn = page.getByRole('button', { name: 'Indicação' });
    
    // Verifica se está habilitado
    await expect(indicationBtn).toBeEnabled();
    
    // Clica no botão
    await indicationBtn.click();
    
    // Verifica se o modal abriu
    const modalTitle = page.getByText('Indicado para', { exact: true });
    await expect(modalTitle).toBeVisible();
    
    // Verifica o agrupamento (Público-Alvo, Datas Comemorativas, Endomarketing)
    await expect(page.getByText('PÚBLICO-ALVO')).toBeVisible();
    await expect(page.getByText('DATAS COMEMORATIVAS')).toBeVisible();
    await expect(page.getByText('ENDOMARKETING')).toBeVisible();
    
    // Verifica alguns itens específicos
    await expect(page.getByText('Executivos')).toBeVisible();
    await expect(page.getByText('Natal')).toBeVisible();
    await expect(page.getByText('Premiação')).toBeVisible();
  });
});
