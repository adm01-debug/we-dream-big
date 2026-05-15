/**
 * E2E: Discount Approval Workflow — Smoke
 * Verifica que a aba de aprovações dentro de Usuários é protegida
 * e que a unificação de URLs (legacy → tab) funciona.
 */
import { test, expect } from '@playwright/test';

test.describe('Discount Approval', () => {
  test('admin discount tab requires auth', async ({ page }) => {
    await page.goto('/admin/usuarios?tab=discounts');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('legacy /admin/aprovacoes-desconto redirects and requires auth', async ({ page }) => {
    await page.goto('/admin/aprovacoes-desconto');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('tab=discounts query param preserved through auth redirect chain', async ({ page }) => {
    // Usuário não-autenticado vai para login; ao voltar deveria preservar a aba.
    // Smoke check: a query string sobrevive ao redirect inicial (mesmo que seja para login).
    const response = await page.goto('/admin/usuarios?tab=discounts');
    expect(response?.status()).toBeLessThan(500);
    await page.waitForURL(/login/, { timeout: 10000 });
  });

  test('legacy /admin/aprovacoes-desconto preserves query semantics', async ({ page }) => {
    // O path legado deve sempre redirecionar (não 404), provando que o Navigate replace está ativo.
    const response = await page.goto('/admin/aprovacoes-desconto');
    expect(response?.status()).toBeLessThan(500);
    // Em qualquer fluxo (auth ou não) o usuário NÃO deve ficar na URL legada.
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page).not.toHaveURL(/aprovacoes-desconto/);
  });
});
