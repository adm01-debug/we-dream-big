/**
 * Carrinhos E2E Tests - Onda Excelência UX 10/10
 */

import { test, expect } from "@playwright/test";

test.describe("Módulo de Carrinhos - Fluxos Críticos", () => {
  test.beforeEach(async ({ page }) => {
    // Login simplificado ou skip auth se estiver em dev
    await page.goto("/carrinhos");
  });

  test("Criação de novo carrinho via Picker", async ({ page }) => {
    // Abre modal de novo carrinho
    await page.click('[data-testid="cart-tab-new"]');
    await expect(page.locator("text=Vincular a uma empresa")).toBeVisible();

    // Seleciona uma empresa da busca ou recentes
    const firstCompany = page.locator('[data-testid="cart-company-picker-select"]').first();
    await firstCompany.click();

    // Valida se aba foi criada
    await expect(page.locator('[data-testid="cart-tab"][data-active="true"]')).toBeVisible();
  });

  test("Gestão de itens: Adição, Quantidade e Notas", async ({ page }) => {
    // Assume que já existe um carrinho ativo (ou cria um rápido)
    // Para teste isolado, vamos garantir um carrinho
    await page.goto("/produtos");
    await page.click('[data-testid="product-card-add"]').first();
    await page.goto("/carrinhos");

    // Valida item no carrinho
    const cartItem = page.locator('[data-testid="cart-item"]').first();
    await expect(cartItem).toBeVisible();

    // Testa Stepper de Quantidade
    const initialQty = await page.locator('[data-testid="cart-qty-badge"]').textContent();
    await page.click('[data-testid="cart-qty-increment"]');
    await expect(page.locator('[data-testid="cart-qty-badge"]')).not.toHaveText(initialQty || "");

    // Testa Notas do Item
    await page.click('[data-testid="cart-item-notes-toggle"]');
    await page.fill('[data-testid="cart-item-notes-input"]', "Teste de observação E2E");
    // Aguarda debounce
    await page.waitForTimeout(1000);
    await page.reload();
    await page.click('[data-testid="cart-item-notes-toggle"]');
    await expect(page.locator('[data-testid="cart-item-notes-input"]')).toHaveValue("Teste de observação E2E");
  });

  test("Saúde do Carrinho e Conversão para Orçamento", async ({ page }) => {
    await page.goto("/carrinhos");
    // Verifica se Checklist de Saúde está visível
    await expect(page.locator("text=Saúde do Carrinho")).toBeVisible();

    // Clica no CTA principal de conversão
    await page.click('[data-testid="cart-checkout-cta"]');
    
    // Valida Dialog de Confirmação
    await expect(page.locator('[data-testid="cart-confirm-dialog"]')).toBeVisible();
    await page.click('button:has-text("Gerar Orçamento")');

    // Deve redirecionar para o Builder de Orçamento
    await expect(page).toHaveURL(/\/orcamentos\/novo/);
  });
});
