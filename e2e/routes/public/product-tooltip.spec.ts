import { test, expect } from "@playwright/test";

test.describe("Product Module Tooltip Style E2E", () => {
  test("Should verify tooltip in product detail module uses correct text and style", async ({ page }) => {
    // Navigate to a product detail page (adjust URL if needed)
    // Assuming a test product or listing
    await page.goto("/produto/example-id"); 

    // Find the stock-per-color tooltips
    const tooltipTrigger = page.locator('button[aria-label^="Cor"]').first();
    await tooltipTrigger.hover();

    // Check for TooltipContent (Radix)
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible();

    // Verify initial style (default should be standard)
    await expect(tooltip).toHaveClass(/px-3 py-1.5/);

    // Toggle to compact
    await page.locator('button[aria-label="Alternar tamanho do tooltip"]').click();

    // Hover again
    await tooltipTrigger.hover();
    await expect(tooltip).toHaveClass(/px-2 py-1/);
  });
});
