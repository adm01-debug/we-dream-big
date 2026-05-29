import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { gotoAndSettle, expectOnRoute } from './helpers/nav';

test.describe('Teletransporte Comprehensive Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Auth is handled by storageState in chromium-authed project,
    // but we use loginAs(page) as a fallback/safety measure.
    await loginAs(page);
  });

  const mainRoutes = [
    { path: '/produtos', label: 'Produtos' },
    { path: '/favoritos', label: 'Favoritos' },
    { path: '/orcamentos', label: 'Orçamentos' },
    { path: '/simulador', label: 'Simulador' },
    { path: '/colecoes', label: 'Coleções' },
    { path: '/novidades', label: 'Novidades' },
  ];

  // Dozens of tests through a matrix of navigations
  for (const start of mainRoutes) {
    for (const end of mainRoutes) {
      if (start.path === end.path) continue;

      test(`Teleport: ${start.path} -> ${end.path} -> Back to ${start.path}`, async ({ page }) => {
        // 1. Go to start page
        await gotoAndSettle(page, start.path);
        await expectOnRoute(page, start.path);

        // 2. Go to end page
        await gotoAndSettle(page, end.path);
        await expectOnRoute(page, end.path);

        // 3. Click Teleport
        const teleportBtn = page.getByTestId('back-teleport-button');
        await expect(teleportBtn).toBeVisible();
        
        // Validate analytics request is sent
        const analyticsPromise = page.waitForRequest(req => 
          req.url().includes('supabase.co/rest/v1/navigation_analytics') && 
          req.method() === 'POST'
        ).catch(() => null); // Don't fail the test if analytics fails

        await teleportBtn.click();
        
        // 4. Should be back at start
        await expectOnRoute(page, start.path);
        
        // Optional: wait for analytics to ensure it was triggered
        await analyticsPromise;
      });
    }
  }

  test('Teleport: Triple navigation chain A -> B -> C -> Back to B -> Back to A', async ({ page }) => {
    const routeA = '/produtos';
    const routeB = '/favoritos';
    const routeC = '/simulador';

    await gotoAndSettle(page, routeA);
    await gotoAndSettle(page, routeB);
    await gotoAndSettle(page, routeC);

    // Back to B
    await page.getByTestId('back-teleport-button').click();
    await expectOnRoute(page, routeB);

    // Back to A
    await page.getByTestId('back-teleport-button').click();
    await expectOnRoute(page, routeA);
  });

  test('Teleport: Tooltip validation for both buttons', async ({ page }) => {
    await gotoAndSettle(page, '/produtos');
    await gotoAndSettle(page, '/favoritos');

    // Check Teletransporte tooltip
    const teleportBtn = page.getByTestId('back-teleport-button');
    await teleportBtn.hover();
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Teletransporte');
    await expect(tooltip).toContainText('página anterior');

    // Check Início tooltip
    const homeBtn = page.getByTestId('home-breadcrumb-link');
    await homeBtn.hover();
    await expect(tooltip).toContainText('Início');
    await expect(tooltip).toContainText('Catálogo (Home)');
  });

  test('Teleport vs Início: Início should reset to home and skip history', async ({ page }) => {
    await gotoAndSettle(page, '/produtos');
    await gotoAndSettle(page, '/favoritos');

    // Click Início
    await page.getByTestId('home-breadcrumb-link').click();
    await expectOnRoute(page, '/');

    // Verify breadcrumb bar is hidden on home
    await expect(page.getByTestId('breadcrumb-bar')).toBeHidden();
  });
});
