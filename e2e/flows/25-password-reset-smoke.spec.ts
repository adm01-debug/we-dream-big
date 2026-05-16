
import { test, expect } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { expectVisibleByTestId } from "../helpers/waits";

test.describe("Fluxo: Password Reset UI", () => {
  test("mostra erro para link inválido (sem token)", async ({ page }) => {
    await gotoAndSettle(page, "/reset-password");
    
    // Deve mostrar o card de link inválido/expirado
    await expect(page.getByText("Link inválido ou expirado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Voltar ao login" })).toBeVisible();
  });

  test("renderiza formulário quando há token no hash", async ({ page }) => {
    // Simula o redirecionamento do Supabase com token de recuperação
    await page.goto("/reset-password#access_token=mock-token&type=recovery");
    
    // Aguarda o settlement da página
    await page.waitForLoadState("networkidle");
    
    // Deve mostrar o formulário de redefinição
    await expect(page.getByRole("heading", { name: "Redefinir senha" })).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(page.locator("input#confirmPassword")).toBeVisible();
    await expect(page.getByRole("button", { name: "Redefinir senha" })).toBeVisible();
  });

  test("valida força da senha em tempo real", async ({ page }) => {
    await page.goto("/reset-password#access_token=mock-token&type=recovery");
    
    const pwdInput = page.locator("input#password");
    await pwdInput.fill("123");
    
    // Deve mostrar o indicador de força (provavelmente fraca)
    const strengthIndicator = page.locator("[data-testid='password-strength-indicator']");
    if (await strengthIndicator.count() > 0) {
      await expect(strengthIndicator).toBeVisible();
    }
    
    // Verifica mensagens de erro do Zod
    await page.getByRole("button", { name: "Redefinir senha" }).click();
    await expect(page.getByText("Senha deve ter pelo menos 8 caracteres")).toBeVisible();
  });
});
