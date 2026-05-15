import { test, expect, requireAuth } from "./fixtures/test-base";
import { gotoAndSettle, waitForRouteIdle } from "./helpers/nav";
import { waitForTestIdVisible } from "./helpers/waits";
import { Sel } from "./fixtures/selectors";

/**
 * Teste de Regressão Visual: Header e Breadcrumb
 * Cobre: Rolagem, Temas/Skins, Mobile vs Desktop.
 */

test.describe("Regressão Visual — Layout Global (Header/Breadcrumb)", () => {
  test.beforeEach(() => requireAuth());

  test("Header e Breadcrumb na Home (Mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAndSettle(page, "/");
    
    // Header visível, Breadcrumb oculto na Home
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="breadcrumb-bar"]')).toBeHidden();
    
    // Screenshot inicial
    await expect(page).toHaveScreenshot("layout-home-mobile.png");
  });

  test("Header e Breadcrumb no Catálogo (Desktop) - Com Scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await gotoAndSettle(page, "/produtos");
    await waitForRouteIdle(page);
    
    const header = page.locator('[data-testid="app-header"]');
    const breadcrumb = page.locator('[data-testid="breadcrumb-bar"]');
    
    await expect(header).toBeVisible();
    await expect(breadcrumb).toBeVisible();

    // Rola para baixo para ver o header compactar e breadcrumb fixar
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500); // Aguarda transição CSS

    // Verifica se estão no topo (sticky/fixed)
    const headerBox = await header.boundingBox();
    const breadcrumbBox = await breadcrumb.boundingBox();
    
    expect(headerBox?.y).toBeLessThanOrEqual(5); // Perto do topo 0
    expect(breadcrumbBox?.y).toBeGreaterThan(headerBox?.height || 0); // Abaixo do header
    
    await expect(page).toHaveScreenshot("layout-catalog-scrolled-desktop.png");
  });

  test("Sidebar e Header Overlap (Desktop Collapsed vs Expanded)", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await gotoAndSettle(page, "/produtos");
    
    const sidebar = page.locator('[data-tour="sidebar"]');
    const header = page.locator('[data-testid="app-header"]');
    
    // Verifica alinhamento do header com a sidebar
    const sidebarBox = await sidebar.boundingBox();
    const headerBox = await header.boundingBox();
    
    // O header não deve sobrepor a sidebar em desktop (seu left deve ser >= sidebar width)
    expect(headerBox?.x).toBeGreaterThanOrEqual(sidebarBox?.width || 0);
    
    await expect(page).toHaveScreenshot("layout-header-sidebar-alignment.png");
  });
});

test.describe("Regressão Visual — Produto Hero Buttons", () => {
  test.beforeEach(() => requireAuth());

  test("Cores dos botões Carrinho e Orçamento (Desktop)", async ({ page }) => {
    // Usamos um ID de produto mockado ou fixo se soubermos, caso contrário pegamos o primeiro do catálogo
    await gotoAndSettle(page, "/produtos");
    await page.locator('[data-testid="product-card"]').first().click();
    await waitForRouteIdle(page);
    
    const hero = page.locator('div.grid.lg\\:grid-cols-\\[minmax\\(0\\,5fr\\)_minmax\\(0\\,7fr\\)\\]');
    await expect(hero).toBeVisible();

    const cartBtn = page.locator('button:has-text("Carrinho")').first();
    const quoteBtn = page.locator('button:has-text("Orçamento")').first();

    await expect(cartBtn).toBeVisible();
    await expect(quoteBtn).toBeVisible();

    // Snapshot dos botões em estado normal
    await expect(cartBtn).toHaveScreenshot("btn-cart-normal.png");
    await expect(quoteBtn).toHaveScreenshot("btn-quote-normal.png");

    // Hover state
    await cartBtn.hover();
    await expect(cartBtn).toHaveScreenshot("btn-cart-hover.png");
    
    await quoteBtn.hover();
    await expect(quoteBtn).toHaveScreenshot("btn-quote-hover.png");
  });
});
