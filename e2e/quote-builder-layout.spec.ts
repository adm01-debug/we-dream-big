import { test, expect } from './fixtures/test-base';
import { loginAs } from './helpers/auth';

test.describe('QuoteBuilderPage - Layout Regression E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/quotes/new');
    // Wait for the main container
    await page.waitForSelector('.lg\\:grid-cols-12', { timeout: 15000 });
  });

  test('should verify 3-column sibling structure on desktop', async ({ page }) => {
    // Force desktop size
    await page.setViewportSize({ width: 1280, height: 800 });
    
    const grid = page.locator('.lg\\:grid-cols-12').first();
    await expect(grid).toBeVisible();

    // The grid should have 3 direct children representing the 3 columns
    const columns = grid.locator('> div, > [class*="QuoteBuilderSummaryColumn"]');
    await expect(columns).toHaveCount(3);

    // Verify column spans for lg
    const col1 = columns.nth(0);
    const col2 = columns.nth(1);
    const col3 = columns.nth(2);

    await expect(col1).toHaveClass(/lg:col-span-3/);
    await expect(col2).toHaveClass(/lg:col-span-5/);
    await expect(col3).toHaveClass(/lg:col-span-4/);

    // Verify they are visual siblings (all visible at the same time and not nested)
    const col1Box = await col1.boundingBox();
    const col2Box = await col2.boundingBox();
    const col3Box = await col3.boundingBox();

    expect(col1Box && col2Box && col3Box).toBeTruthy();
    
    // Check they are side by side (y coordinates should be similar, x should be increasing)
    // We allow some slack for sticky behavior if they aren't perfectly aligned at top=0
    expect(Math.abs(col1Box!.y - col2Box!.y)).toBeLessThan(100);
    expect(col2Box!.x).toBeGreaterThan(col1Box!.x);
    expect(col3Box!.x).toBeGreaterThan(col2Box!.x);
  });

  test('should verify responsive visual regression across viewports', async ({ page }) => {
    const viewports = [
      { name: 'mobile', width: 375, height: 812 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 }
    ];

    const mainContent = page.locator('.lg\\:grid-cols-12').first();

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(500); // Wait for layout stability
      
      // Focus on the "Condições" section which was breaking
      const condicoesSection = page.locator('div:has(h3:has-text("Condições"))').first();
      await expect(condicoesSection).toBeVisible();
      
      // Capture the full grid layout for visual regression
      await expect(mainContent).toHaveScreenshot(`quote-builder-grid-${vp.name}.png`, {
        mask: [page.locator('[data-testid="company-contact-selector"]')] // Mask dynamic content
      });
    }
  });

  test('should verify no nested columns (regression check)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Select Column 1
    const col1 = page.locator('.lg\\:col-span-3').first();
    
    // Check if Column 2 or 3 are mistakenly nested inside Column 1
    const nestedCol2 = col1.locator('.lg\\:col-span-5');
    const nestedCol3 = col1.locator('.lg\\:col-span-4');
    
    await expect(nestedCol2).toHaveCount(0);
    await expect(nestedCol3).toHaveCount(0);
  });
});
