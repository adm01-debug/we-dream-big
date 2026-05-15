/**
 * E2E: Catalog & Filters - All critical routes
 */
import { test, expect } from "./fixtures/test-base";
import { gotoAndSettle } from "./helpers/nav";
import { expectVisibleByTestId } from "./helpers/waits";
import { loginAs } from "./helpers/auth";

test.describe("Catalog & Filters", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should display product list and filters", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    await expectVisibleByTestId(page, "product-grid");
    await expectVisibleByTestId(page, "product-filters");
  });

  test("should apply combined filters and preserve state in URL", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    
    // Open categories
    await page.locator('[data-testid="filter-section-categorias"]').click();
    const firstCategory = page.locator('[data-testid="category-filter-item"]').first();
    const categoryName = await firstCategory.innerText();
    await firstCategory.click();
    
    // Apply price filter
    await page.locator('[data-testid="filter-section-preco"]').click();
    await page.locator('input[placeholder="Ex: 0"]').first().fill("50");
    await page.locator('input[placeholder="Sem limite"]').first().fill("200");
    
    // Wait for network/results update
    await page.waitForTimeout(1000);
    
    // Check URL
    expect(page.url()).toContain("priceRange=50");
    expect(page.url()).toContain("priceRange=200");
    
    // Reload and check if filters persist
    await page.reload();
    await expect(page.locator('[data-testid="active-filter-badge"]')).toContainText(categoryName.trim());
  });

  test("should handle sorting options", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    const sortTrigger = page.locator('[data-testid="sort-select-trigger"]');
    await sortTrigger.click();
    await page.locator('role=option[name="Preço: Menor para Maior"]').click();
    
    await page.waitForTimeout(500);
    expect(page.url()).toContain("sortBy=price_asc");
  });

  test("should display correct empty state for impossible filter combination", async ({ page }) => {
    await gotoAndSettle(page, "/produtos?priceRange=0&priceRange=1&q=impossibleproductname");
    const emptyState = page.locator('[data-testid="empty-catalog-state"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText("Nenhum produto encontrado");
  });

  test("should navigate through pagination", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    const nextPage = page.locator('[data-testid="pagination-next"]');
    if (await nextPage.isVisible()) {
      await nextPage.click();
      expect(page.url()).toContain("page=2");
    }
  });
});
