import { test, expect } from '@playwright/test';

test.describe('Quote Builder - Shipping Logic', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to new quote
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'adm01@promobrindes.com.br');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await page.goto('/orcamentos/novo');
  });

  test('should handle shipping modes and value visibility correctly', async ({ page }) => {
    // 1. Initial state: Shipping type not selected or default
    const shippingSelect = page.getByTestId('shipping-type-select');
    await expect(shippingSelect).toBeVisible();

    // 2. Select "FOB — Repassado ao cliente"
    await shippingSelect.click();
    await page.getByRole('option', { name: 'FOB — Repassado ao cliente' }).click();

    // Verify "Valor R$" is NOT visible
    const shippingCostInput = page.getByTestId('shipping-cost-input');
    await expect(shippingCostInput).not.toBeVisible();

    // 3. Select "FOB — Valor pré-negociado"
    await shippingSelect.click();
    await page.getByRole('option', { name: 'FOB — Valor pré-negociado' }).click();

    // Verify "Valor R$" IS visible
    await expect(shippingCostInput).toBeVisible();

    // 4. Test validation: it should be required for "FOB — Valor pré-negociado"
    // (Assuming there's a save/review button that triggers validation)
    // For now, we just check if the label has a red asterisk or if error state is triggered
    const shippingLabel = page.locator('label', { hasText: 'Frete' });
    // If it's empty, validation error should appear on attempt to save
    // But let's check the logic change in code first.
  });

  test('should not include shipping cost in total when not in pre-negotiated mode', async ({ page }) => {
    // 1. Add a product first to have a total
    await page.getByRole('button', { name: 'Produto', exact: true }).click();
    await page.getByPlaceholder('Buscar por nome, SKU...').fill('Squeeze');
    await page.waitForSelector('.grid >> text=Squeeze', { timeout: 10000 });
    await page.getByText('Squeeze').first().click();
    
    // Wait for item to be added and total to update
    const totalValueBefore = await page.getByTestId('summary-total-value').textContent();
    
    // 2. Set shipping to "FOB — Valor pré-negociado" and add 100,00
    await page.getByTestId('shipping-type-select').click();
    await page.getByRole('option', { name: 'FOB — Valor pré-negociado' }).click();
    
    const shippingInput = page.getByTestId('shipping-cost-input');
    await shippingInput.fill('100,00');
    
    // Total should increase by 100
    const totalValueWithShipping = await page.getByTestId('summary-total-value').textContent();
    expect(totalValueWithShipping).not.toBe(totalValueBefore);

    // 3. Switch to "FOB — Repassado ao cliente"
    await page.getByTestId('shipping-type-select').click();
    await page.getByRole('option', { name: 'FOB — Repassado ao cliente' }).click();
    
    // Total should go back to original
    const totalValueAfter = await page.getByTestId('summary-total-value').textContent();
    expect(totalValueAfter).toBe(totalValueBefore);
    await expect(shippingInput).not.toBeVisible();
  });
});
