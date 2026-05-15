/**
 * E2E: Agente (Vendedor) Permissions & Navigation
 * 
 * Valida o fluxo de acesso e bloqueio específico para o perfil de Agente.
 * Garante que a comunicação de erro (403) seja contextual ao papel de vendedor.
 */
import { test, expect } from "./fixtures/test-base";
import { loginAs } from "./helpers/auth";
import { gotoAndSettle } from "./helpers/nav";

test.describe("Agente (Seller) Permissions Suite", () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "user"); // 'user' mapeia para o papel de Agente/Vendedor
  });

  test.describe("Bloqueio de Acesso e Mensagens Contextuais", () => {
    test("deve exibir mensagens exclusivas de Agente ao ser bloqueado em rota técnica", async ({ page }) => {
      const techRoute = "/admin/telemetria";
      await gotoAndSettle(page, techRoute);

      const alertContainer = page.locator('[role="alert"]');
      await expect(alertContainer).toBeVisible();

      // Valida Badge
      await expect(alertContainer.locator("text=Agente / Vendedor")).toBeVisible();

      // Valida Título (Strings de src/lib/access/access-denied-strings.tsx)
      await expect(alertContainer.locator("text=Esta área é exclusiva da equipe técnica")).toBeVisible();

      // Valida Intro e Hint
      await expect(alertContainer).toContainText("Como vendedor, você não precisa acessar páginas técnicas");
      await expect(alertContainer).toContainText("fale primeiro com o seu supervisor");

      // Valida CTA Contextual
      const ctaButton = alertContainer.locator('button:has-text("Voltar ao Catálogo")');
      await expect(ctaButton).toBeVisible();

      // Garante que mensagens de Supervisor NÃO vazaram para o Agente
      await expect(alertContainer).not.toContainText("Como supervisor");
      await expect(alertContainer).not.toContainText("Ir para Usuários");
    });

    test("não deve visualizar links administrativos ou técnicos na Sidebar", async ({ page }) => {
      await gotoAndSettle(page, "/");
      
      const forbiddenLinks = [
        "/admin/usuarios",
        "/admin/cadastros",
        "/admin/telemetria",
        "/admin/seguranca"
      ];

      for (const link of forbiddenLinks) {
        await expect(page.locator(`aside nav a[href="${link}"]`)).not.toBeVisible();
      }
    });

    test("valida identificador de segurança ofuscado para Agente e tratamento de erro amigável", async ({ page }) => {
      await gotoAndSettle(page, "/admin/workflows/invalid-id");
      
      await expect(page.locator("text=Identificador de Segurança")).toBeVisible();
      // Deve conter o padrão de hash REQ-XXXXXX
      await expect(page.locator(".font-mono")).toContainText(/REQ-[A-Z0-9]{3,}/);
      
      // Valida mensagem amigável exata
      await expect(page.locator("text=Esta área é exclusiva da equipe técnica")).toBeVisible();
      
      // Garante que o path real ou erros técnicos NÃO estão visíveis
      const fullText = await page.locator('[role="alert"]').innerText();
      expect(fullText).not.toContain("/admin/workflows");
      expect(fullText.toLowerCase()).not.toContain("exception");
    });
  });
});
