/**
 * Helpers de formulários — preenchimento robusto + validações.
 */
import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export async function fillIfPresent(page: Page, selector: string, value: string) {
  const loc = page.locator(selector).first();
  if (await loc.count()) {
    await loc.fill(value);
  }
}

export async function clickByText(page: Page, text: string | RegExp): Promise<boolean> {
  const loc = page.getByText(text).first();
  if (await loc.count()) {
    await loc.click();
    return true;
  }
  return false;
}

export async function expectVisibleAny(page: Page, selectors: string[]) {
  for (const s of selectors) {
    const loc = page.locator(s).first();
    if ((await loc.count()) && (await loc.isVisible().catch(() => false))) {
      await expect(loc).toBeVisible();
      return loc;
    }
  }
  throw new Error(`Nenhum dos seletores visível: ${selectors.join(", ")}`);
}

export async function safeClick(loc: Locator) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.click({ trial: false });
}
