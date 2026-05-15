/**
 * E2E: Protected Routes — Verify auth guards on all critical routes
 */
import { test, expect } from '@playwright/test';

const protectedRoutes = [
  '/',
  '/dashboard',
  '/produtos',
  '/orcamentos',
  '/orcamentos/novo',
  '/orcamentos/kanban',
  '/orcamentos/dashboard',
  '/pedidos',
  '/simulador',
  '/colecoes',
  '/carrinhos',
];

test.describe('Protected Routes — Auth Guards', () => {
  for (const route of protectedRoutes) {
    test(`${route} should redirect to /login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/login/, { timeout: 10000 });
      expect(page.url()).toMatch(/login/);
    });
  }
});

const publicRoutes = [
  '/login',
  '/reset-password',
  '/proposta/test-token',
  '/approve/test-token',
  '/kit/test-token',
];

test.describe('Public Routes — No Auth Required', () => {
  for (const route of publicRoutes) {
    test(`${route} should NOT redirect to /login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForTimeout(2000);
      expect(page.url()).not.toMatch(/\/login$/);
    });
  }
});
