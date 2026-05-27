import { test, expect } from './fixtures/test-base';

test.describe('Validação de Botões de Ação - Gap e Tracking', () => {
  test('Botões devem ter o tracking e gap corretos', async ({ page }) => {
    // Navegar para a rota de debug criada para validação
    await page.goto('/debug-buttons');
    
    const carrinhoBtn = page.getByRole('button', { name: /carrinho/i }).first();
    const orcamentoBtn = page.getByRole('button', { name: /orçamento/i }).first();

    // Validar classes fundamentais
    await expect(carrinhoBtn).toHaveClass(/font-action-button/);
    await expect(orcamentoBtn).toHaveClass(/font-action-button/);
    await expect(carrinhoBtn).toHaveClass(/gap-1.5/);
    await expect(orcamentoBtn).toHaveClass(/gap-1.5/);

    // Validar estilos computados (garantir que !important funcionou)
    const tracking = await carrinhoBtn.evaluate((el) => window.getComputedStyle(el).letterSpacing);
    const gap = await carrinhoBtn.evaluate((el) => window.getComputedStyle(el).gap);
    
    // 0.15em com font-size 14px (0.875rem) ~= 2.1px
    // Dependendo do browser/zoom pode variar, mas deve ser positivo e significativo
    expect(parseFloat(tracking)).toBeGreaterThan(1.5);
    expect(gap).toBe('6px'); // 1.5 * 4px = 6px
    
    // Snapshot Visual
    await expect(carrinhoBtn).toHaveScreenshot('action-button-carrinho.png');
    await expect(orcamentoBtn).toHaveScreenshot('action-button-orcamento.png');
  });

  test('Consistência em Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/debug-buttons');
    
    const containerMobile = page.locator('h2:has-text("Versão Mobile") + div');
    await expect(containerMobile).toBeVisible();
    
    // Snapshot do container mobile para validar layout lado a lado
    await expect(containerMobile).toHaveScreenshot('action-buttons-mobile-layout.png');
    
    const carrinhoBtn = containerMobile.getByRole('button', { name: /carrinho/i });
    const tracking = await carrinhoBtn.evaluate((el) => window.getComputedStyle(el).letterSpacing);
    
    // Deve manter o tracking alto no mobile conforme pedido (estilo consistente)
    expect(parseFloat(tracking)).toBeGreaterThan(1.5);
  });
});
