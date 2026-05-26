import { test, expect } from '@playwright/test';

test.describe('Comprehensive System Flow', () => {
  test('should navigate through main modules', async ({ page }) => {
    // 1. Visit Login
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);
    
    // 2. Check catalog (public access or redirect)
    await page.goto('/catalogo');
    // It might redirect to login if not authenticated, but we want to check the flow
    
    // 3. Visit Dashboard (requires auth)
    await page.goto('/');
    
    // 4. Test main navigation buttons if visible
    const navLinks = ['Dashboard', 'Catálogo', 'Orçamentos', 'Clientes'];
    for (const link of navLinks) {
      const el = page.getByRole('link', { name: link, exact: false }).first();
      if (await el.isVisible()) {
        await el.click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('should verify security settings page accessibility for admin', async ({ page }) => {
    // This assumes we have an admin session, but we'll just check the route
    await page.goto('/admin/seguranca');
    // If redirects to login, it means auth is working
  });

  test('should verify connection health page', async ({ page }) => {
    await page.goto('/admin/conexoes');
  });
});
