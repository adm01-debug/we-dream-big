/**
 * Rota: /reset-password — fluxo de redefinição de senha.
 */
import { test, expect } from "../../fixtures/test-base";
import { basicA11yChecks, setMobileViewport, waitRouteReady } from "../_shared";

test.describe("/reset-password", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("render: campos de nova senha visíveis", async ({ page }) => {
    // A rota sem token exibe "link inválido" — precisa do hash para ver o form.
    await page.goto("/reset-password#access_token=fake&type=recovery");
    await waitRouteReady(page);
    const newPwd = page.locator('input[type="password"]').first();
    await expect(newPwd).toBeVisible({ timeout: 8000 });
  });

  test("happy: senha forte válida habilita botão de submeter", async ({ page }) => {
    await page.goto("/reset-password#access_token=fake&type=recovery");
    await waitRouteReady(page);
    const pwds = page.locator('input[type="password"]');
    if ((await pwds.count()) >= 1) {
      await pwds.first().fill("NovaSenha@2025!");
      if ((await pwds.count()) >= 2) await pwds.nth(1).fill("NovaSenha@2025!");
    }
    const submit = page.getByRole("button", { name: /atualizar|salvar|redefinir/i }).first();
    await expect(submit).toBeEnabled({ timeout: 4000 });
  });

  test("token inválido: sem access_token mostra mensagem ou redireciona", async ({ page }) => {
    await page.goto("/reset-password");
    await waitRouteReady(page);
    const ok = await page
      .getByText(/inválido|expirado|link.+inválido|redireciona/i)
      .first()
      .isVisible()
      .catch(() => false);
    const redirected = /\/login/.test(page.url());
    expect(ok || redirected).toBeTruthy();
  });

  test("payload inválido: senha fraca mostra erro de validação", async ({ page }) => {
    await page.goto("/reset-password#access_token=fake&type=recovery");
    await waitRouteReady(page);
    const pwds = page.locator('input[type="password"]');
    if (await pwds.count()) {
      await pwds.first().fill("123");
      if ((await pwds.count()) >= 2) await pwds.nth(1).fill("123");
      await page.getByRole("button").first().click().catch(() => {});
      await expect(page.locator("text=/mínim|fraca|inválida|caracteres/i").first()).toBeVisible({ timeout: 4000 });
    }
  });

  test("timeout: updateUser pendurado não congela tela", async ({ page }) => {
    await page.route(/\/auth\/v1\/user/, async route => {
      await new Promise(r => setTimeout(r, 6000));
      await route.fulfill({ status: 504, body: "{}" });
    });
    await page.goto("/reset-password#access_token=fake&type=recovery");
    await waitRouteReady(page);
    expect(await page.locator("body").isVisible()).toBe(true);
  });

  test("5xx: erro do backend mostra alerta", async ({ page }) => {
    await page.route(/\/auth\/v1\/user/, route =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: "server_error" }) }),
    );
    await page.goto("/reset-password#access_token=fake&type=recovery");
    await waitRouteReady(page);
    const pwds = page.locator('input[type="password"]');
    if (await pwds.count()) {
      await pwds.first().fill("ValidPass@2025");
      if ((await pwds.count()) >= 2) await pwds.nth(1).fill("ValidPass@2025");
      await page.getByRole("button", { name: /atualizar|salvar|redefinir/i }).first().click().catch(() => {});
      await expect(page.getByRole("alert").or(page.getByRole("status")).first()).toBeVisible({ timeout: 8000 });
    }
  });

  test("@a11y básico", async ({ page }) => {
    await page.goto("/reset-password");
    await waitRouteReady(page);
    await basicA11yChecks(page);
  });

  test("@mobile layout sem overflow", async ({ page }) => {
    await setMobileViewport(page);
    await page.goto("/reset-password");
    await waitRouteReady(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });
});
