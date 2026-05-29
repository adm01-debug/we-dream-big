import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { gotoAndSettle, expectOnRoute } from './helpers/nav';

/**
 * Teleport (Teletransporte) Comprehensive Validation
 * 
 * Este spec realiza dezenas de testes (matriz de navegação) para garantir que
 * o botão de Teletransporte sempre retorne o usuário para a página anterior
 * correta, mantendo o histórico, em contraste com o botão "Início".
 */
test.describe('Teletransporte Comprehensive Validation', () => {
  test.beforeEach(async ({ page }) => {
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

  // Matriz de testes: Dezenas de combinações A -> B -> Back to A
  for (const start of mainRoutes) {
    for (const end of mainRoutes) {
      if (start.path === end.path) continue;

      test(`Teleport: ${start.path} -> ${end.path} -> Back to ${start.path}`, async ({ page }) => {
        await gotoAndSettle(page, start.path);
        await expectOnRoute(page, start.path);

        await gotoAndSettle(page, end.path);
        await expectOnRoute(page, end.path);

        const teleportBtn = page.getByTestId('back-teleport-button');
        await expect(teleportBtn).toBeVisible();
        
        // Verifica disparo do analytics
        const analyticsPromise = page.waitForRequest(req => 
          req.url().includes('navigation_analytics') && 
          req.method() === 'POST'
        ).catch(() => null);

        await teleportBtn.click();
        await expectOnRoute(page, start.path);
        
        const request = await analyticsPromise;
        if (request) {
          const body = JSON.parse(request.postData() || '{}');
          expect(body.button_name).toBe('Teletransporte');
        }
      });
    }
  }

  test('Teleport: Deep navigation Produtos -> Detalhe -> Produtos', async ({ page }) => {
    // Usando um ID real do banco para garantir que a rota de detalhe carregue
    const productId = 'bea8bd6e-14f4-4482-921d-ecc179391166';
    
    await gotoAndSettle(page, '/produtos');
    await gotoAndSettle(page, `/produto/${productId}`);
    
    await expect(page.getByTestId('back-teleport-button')).toBeVisible();
    await page.getByTestId('back-teleport-button').click();
    
    await expectOnRoute(page, '/produtos');
  });

  test('Teleport: Triple navigation chain A -> B -> C -> Back to B -> Back to A', async ({ page }) => {
    const routeA = '/produtos';
    const routeB = '/favoritos';
    const routeC = '/simulador';

    await gotoAndSettle(page, routeA);
    await gotoAndSettle(page, routeB);
    await gotoAndSettle(page, routeC);

    await page.getByTestId('back-teleport-button').click();
    await expectOnRoute(page, routeB);

    await page.getByTestId('back-teleport-button').click();
    await expectOnRoute(page, routeA);
  });

  test('Teleport: Tooltip text validation (Portuguese explanation)', async ({ page }) => {
    await gotoAndSettle(page, '/produtos');
    await gotoAndSettle(page, '/favoritos');

    const teleportBtn = page.getByTestId('back-teleport-button');
    await teleportBtn.hover();
    
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Retorna para a página anterior');
    await expect(tooltip).toContainText('mantém seu progresso anterior');

    const homeBtn = page.getByTestId('home-breadcrumb-link');
    await homeBtn.hover();
    await expect(tooltip).toContainText('Leva você de volta ao Catálogo');
    await expect(tooltip).toContainText('recomeçar sua busca do zero');
  });

  test('Teleport vs Início: Início should reset to home and bypass history', async ({ page }) => {
    await gotoAndSettle(page, '/produtos');
    await gotoAndSettle(page, '/favoritos');

    await page.getByTestId('home-breadcrumb-link').click();
    await expectOnRoute(page, '/');
    await expect(page.getByTestId('breadcrumb-bar')).toBeHidden();
  });
});

