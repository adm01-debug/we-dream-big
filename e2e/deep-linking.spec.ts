/**
 * E2E: Deep Linking & Auth Flow Integrity
 * 
 * Valida o fluxo completo de acesso a rotas restritas:
 * 1. Tentativa de acesso deslogado -> Redirecionamento para /unauthorized
 * 2. Unauthorized -> Login -> Redirecionamento de volta para a rota original (Deep Link)
 * 
 * Cobre múltiplos papéis para garantir que as permissões sejam respeitadas pós-login.
 */
import { test, expect } from "./fixtures/test-base";
import { loginAs, logout, Role as AuthRole } from "./helpers/auth";
import { gotoAndSettle } from "./helpers/nav";

test.describe("Deep Linking & Auth Flow Integrity", () => {

  const scenarios = [
    { role: "user" as AuthRole, target: "/produtos", label: "Agente acessando Catálogo" },
    { role: "editor" as AuthRole, target: "/admin/usuarios", label: "Editor acessando Gestão de Usuários" },
    { role: "dev" as AuthRole, target: "/admin/telemetria", label: "Dev acessando Telemetria" },
  ];

  for (const scenario of scenarios) {
    test(`Fluxo completo: ${scenario.label}`, async ({ page }) => {
      // 1. Garante que está deslogado
      await logout(page);

      // 2. Tenta acessar a rota restrita diretamente
      await page.goto(scenario.target);

      // 3. Deve ser interceptado pelo ProtectedRoute e enviado para /unauthorized
      await expect(page, "Deveria redirecionar para /unauthorized").toHaveURL(/\/unauthorized/);
      await expect(page.locator('[data-testid="app-unauthorized"]')).toBeVisible();

      // 4. Clica em "Ir para o Login"
      await page.locator('button:has-text("Ir para o Login")').click();
      await expect(page).toHaveURL(/\/login/);

      // 5. Realiza o login com o papel correspondente
      // O helper loginAs já faz o login via UI se detectar que está na tela de login
      await loginAs(page, scenario.role);

      // 6. Deve redirecionar automaticamente para a rota original (scenario.target)
      // Usamos regex para lidar com possíveis query params ou hashes
      await expect(page, `Deveria retornar para a rota original: ${scenario.target}`).toHaveURL(new RegExp(scenario.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      
      // 7. Garante que a página carregou corretamente e não há erro 403
      await expect(page.locator('[data-testid="app-access-denied"]')).not.toBeVisible();
    });
  }

  test("tentativa de acesso a rota proibida para o papel mesmo via deep link", async ({ page }) => {
    // 1. Deslogado tenta acessar rota técnica (exclusiva Dev)
    await logout(page);
    const techRoute = "/admin/telemetria";
    await page.goto(techRoute);

    // 2. Vai para /unauthorized -> Login
    await expect(page).toHaveURL(/\/unauthorized/);
    await page.locator('button:has-text("Ir para o Login")').click();

    // 3. Loga como Agente (que NÃO tem acesso a essa rota)
    await loginAs(page, "user");

    // 4. O app tenta redirecionar para /admin/telemetria, mas o DevRoute deve bloquear
    // E exibir a página 403 contextual para Agente
    await expect(page.locator('[data-testid="app-access-denied"]')).toBeVisible();
    await expect(page.locator("text=Agente / Vendedor")).toBeVisible();
    await expect(page.locator("text=Esta área é exclusiva da equipe técnica")).toBeVisible();
  });
});
