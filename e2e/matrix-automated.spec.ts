/**
 * E2E: Matriz de Permissões Automatizada
 * 
 * Este arquivo utiliza a matriz de permissões definida em permissions-matrix.ts
 * para parametrizar e executar testes de acesso de forma escalável.
 */
import { test, expect } from "./fixtures/test-base";
import { loginAs, logout, Role as AuthRole } from "./helpers/auth";
import { gotoAndSettle } from "./helpers/nav";
import { PERMISSION_MATRIX, Role, resolvePaths } from "./fixtures/permissions-matrix";

test.describe("Matriz de Permissões Automatizada", () => {

  // Mapeamento de nomes de role da matriz para o helper loginAs
  const roleMap: Record<Exclude<Role, "publico">, AuthRole> = {
    agente: "user",
    supervisor: "admin",
    dev: "dev"
  };

  // Testa cada papel definido na matriz
  for (const [role, routes] of Object.entries(PERMISSION_MATRIX)) {
    test.describe(`Perfil: ${role}`, () => {
      
      test.beforeEach(async ({ page }) => {
        if (role === "publico") {
          await logout(page);
        } else {
          await loginAs(page, roleMap[role as keyof typeof roleMap]);
        }
      });

      // Testa cada rota para o papel atual
      for (const route of routes) {
        const actualPaths = resolvePaths(route);
        for (const actualPath of actualPaths) {
          test(`acesso a ${actualPath} deve resultar em ${route.expectedBehavior}`, async ({ page }) => {
            await gotoAndSettle(page, actualPath);

            switch (route.expectedBehavior) {
              case "allow":
                // 1. Não deve redirecionar para login
                await expect(page).not.toHaveURL(/\/login/);
                
                // 2. Deve estar na URL correta (ou dashboard se for root)
                if (actualPath !== "/") {
                  await expect(page).toHaveURL(new RegExp(actualPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
                }
                
                // 3. Não deve exibir nenhum componente de erro 403
                await expect(page.locator('[data-testid="app-access-denied"]')).not.toBeVisible();
                await expect(page.locator("text=Acesso restrito")).not.toBeVisible();
                break;

              case "deny_login":
                // 1. Deve redirecionar para a página 401 (Unauthorized)
                await expect(page).toHaveURL(/\/unauthorized/);
                
                // 2. Deve exibir o componente de não autorizado
                await expect(page.locator('[data-testid="app-unauthorized"]')).toBeVisible();
                break;

              case "deny_redirect_home":
                // 1. Deve redirecionar para a home (ProtectedRoute behavior)
                await expect(page).toHaveURL(/\/($|#)/);
                
                // 2. Não deve exibir erro 403 (redirecionamento silencioso)
                await expect(page.locator('[data-testid="app-access-denied"]')).not.toBeVisible();
                break;

              case "deny_403":
                // 1. Deve estar na URL correta (não deve redirecionar para home ou login)
                await expect(page).toHaveURL(new RegExp(actualPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

                // 2. Deve exibir a página de erro 403 (DevRoute behavior)
                const deniedContainer = page.locator('[data-testid="app-access-denied"]');
                await expect(deniedContainer).toBeVisible();
                
                // 3. Deve conter o status 403 e mensagem de acesso restrito
                await expect(deniedContainer).toContainText("403");
                await expect(deniedContainer).toContainText("Acesso restrito");
                
                // 4. Verificação de Dados Sensíveis (403): Ocultação total de internals
                const bodyText403 = await page.innerText('body');
                const forbidden403 = ["sql", "stack trace", "exception", "postgres", "supabase", "internal error", "dump", "at /", "line "];
                for (const term of forbidden403) {
                  expect(bodyText403.toLowerCase(), `Vazamento de dado técnico (403): ${term}`).not.toContain(term.toLowerCase());
                }
                
                // 5. Deve exibir o identificador de segurança ofuscado
                await expect(page.locator("text=Identificador de Segurança")).toBeVisible();

                // 5. NÃO deve exibir o layout de 404 indevidamente
                await expect(page.locator('[data-testid="app-not-found"]')).not.toBeVisible();
                
                // 6. Diferenciação 403 vs 404: A permissão é checada antes da existência do dado no DevRoute.
                // IDs inválidos em rotas proibidas devem resultar em 403.
                if (actualPath.includes('invalid') || actualPath.includes('auto')) {
                  await expect(deniedContainer).toContainText(/REQ-[A-Z0-9]{3,}/);
                }
                break;

              case "deny_404":
                // 1. Não deve redirecionar para login (específico para usuários logados)
                await expect(page, "Não deveria redirecionar para login em rota inexistente").not.toHaveURL(/\/login/);
                await expect(page, "Não deveria redirecionar para unauthorized em rota inexistente").not.toHaveURL(/\/unauthorized/);

                // 2. Deve mostrar o componente de NotFound com data-testid correto
                const notFoundContainer = page.locator('[data-testid="app-not-found"]');
                await expect(notFoundContainer, "Deveria exibir o layout de 404").toBeVisible();
                
                // 3. Validações de Acessibilidade e Conteúdo (SEO/A11y)
                // Deve haver um heading H1 claro informando o erro
                const h1_404 = notFoundContainer.locator('h1');
                await expect(h1_404).toBeVisible();
                await expect(h1_404).toContainText('404');
                
                // Texto amigável deve estar presente
                await expect(page.locator("text=Página não encontrada")).toBeVisible();

                // 4. Validação Visual / Snapshot (Consistência de Layout)
                // Usamos toHaveScreenshot para garantir que o layout 404 não degradou e está responsivo
                await expect(page).toHaveScreenshot('not-found-page.png', {
                  mask: [page.locator('code')], 
                  maxDiffPixelRatio: 0.1 
                });

                // 5. Não deve exibir o layout de erro 403 (RBAC) indevidamente
                await expect(page.locator('[data-testid="app-access-denied"]'), "Não deveria exibir layout de 403").not.toBeVisible();

                // 6. Verificação de Dados Sensíveis (404): Ocultação total de internals
                const bodyText404 = await page.innerText('body');
                const forbidden404 = ["sql", "stack trace", "exception", "postgres", "supabase", "internal error", "dump", "at /", "line "];
                for (const term of forbidden404) {
                  expect(bodyText404.toLowerCase(), `Vazamento de dado técnico (404): ${term}`).not.toContain(term.toLowerCase());
                }
                break;
            }
          });
        }
      }
    });
  }
});
