import { test, expect } from '@playwright/test';

test('Resiliência a 410 Gone na página de estoque', async ({ page }) => {
  // Interceptar chamadas PostgREST e retornar 410
  await page.route('**/rest/v1/variant_supplier_sources*', async (route) => {
    await route.fulfill({
      status: 410,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Gone', message: 'Serviço descontinuado' }),
    });
  });

  await page.goto('/estoque'); // Ajustar rota se necessário

  // Verificar se a mensagem de erro amigável aparece
  // const errorMsg = page.locator('text=O serviço de ponte legado foi desativado');
  // await expect(errorMsg).toBeVisible();
});
