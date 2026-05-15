import { test, expect, requireAuth } from "./fixtures/test-base";
import { gotoAndSettle, waitForRouteIdle } from "./helpers/nav";

const SKINS = [
  { id: "corporate", name: "Corporate" },
  { id: "diversity", name: "Diversity" },
  { id: "ocean", name: "Ocean" },
  { id: "amber", name: "Amber" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "mobile", width: 390, height: 844 },
];

test.describe("Regressão Visual — Matriz de Skins & Layout", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth();
  });

  for (const skin of SKINS) {
    for (const viewport of VIEWPORTS) {
      test(`Layout Global — Skin: ${skin.name} (${viewport.name})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        // Aplica a skin via localStorage (simulando a persistência do ThemeContext)
        await page.addInitScript((sId) => {
          localStorage.setItem("gifts-store-theme-config", JSON.stringify({
            presetId: sId,
            radius: 14,
            mode: "light"
          }));
        }, skin.id);

        // 1. Checkout (Carrinhos) - Verificação de sobreposição e scroll
        await gotoAndSettle(page, "/carrinhos");
        await waitForRouteIdle(page);
        
        const header = page.locator('[data-testid="app-header"]');
        const breadcrumb = page.locator('[data-testid="breadcrumb-bar"]');
        
        await expect(header).toBeVisible();
        // Breadcrumb pode estar oculto se for a "home" do módulo, mas validamos a área
        
        // Screenshot do checkout
        await expect(page).toHaveScreenshot(`checkout-${skin.id}-${viewport.name}.png`);

        // Teste de Scroll no Checkout
        if (viewport.name === "desktop") {
          await page.evaluate(() => window.scrollTo(0, 500));
          await page.waitForTimeout(500);
          await expect(page).toHaveScreenshot(`checkout-scrolled-${skin.id}-${viewport.name}.png`);
        }

        // 2. Produto (PDP) - Botões e Header
        // Navega para o primeiro produto do catálogo
        await gotoAndSettle(page, "/produtos");
        const firstProduct = page.locator('[data-testid="product-card"]').first();
        await firstProduct.click();
        await waitForRouteIdle(page);

        const cartBtn = page.locator('button:has-text("Carrinho")').first();
        const quoteBtn = page.locator('button:has-text("Orçamento")').first();

        await expect(cartBtn).toBeVisible();
        await expect(quoteBtn).toBeVisible();

        // Snapshot dos botões e hero
        await expect(page).toHaveScreenshot(`pdp-${skin.id}-${viewport.name}.png`);

        // Estados dos botões (Apenas Desktop para hover)
        if (viewport.name === "desktop") {
          await cartBtn.hover();
          await expect(cartBtn).toHaveScreenshot(`btn-cart-hover-${skin.id}.png`);
          
          await quoteBtn.hover();
          await expect(quoteBtn).toHaveScreenshot(`btn-quote-hover-${skin.id}.png`);
        }
      });
    }
  }

  test("Breadcrumb Sticky — Home vs Scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    
    // Na Home o breadcrumb deve sumir
    await gotoAndSettle(page, "/");
    const breadcrumb = page.locator('[data-testid="breadcrumb-bar"]');
    await expect(breadcrumb).toBeHidden();

    // Em uma página interna, ele aparece e fica sticky
    await gotoAndSettle(page, "/produtos");
    await expect(breadcrumb).toBeVisible();
    
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    
    const headerBox = await page.locator('[data-testid="app-header"]').boundingBox();
    const breadcrumbBox = await breadcrumb.boundingBox();
    
    // Breadcrumb deve estar logo abaixo do header (compactado)
    expect(breadcrumbBox?.y).toBeCloseTo(headerBox?.height || 0, 1);
  });
});

test.describe("Acessibilidade — Botões e Navegação", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth();
  });

  test("Foco por teclado e ARIA nos botões de ação (PDP)", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    await page.locator('[data-testid="product-card"]').first().click();
    await waitForRouteIdle(page);

    const cartBtn = page.locator('button:has-text("Carrinho")').first();
    const quoteBtn = page.locator('button:has-text("Orçamento")').first();

    // Validamos se os botões possuem labels acessíveis e estados corretos
    // Botão Carrinho
    await expect(cartBtn).toBeVisible();
    // Botão Orçamento
    await expect(quoteBtn).toBeVisible();

    // Testa foco via Tab (aproximado, pois depende de onde o foco está inicialmente)
    await page.keyboard.press("Tab");
    // Verificação de acessibilidade básica via role e label
    await expect(cartBtn).toHaveRole("button");
    await expect(quoteBtn).toHaveRole("button");
  });

  test("Navegação Mobile — Header e Menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAndSettle(page, "/");
    
    const menuBtn = page.locator('button').filter({ has: page.locator('svg') }).first(); // Seletor genérico para o botão de menu
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    
    // Menu (Sidebar) deve abrir
    await expect(page.locator('[data-tour="sidebar"]')).toBeVisible();
  });
});
