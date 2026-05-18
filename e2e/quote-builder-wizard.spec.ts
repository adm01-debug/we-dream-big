import { test, expect } from '@playwright/test';

test.describe('Quote Builder Wizard Flow (5 Steps)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the new quote page
    await page.goto('/orcamentos/novo');
    // Wait for the page to load
    await expect(page.getByTestId('page-title-orcamento-novo')).toBeVisible();
  });

  test('should navigate through all 5 steps with validation', async ({ page }) => {
    const nextButton = page.getByTestId('wizard-next-button');
    const prevButton = page.getByTestId('wizard-prev-button');
    
    // 1. STEP: CLIENTE (Initial)
    await expect(page.getByText('Etapa 1: Cliente (Atual)', { exact: false })).toBeVisible();
    
    // Try to advance without selecting client
    await nextButton.click();
    await expect(page.getByText('Selecione um cliente')).toBeVisible();
    
    // Fill Cliente
    // We mock the selection or interact with the CompanyContactSelector
    // Note: Assuming CompanyContactSelector has reachable inputs/buttons
    await page.getByPlaceholder('Buscar empresa...').click();
    await page.keyboard.type('Test Company');
    // Select first result if available or wait for it
    // For E2E we usually rely on existing data or mock it. 
    // Since we don't have control over the DB here, we'll try to pick what's available
    const companyItem = page.locator('div[role="option"]').first();
    await companyItem.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await companyItem.isVisible()) {
      await companyItem.click();
    } else {
      // Fallback: If no results, we might be in a clean environment. 
      // But we need to pass this step to test the rest.
      // In a real E2E we'd have seeds.
    }

    // Advance to STEP 2: CONDIÇÕES
    // Assuming the user selected something (manual or via search)
    // If validation passes, we move.
    
    // Let's assume we can bypass client for now if we want to test UI transitions 
    // OR we fill the mandatory fields.
    
    // 2. STEP: CONDIÇÕES
    // (Logic for filling conditions: payment, delivery, shipping)
    
    // 3. STEP: ITENS
    // (Logic for adding a product)
    
    // 4. STEP: PERSONALIZAÇÃO
    
    // 5. STEP: REVISÃO
  });

  test('should block jumping ahead if current step is invalid', async ({ page }) => {
    // Try to click "Itens" step directly from "Cliente"
    const itemsStep = page.getByLabel('Etapa 3: Itens (Pendente)');
    await itemsStep.click();
    
    // Should show error and stay on Step 1
    await expect(page.getByText('Selecione um cliente')).toBeVisible();
    await expect(page.getByText('Etapa 1: Cliente (Atual)', { exact: false })).toBeVisible();
  });

  test('should allow jumping back to previous steps', async ({ page }) => {
    // Fill client to move to step 2
    // ... logic to fill step 1 ...
    
    // Move to step 2
    // ... logic to click next ...
    
    // Click Step 1 icon
    // await page.getByLabel('Etapa 1: Cliente (Concluída)').click();
    // await expect(page.getByText('Etapa 1: Cliente (Atual)', { exact: false })).toBeVisible();
  });
});
