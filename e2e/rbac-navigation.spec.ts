/**
 * E2E: Role-Based Access Control (RBAC) & Navigation
 * 
 * Valida que diferentes perfis de usuário possuem acesso restrito aos painéis
 * e funcionalidades designados, conforme a matriz de permissões.
 */
import { test, expect } from "./fixtures/test-base";
import { loginAs, logout } from "./helpers/auth";
import { gotoAndSettle } from "./helpers/nav";

test.describe("RBAC & Navigation Integrity", () => {
  
  test.describe("Perfil: Agente (User)", () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, "user");
    });

    test("deve acessar painéis básicos de vendas", async ({ page }) => {
      const allowedRoutes = ["/produtos", "/orcamentos", "/favoritos"];
      for (const route of allowedRoutes) {
        await gotoAndSettle(page, route);
        await expect(page).not.toHaveURL(/\/login/);
        // Verifica se não foi redirecionado para a home (o que indicaria bloqueio silencioso)
        if (route !== "/") {
          expect(page.url()).toContain(route);
        }
      }
    });

    test("deve ser bloqueado ao acessar áreas administrativas (Supervisor)", async ({ page }) => {
      const forbiddenRoutes = ["/admin/usuarios", "/admin/cadastros", "/admin/permissoes"];
      for (const route of forbiddenRoutes) {
        await gotoAndSettle(page, route);
        // O comportamento esperado é o redirecionamento para a home ou exibição de 403
        // De acordo com ProtectedRoute.tsx, redireciona para "/"
        await expect(page).toHaveURL(/\/($|#)/); 
      }
    });

    test("deve ser bloqueado ao acessar áreas técnicas (Dev)", async ({ page }) => {
      const techRoutes = ["/admin/telemetria", "/admin/seguranca", "/admin/workflows"];
      for (const route of techRoutes) {
        await gotoAndSettle(page, route);
        // DevRoute redireciona para "/" ou mostra DevAccessDeniedPage
        // No caso de Agente, o DevRoute redireciona ou mostra erro.
        // Vamos validar que ele não está na rota técnica.
        expect(page.url()).not.toContain(route);
      }
    });
  });

  test.describe("Perfil: Supervisor (Admin)", () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, "admin");
    });

    test("deve acessar painéis administrativos de negócio", async ({ page }) => {
      const adminRoutes = ["/admin/usuarios", "/admin/cadastros"];
      for (const route of adminRoutes) {
        await gotoAndSettle(page, route);
        await expect(page).toHaveURL(new RegExp(route));
      }
    });

    test("deve ser bloqueado ao acessar áreas técnicas restritas a Dev", async ({ page }) => {
      const techRoutes = ["/admin/telemetria", "/admin/seguranca"];
      for (const route of techRoutes) {
        await gotoAndSettle(page, route);
        // Supervisor deve ver a DevAccessDeniedPage ou ser redirecionado
        // De acordo com DevRoute.tsx, ele exibe a DevAccessDeniedPage
        await expect(page.locator("text=Acesso restrito")).toBeVisible();
        await expect(page.locator("text=Área exclusiva da equipe técnica")).toBeVisible();
      }
    });
  });

  test.describe("Perfil: Dev", () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, "dev");
    });

    test("deve acessar absolutamente todos os painéis, incluindo técnicos", async ({ page }) => {
      const allRoutes = [
        "/produtos",
        "/admin/usuarios",
        "/admin/telemetria",
        "/admin/seguranca",
        "/admin/workflows"
      ];
      for (const route of allRoutes) {
        await gotoAndSettle(page, route);
        await expect(page).toHaveURL(new RegExp(route));
        // Garante que não apareceu a tela de acesso negado
        await expect(page.locator("text=Acesso restrito")).not.toBeVisible();
      }
    });
  });

  test.describe("Fluxos de Login e Redirecionamento", () => {
    test("redireciona para a página pretendida após login (Deep Linking)", async ({ page }) => {
      await logout(page);
      const targetPath = "/orcamentos/novo";
      await page.goto(targetPath);
      
      // Deve estar na tela de login com state.from preservado (implícito no redirect do ProtectedRoute)
      await expect(page).toHaveURL(/\/login/);
      
      // Faz login manual para testar o fluxo de retorno
      const email = process.env.E2E_USER_EMAIL!;
      const password = process.env.E2E_USER_PASSWORD!;
      
      if (email && password) {
        await page.locator('input[type="email"]').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.locator('button[type="submit"]').click();
        
        // Deve redirecionar de volta para a rota original
        await expect(page).toHaveURL(new RegExp(targetPath), { timeout: 15000 });
      } else {
        test.skip(true, "Credenciais ausentes para teste de Deep Linking");
      }
    });

    test("tentativa de acesso direto a rota admin por usuário deslogado", async ({ page }) => {
      await logout(page);
      await page.goto("/admin/usuarios");
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
