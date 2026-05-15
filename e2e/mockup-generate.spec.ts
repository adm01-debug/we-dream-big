/**
 * E2E: Mockup Generation — Smoke
 */
import { test, expect } from '@playwright/test';

test.describe('Mockup Generator', () => {
  test('mockup studio requires auth', async ({ page }) => {
    await page.goto('/mockup');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('magic up requires auth', async ({ page }) => {
    await page.goto('/magic-up');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
});
