/**
 * E2E: Kit Builder - Flows and states
 */
import { test, expect } from "./fixtures/test-base";
import { gotoAndSettle } from "./helpers/nav";
import { expectVisibleByTestId } from "./helpers/waits";
import { loginAs } from "./helpers/auth";

test.describe("Kit Builder", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should display kit builder empty state", async ({ page }) => {
    await gotoAndSettle(page, "/kit-builder");
    await expectVisibleByTestId(page, "kit-builder-container");
    const emptyMsg = page.locator(':text("Seu kit está vazio")');
    await expect(emptyMsg.first()).toBeVisible();
  });

  test("should allow editing kit name", async ({ page }) => {
    await gotoAndSettle(page, "/kit-builder");
    const nameInput = page.locator('[data-testid="kit-name-input"]');
    await nameInput.fill("Kit de Teste Senior");
    await page.keyboard.press("Enter");
    await expect(nameInput).toHaveValue("Kit de Teste Senior");
  });

  test("should complete a full kit build flow", async ({ page }) => {
    await gotoAndSettle(page, "/kit-builder");
    
    // Step 1: Select Box
    await page.locator('[data-testid="wizard-step-box"]').click();
    const firstBox = page.locator('[data-testid="box-option"]').first();
    await expect(firstBox).toBeVisible();
    await firstBox.click();
    
    // Step 2: Select Items
    await page.locator('[data-testid="wizard-step-items"]').click();
    const firstItem = page.locator('[data-testid="item-option"]').first();
    await expect(firstItem).toBeVisible();
    await firstItem.click(); // Add first item
    
    const secondItem = page.locator('[data-testid="item-option"]').nth(1);
    await secondItem.click(); // Add second item
    
    // Update quantity
    const qtyInput = page.locator('[data-testid="kit-item-quantity"]').first();
    await qtyInput.fill("5");
    await qtyInput.blur();
    
    // Step 3: Summary
    await page.locator('[data-testid="wizard-step-summary"]').click();
    await expect(page.locator('[data-testid="kit-summary-total"]')).toBeVisible();
    
    // Validate removal
    await page.locator('[data-testid="wizard-step-items"]').click();
    await page.locator('[data-testid="remove-kit-item"]').first().click();
    
    // Summary again
    await page.locator('[data-testid="wizard-step-summary"]').click();
    const itemsCount = await page.locator('[data-testid="kit-summary-item"]').count();
    expect(itemsCount).toBe(1);
  });

  test("should reset kit and return to empty state", async ({ page }) => {
    await gotoAndSettle(page, "/kit-builder");
    // Add something first
    await page.locator('[data-testid="wizard-step-box"]').click();
    await page.locator('[data-testid="box-option"]').first().click();
    
    // Reset
    await page.locator('[data-testid="reset-kit-button"]').click();
    await page.locator('[data-testid="confirm-reset-button"]').click();
    
    const emptyMsg = page.locator(':text("Seu kit está vazio")');
    await expect(emptyMsg.first()).toBeVisible();
  });
});
