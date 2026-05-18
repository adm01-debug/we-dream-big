import { test, expect } from '@playwright/test';

test.describe('Quote Builder Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login and go to quote builder
    await page.goto('/orcamentos/novo');
  });

  test('should not advance to conditions without client', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: 'Próximo' });
    await nextButton.click();
    
    // Should show error toast (we can't easily check toast text but we can check we stay on step 1)
    const stepper = page.getByTestId('quote-wizard');
    await expect(stepper.getByText('Cliente')).toHaveClass(/text-primary/);
  });

  test('should go back and forth between steps', async ({ page }) => {
    // 1. Select Client
    await page.getByTestId('company-select-trigger').click();
    await page.getByRole('option').first().click();
    
    // 2. Click Next
    await page.getByRole('button', { name: 'Próximo' }).click();
    
    // 3. Verify on step 2 (Conditions)
    const stepper = page.getByTestId('quote-wizard');
    await expect(stepper.getByText('Condições')).toHaveClass(/text-primary/);
    
    // 4. Click Back
    await page.getByRole('button', { name: 'Voltar' }).click();
    
    // 5. Verify back on step 1
    await expect(stepper.getByText('Cliente')).toHaveClass(/text-primary/);
  });
});
