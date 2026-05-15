/**
 * E2E: Validação de Navegação no Nível de UI (RBAC Visual)
 * 
 * Este teste utiliza a matriz de permissões para garantir que links e menus
 * sejam exibidos ou ocultados corretamente na interface do usuário (Sidebar/Header),
 * prevenindo que usuários vejam atalhos para áreas que não possuem permissão.
 */
import { test, expect } from "./fixtures/test-base";
import { loginAs, logout, Role as AuthRole } from "./helpers/auth";
import { gotoAndSettle } from "./helpers/nav";
import { PERMISSION_MATRIX, Role, resolvePaths } from "./fixtures/permissions-matrix";

test.describe("RBAC Visual - Visibilidade de Menus e Links", () => {

  const roleMap: Record<Exclude<Role, "publico">, AuthRole> = {
    agente: "user",
    supervisor: "admin",
    dev: "dev"
  };

  for (const [role, routes] of Object.entries(PERMISSION_MATRIX)) {
    test.describe(`Perfil: ${role}`, () => {
      
      test.beforeEach(async ({ page }) => {
        if (role === "publico") {
          await logout(page);
        } else {
          await loginAs(page, roleMap[role as keyof typeof roleMap]);
        }
        await gotoAndSettle(page, "/");
      });

      // Testa cada rota para o papel atual
      for (const route of routes) {
        // Ignoramos rotas que não são naturais de menu (como IDs específicos ou rotas inexistentes)
        // ou rotas públicas básicas. Focamos em caminhos de "base" para validar a UI.
        const isMenuCandidate = route.path.startsWith('/') && !route.path.includes(':') && !route.path.includes('fantasma');
        
        if (!isMenuCandidate) continue;

        test(`link para ${route.path} deve estar ${route.expectedBehavior === 'allow' ? 'VISÍVEL' : 'OCULTO'}`, async ({ page }) => {
          // No SidebarReorganized, os links são renderizados dentro de uma tag nav.
          // O seletor abaixo busca links especificamente na sidebar para evitar falso-positivos de links no conteúdo.
          const navigationLink = page.locator(`aside nav a[href="${route.path}"]`).first();

          if (route.expectedBehavior === "allow") {
            // Se permitido, o link DEVE estar visível.
            // Usamos assert personalizado para fornecer mensagem clara em caso de falha.
            await expect(navigationLink, `O link para a rota '${route.path}' deveria estar visível na sidebar para o perfil '${role}'`).toBeVisible({ timeout: 15000 });
          } else {
            // Se negado, o link NÃO deve estar visível no menu.
            await expect(navigationLink, `O link para a rota '${route.path}' NÃO deveria estar visível na sidebar para o perfil '${role}'`).not.toBeVisible({ timeout: 10000 });
          }
        });
      }
    });
  }
});
