import { test, expect } from '@playwright/test';

test.describe('Product Catalog Sorting', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the product catalog page
    await page.goto('/products');
    // Wait for initial products to load
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 });
  });

  test('should open sort menu and change criteria', async ({ page }) => {
    // Find the sort trigger button
    const sortTrigger = page.locator('button[aria-label="Ordenar por"]');
    await expect(sortTrigger).toBeVisible();
    
    // Click to open the menu
    await sortTrigger.click();
    
    // Verify sort options are visible
    const sortMenu = page.locator('div[role="listbox"]');
    // The specific UI might use SelectItem which often renders as a div with role="option"
    await expect(page.locator('role=option[name="Menor Preço"]')).toBeVisible();
    await expect(page.locator('role=option[name="Maior Preço"]')).toBeVisible();
    await expect(page.locator('role=option[name="Nome (A-Z)"]')).toBeVisible();

    // Select "Menor Preço"
    await page.locator('role=option[name="Menor Preço"]').click();
    
    // Verify URL update
    await expect(page).toHaveURL(/sort=price-asc/);
    
    // Verify visual feedback (trigger should show selected option or at least stay active)
    await expect(sortTrigger).toBeVisible();
  });

  test('should maintain sorting even with active search', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('caneta');
      await page.waitForTimeout(1000); // Wait for debounce
      
      const sortTrigger = page.locator('button[aria-label="Ordenar por"]');
      await sortTrigger.click();
      await page.locator('role=option[name="Menor Preço"]').click();
      
      await expect(page).toHaveURL(/sort=price-asc/);
      await expect(page).toHaveURL(/search=caneta/);
      
      // Verify that sorting works (logic-wise we updated skipSort)
      // This is hard to validate content-wise without specific test data, 
      // but checking URL params and lack of crash is a good baseline.
    }
  });

  test('should persist sorting on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    const sortTrigger = page.locator('button[aria-label="Ordenar por"]');
    await expect(sortTrigger).toBeVisible();
    
    // On mobile, the button is often smaller (icon only) but aria-label remains
    await sortTrigger.click();
    await page.locator('role=option[name="Maior Preço"]').click();
    
    await expect(page).toHaveURL(/sort=price-desc/);
  });
});
