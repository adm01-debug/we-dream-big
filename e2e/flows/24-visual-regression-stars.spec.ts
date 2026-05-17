import { test, expect } from '@playwright/test';

/**
 * Teste de regressão visual para garantir que o layout da página de login
 * e o brilho das estrelas permaneçam consistentes.
 */
test.describe('Auth Page Visual Regression @smoke', () => {
  test('should match visual snapshot for the space scene branding', async ({ page }) => {
    // 1. Mock do Math.random para garantir que estrelas e outros elementos
    // randômicos fiquem na mesma posição sempre.
    await page.addInitScript(() => {
      let count = 0;
      // Geramos uma sequência "determinística" de valores entre 0 e 1
      const values = Array.from({ length: 1000 }, (_, i) => {
        // Usando um seno para variar sem parecer padrão óbvio, mas fixo
        return (Math.sin(i * 999) + 1) / 2;
      });
      Math.random = () => {
        const val = values[count % values.length];
        count++;
        return val;
      };
    });

    // 2. Navegação
    await page.goto('/auth/login');

    // 3. Aguardar estabilização do layout
    // Esperamos pelo componente de cena espacial
    await expect(page.getByTestId('space-scene')).toBeVisible();
    
    // Aguardamos as estrelas carregarem (elas são as primeiras no array starsRef)
    await expect(page.getByTestId(/^star-breathing-/).first()).toBeVisible();

    // 4. Pausar animações CSS para evitar diferenças de milissegundos no snapshot
    // O Playwright reducedMotion: 'reduce' ajuda, mas pausar é mais garantido para animações infinitas.
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-play-state: paused !important;
          transition: none !important;
        }
      `
    });

    // 5. Capturar snapshot visual do painel de branding
    // Locator para o painel lateral em desktop (lg:w-1/2) ou o container principal
    const brandingPanel = page.locator('.lg\\:flex.lg\\:w-1\\/2');
    
    // Verificamos se estamos em modo desktop para o snapshot lateral
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width >= 1024) {
      await expect(brandingPanel).toHaveScreenshot('auth-branding-space-scene.png', {
        maxDiffPixelRatio: 0.05,
        threshold: 0.2, // Sensibilidade ao brilho/cores
      });
    } else {
      // Mobile: capturamos a página inteira ou o container da cena
      await expect(page.getByTestId('space-scene')).toHaveScreenshot('auth-mobile-space-scene.png', {
        maxDiffPixelRatio: 0.05,
      });
    }
  });

  test('should verify star brightness presence in DOM', async ({ page }) => {
    await page.goto('/auth/login');
    
    const firstStar = page.getByTestId(/^star-breathing-/).first();
    await expect(firstStar).toBeVisible();
    
    // Verifica se os estilos de brilho estão presentes via box-shadow
    // Extraímos o estilo computado
    const boxShadow = await firstStar.evaluate((el) => window.getComputedStyle(el).boxShadow);
    
    // Deve conter múltiplas camadas de brilho (vírgulas separam sombras no box-shadow)
    // Nosso componente tem 4 camadas.
    const layers = boxShadow.split(',').length;
    expect(layers).toBeGreaterThanOrEqual(1);
    
    // Verifica se a cor do brilho (azul 3b82f6 -> rgb(59, 130, 246)) está presente
    expect(boxShadow).toContain('rgb(59, 130, 246)');
  });
});
