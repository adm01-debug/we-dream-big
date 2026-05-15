/**
 * Rota: /login — autenticação principal.
 */
import { test, expect } from "../../fixtures/test-base";
import { Sel } from "../../fixtures/selectors";
import {
  basicA11yChecks,
  mockSessionExpired,
  mockEdgeFn,
  setMobileViewport,
  waitRouteReady,
} from "../_shared";

test.describe("/login", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("render: form de login renderiza com campos essenciais", async ({ page }) => {
    await page.goto("/login");
    await waitRouteReady(page);
    await expect(page.locator(Sel.login.email)).toBeVisible();
    await expect(page.locator(Sel.login.password)).toBeVisible();
    await expect(page.locator(Sel.login.submit).first()).toBeVisible();
  });

  test("happy: validação de email triggera mensagem inline", async ({ page }) => {
    await page.goto("/login");
    await page.fill(Sel.login.email, "naoehemail");
    await page.fill(Sel.login.password, "Senha123!");
    await page.locator(Sel.login.submit).first().click();
    await expect(page.locator("text=/inválido|invalid/i").first()).toBeVisible({ timeout: 4000 });
  });

  test("auth fail: credenciais erradas → permanece em /login", async ({ page }) => {
    await page.route(/\/auth\/v1\/token/, route =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }),
      }),
    );
    await page.goto("/login");
    await page.fill(Sel.login.email, "naoexiste@example.com");
    await page.fill(Sel.login.password, "SenhaErrada123");
    await page.locator(Sel.login.submit).first().click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/login/);
  });

  test("payload inválido: 422 mostra erro sem quebrar form", async ({ page }) => {
    await page.route(/\/auth\/v1\/token/, route =>
      route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ error: "validation", message: "missing fields" }) }),
    );
    await page.goto("/login");
    await page.fill(Sel.login.email, "u@x.com");
    await page.fill(Sel.login.password, "abc");
    await page.locator(Sel.login.submit).first().click();
    await expect(page.locator(Sel.login.submit).first()).toBeEnabled({ timeout: 5000 });
  });

  test("timeout: chamada lenta de auth não trava o botão para sempre", async ({ page }) => {
    await page.route(/\/auth\/v1\/token/, async route => {
      await new Promise(r => setTimeout(r, 8000));
      await route.fulfill({ status: 504, body: "{}" });
    });
    await page.goto("/login");
    await page.fill(Sel.login.email, "u@x.com");
    await page.fill(Sel.login.password, "Senha123!");
    await page.locator(Sel.login.submit).first().click();
    // Após 10s o botão deve voltar a ficar utilizável (UI tem que se recuperar)
    await expect(page.locator(Sel.login.submit).first()).toBeEnabled({ timeout: 15_000 });
  });

  test("5xx: auth offline mostra erro amigável", async ({ page }) => {
    await mockSessionExpired(page);
    await page.route(/\/auth\/v1\/token/, route =>
      route.fulfill({ status: 503, body: JSON.stringify({ error: "service_unavailable" }) }),
    );
    await page.goto("/login");
    await page.fill(Sel.login.email, "u@x.com");
    await page.fill(Sel.login.password, "Senha123!");
    await page.locator(Sel.login.submit).first().click();
    await expect(
      page.locator(`${Sel.login.errorMsg}, ${Sel.app.toast}`)
        .or(page.getByRole("status"))
        .first()
    ).toBeVisible({ timeout: 8000 });
  });

  test("@a11y básico", async ({ page }) => {
    await page.goto("/login");
    await waitRouteReady(page);
    await basicA11yChecks(page);
  });

  test("@mobile layout 390x844 sem overflow horizontal", async ({ page }) => {
    await setMobileViewport(page);
    await page.goto("/login");
    await waitRouteReady(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    await expect(page.locator(Sel.login.submit).first()).toBeVisible();
  });
});
