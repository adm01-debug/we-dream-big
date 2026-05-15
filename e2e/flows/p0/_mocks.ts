/**
 * Helpers de mock para skeletons P0 Playwright.
 *
 * Usa `page.route()` para interceptar chamadas a edge functions e webhooks
 * sem tocar o backend real. Cada helper foca em um cenário do RUNBOOK P0.
 */
import type { Page } from "@playwright/test";

const FN_BASE = /\/functions\/v1\//;

export async function mockEdgeFunctionFailure(
  page: Page,
  fnName: string,
  status: number,
  body: unknown,
) {
  await page.route(new RegExp(`/functions/v1/${fnName}(\\?|$|/)`), async route => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

export async function mockExternalDbOffline(page: Page) {
  return mockEdgeFunctionFailure(page, "external-db-bridge", 503, {
    success: false,
    error: "External DB unreachable",
  });
}

export async function mockCrmBridgeOffline(page: Page) {
  return mockEdgeFunctionFailure(page, "crm-db-bridge", 503, {
    success: false,
    error: "CRM unreachable",
  });
}

export async function mockBitrixWebhookFail(page: Page) {
  return mockEdgeFunctionFailure(page, "bitrix-sync", 502, {
    error: "BAD_GATEWAY",
  });
}

export async function mockAllEdgeFunctions5xx(page: Page) {
  await page.route(FN_BASE, async route => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "service_unavailable" }),
    });
  });
}

export async function mockSessionExpired(page: Page) {
  await page.route(/\/auth\/v1\/(token|user)/, async route => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "invalid_grant", error_description: "JWT expired" }),
    });
  });
}
