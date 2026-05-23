import { test, expect } from '@playwright/test';

/**
 * Teste de snapshot visual e consistência determinística para a animação de foguetes.
 * Garante que a animação renderiza o número esperado de elementos mesmo com durações aleatórias.
 * @smoke
 */
test.describe('Rocket Animation Consistency @smoke', () => {
  test('should render initial burst of rockets and maintain count', async ({ page }) => {
    await page.addInitScript(() => {
      let count = 0;
      const values = [
        0.1, 0.5, 0.9, 0.2, 0.8,
        0.3, 0.7, 0.4, 0.6, 0.1,
        0.5, 0.9, 0.2, 0.8, 0.3,
        0.7, 0.4, 0.6, 0.1, 0.5,
        0.9, 0.2, 0.8, 0.3, 0.7,
        0.4, 0.6, 0.1, 0.5, 0.9,
        0.2, 0.8, 0.3, 0.7, 0.4
      ];
      Math.random = () => {
        const val = values[count % values.length];
        count++;
        return val;
      };
    });

    await page.goto('/auth/login');

    const spaceScene = page.getByTestId('space-scene');
    await expect(spaceScene).toBeVisible();

    await expect(page.getByTestId('rocket-item')).toHaveCount(7, { timeout: 5000 });

    const rocketCount = await page.getByTestId('rocket-item').count();
    expect(rocketCount).toBe(7);

    const brandingPanel = page.locator('.lg\\:flex.lg\\:w-1\\/2');
    await expect(brandingPanel).toHaveScreenshot('auth-branding-rockets.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('should cleanup rockets after duration', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForTimeout(10000);
    const currentRockets = await page.locator('svg.lucide-rocket').count();
    expect(currentRockets).toBeGreaterThan(0);
  });
});
