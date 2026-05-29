import { test, expect, requireAuth } from "./fixtures/test-base";
import { gotoAndSettle } from "./helpers/nav";

test.describe("Tooltip Regression Tests", () => {
  test.beforeEach(({}, testInfo) => {
    requireAuth();
    testInfo.annotations.push({ type: 'component', description: 'Tooltip' });
    testInfo.annotations.push({ type: 'feature', description: 'Regression Visual & Styling' });
  });

  test("Check tooltip styling (font size, padding, max-width)", async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'coverage', description: 'Standard Mode Styling' });
    
    await test.step("Navigate to products page", async () => {
      await gotoAndSettle(page, "/produtos");
      await page.setViewportSize({ width: 1366, height: 768 });
    });
    
    await test.step("Trigger tooltip and validate styles", async () => {
      const tooltipTrigger = page.locator('[data-state="closed"]').first();
      if (await tooltipTrigger.count() > 0) {
        await tooltipTrigger.hover();
        
        const tooltip = page.locator('[role="tooltip"]');
        await expect(tooltip).toBeVisible();
        
        const fontSize = await tooltip.evaluate((el) => window.getComputedStyle(el).fontSize);
        const padding = await tooltip.evaluate((el) => window.getComputedStyle(el).padding);
        const maxWidth = await tooltip.evaluate((el) => window.getComputedStyle(el).maxWidth);
        
        console.log(`Tooltip Font Size: ${fontSize}`);
        console.log(`Tooltip Padding: ${padding}`);
        console.log(`Tooltip Max Width: ${maxWidth}`);
        
        expect(parseFloat(fontSize)).toBeCloseTo(11.7, 0);
        expect(padding).toMatch(/8px|16px/);
        expect(maxWidth).toBe("380px");
        
        testInfo.annotations.push({ 
          type: 'result', 
          description: `Styles validated: Font=${fontSize}, Padding=${padding}, MaxWidth=${maxWidth}` 
        });
      } else {
        testInfo.annotations.push({ type: 'warning', description: 'No tooltip trigger found on this page' });
      }
    });
  });

  test("Tooltip responsiveness on mobile", async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'coverage', description: 'Mobile Viewport' });
    
    await test.step("Set mobile viewport and navigate", async () => {
      await page.setViewportSize({ width: 320, height: 568 });
      await gotoAndSettle(page, "/produtos");
    });
    
    await test.step("Verify tooltip fits in mobile viewport", async () => {
      const tooltipTrigger = page.locator('button[aria-haspopup="dialog"], [data-state="closed"]').first();
      if (await tooltipTrigger.count() > 0) {
        await tooltipTrigger.hover();
        const tooltip = page.locator('[role="tooltip"]');
        await expect(tooltip).toBeVisible();
        
        const maxWidth = await tooltip.evaluate((el) => window.getComputedStyle(el).maxWidth);
        expect(parseFloat(maxWidth)).toBeLessThanOrEqual(320);
        
        testInfo.annotations.push({ 
          type: 'result', 
          description: `Mobile max-width validated: ${maxWidth}` 
        });
      }
    });
  });
});
