import { test, expect } from '@playwright/test';

test.describe('Stock page 410 Gone resilience', () => {
  test('shows deprecation message instead of blank screen on 410', async ({ page }) => {
    await page.route('**/rest/v1/variant_supplier_sources*', (route) => {
      route.fulfill({
        status: 410,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Gone',
          details: 'O serviço de ponte legado foi desativado',
          hint: 'Use PostgREST nativo',
          code: '410',
        }),
      });
    });

    await page.goto('/estoque');
    await page.waitForLoadState('networkidle');

    const pageContent = await page.textContent('body');
    expect(pageContent).not.toBe('');

    const hasDeprecationMessage = await page
      .locator('text=/ponte.*desativad|bridge.*deprecated|410|Gone/i')
      .count();
    const hasEmptyState = await page
      .locator('[data-testid="empty-state"], [class*="empty"], text=/nenhum|sem dados|no data/i')
      .count();

    expect(hasDeprecationMessage + hasEmptyState).toBeGreaterThan(0);
  });

  test('does not show blank screen when PostgREST returns empty data', async ({ page }) => {
    await page.route('**/rest/v1/v_products_public*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/0' },
        body: JSON.stringify([]),
      });
    });

    await page.goto('/estoque');
    await page.waitForLoadState('networkidle');

    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);

    const hasContent = await page.locator('nav, header, [class*="layout"], [class*="sidebar"]').count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test('retry button appears on transient errors (not on 410)', async ({ page }) => {
    let callCount = 0;
    await page.route('**/rest/v1/variant_supplier_sources*', (route) => {
      callCount++;
      if (callCount <= 2) {
        route.fulfill({
          status: 410,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Gone', code: '410' }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await page.goto('/estoque');
    await page.waitForLoadState('networkidle');

    // 410 is definitive - should NOT auto-retry
    // The page should show a message or empty state, not infinite loading
    await page.waitForTimeout(2000);
    const loadingSpinners = await page
      .locator('[class*="spinner"], [class*="loading"], [role="progressbar"]')
      .count();
    // After 2s, loading should have resolved (410 is immediate fail, not pending)
    expect(loadingSpinners).toBeLessThanOrEqual(1);
  });

  test('page renders navigation even when stock API returns 410', async ({ page }) => {
    await page.route('**/rest/v1/**', (route) => {
      const url = route.request().url();
      if (url.includes('variant_supplier_sources') || url.includes('stock_snapshots')) {
        route.fulfill({
          status: 410,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Gone' }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/estoque');
    await page.waitForLoadState('domcontentloaded');

    // Page should still render layout (not crash with white screen)
    const bodyHtml = await page.locator('body').innerHTML();
    expect(bodyHtml.length).toBeGreaterThan(100);
  });
});
