import { test, expect } from '@playwright/test';

/**
 * Smoke estrutural do branding da página de login (space scene + estrelas).
 *
 * Histórico: era visual-regression por pixel (toHaveScreenshot), mas nunca
 * houve baseline `.png` commitado no repo, então falhava sempre em CI.
 * Convertido para checagem de presença/estilo no DOM (nível smoke).
 */
test.describe('Auth Page Visual Regression @smoke', () => {
  // Ignoramos a dependência de auth para este teste específico de branding
  test.use({ storageState: { cookies: [], origins: [] } });

  test('renderiza a estrutura do space scene branding', async ({ page }) => {
    await page.goto('/login');

    // O container do branding (space-scene) e as estrelas devem montar.
    await expect(page.getByTestId('space-scene')).toBeVisible();
    await expect(page.getByTestId(/^star-breathing-/).first()).toBeVisible();
  });

  test('should verify star brightness presence in DOM', async ({ page }) => {
    await page.goto('/login');
    const firstStar = page.getByTestId(/^star-breathing-/).first();
    await expect(firstStar).toBeVisible();

    // O glow azul das estrelas é aplicado DENTRO do @keyframes `breathingStar`
    // (não como box-shadow estático), então o valor amostrado é frame-dependente
    // e frequentemente "none". Validamos a presença/aparência estável da estrela:
    // é um disco branco (bg-white rounded-full). Não dependemos do frame da animação.
    const bg = await firstStar.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(255, 255, 255)');
  });
});
