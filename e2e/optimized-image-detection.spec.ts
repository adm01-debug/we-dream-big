import { test, expect } from '@playwright/test';

/**
 * E2E tests for OptimizedImage detection logic and placeholder generation.
 * Specifically validates Cloudflare imagedelivery.net handling.
 */
test.describe('OptimizedImage Detection & Placeholders', () => {
  const DEMO_URL = '/tools/OptimizedImageDemo';

  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
    await expect(page.getByText('OptimizedImage Demo')).toBeVisible();
  });

  test('should detect Cloudflare images and generate /thumbnail placeholder', async ({ page }) => {
    // Find the Cloudflare Demo card
    const cfCard = page.locator('div:has-text("Cloudflare Images Detection")').locator('..').first();
    const container = cfCard.locator('div.relative.overflow-hidden').first();
    
    // Check if the detection rule attribute is present and correct
    await expect(container).toHaveAttribute('data-detection-rule', 'cloudflare');
    
    // Check if the placeholder image exists and has the /thumbnail variant
    const placeholderImg = container.locator('img[aria-hidden="true"]');
    await expect(placeholderImg).toBeVisible();
    
    const src = await placeholderImg.getAttribute('src');
    expect(src).toContain('/thumbnail');
    expect(src).not.toContain('/public');
  });

  test('should emit console.info only for debug mode or CF detection', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'info' && msg.text().includes('[OptimizedImage]')) {
        logs.push(msg.text());
      }
    });

    // Reload the page to capture initial logs
    await page.reload();
    await expect(page.getByText('OptimizedImage Demo')).toBeVisible();

    // Verify that we have logs for the Cloudflare demo which has debug={true}
    expect(logs.some(log => log.includes('Cloudflare Image detected'))).toBe(true);
    expect(logs.some(log => log.includes('CF_VARIANT_REPLACEMENT'))).toBe(true);
    
    // Verify specific URL log
    expect(logs.some(log => log.includes('/thumbnail'))).toBe(true);
  });

  test('should handle edge cases for Cloudflare URLs', async ({ page }) => {
    // These are validated in the "Relatório de Validação" table we updated
    const cfQueryRow = page.locator('tr[data-testid="row-cloudflare"]').nth(1); // Second CF row (c/ Query)
    const cfSlashRow = page.locator('tr[data-testid="row-cloudflare"]').nth(2); // Third CF row (c/ Barra)
    
    await expect(cfQueryRow).toBeVisible();
    await expect(cfSlashRow).toBeVisible();
    
    // Verify detection in the hidden OptimizedImage inside the table
    const queryContainer = cfQueryRow.locator('div.relative.overflow-hidden');
    const slashContainer = cfSlashRow.locator('div.relative.overflow-hidden');
    
    await expect(queryContainer).toHaveAttribute('data-detection-rule', 'cloudflare');
    await expect(slashContainer).toHaveAttribute('data-detection-rule', 'cloudflare');
  });

  test('should correctly identify other providers', async ({ page }) => {
    const unsplashRow = page.locator('tr[data-testid="row-unsplash"]');
    const supabaseRow = page.locator('tr[data-testid="row-supabase"]');
    const genericRow = page.locator('tr[data-testid="row-generic"]');
    
    await expect(unsplashRow.locator('div.relative.overflow-hidden')).toHaveAttribute('data-detection-rule', 'unsplash');
    await expect(supabaseRow.locator('div.relative.overflow-hidden')).toHaveAttribute('data-detection-rule', 'supabase');
    await expect(genericRow.locator('div.relative.overflow-hidden')).toHaveAttribute('data-detection-rule', 'generic');
  });
});
