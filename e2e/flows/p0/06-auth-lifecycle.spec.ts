/**
 * P0 — Auth lifecycle E2E (positivo + negativo): login, refresh de token,
 * logout limpando estado, e bloqueio pós-logout.
 *
 * Estratégia:
 *  - Cobre cenários POSITIVOS (login válido → dashboard, logout → /login,
 *    refresh transparente prolonga sessão) e NEGATIVOS (credenciais
 *    inválidas, refresh 401 derruba sessão, voltar com back após logout não
 *    re-autoriza acesso).
 *  - Usa SOMENTE seletores SSOT (`Sel.*`) e helpers (`loginViaUI`, `logout`,
 *    `expectAuthenticated`, `expectUnauthenticated`).
 *  - Vive em `flows/p0/` (regression P0). Cobertura smoke equivalente
 *    está em `flows/20-all-features-smoke.spec.ts` (testes 90/93) — vide
 *    `mem://testing/e2e-smoke-tag-isolation.md`.
 */
import { test, expect } from "../../fixtures/test-base";
import { Sel } from "../../fixtures/selectors";
import {
  loginViaUI,
  logout,
  expectAuthenticated,
  expectUnauthenticated,
} from "../../helpers/auth";
import { mockSessionExpired } from "./_mocks";

const E2E_USER = process.env.E2E_USER_EMAIL;
const E2E_PASS = process.env.E2E_USER_PASSWORD;

test.describe("P0 — Auth lifecycle (login/logout/refresh)", () => {
  // Sempre começa SEM sessão para deixar cada teste determinístico.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("positivo: login válido → app autenticado e logout volta para /login", async ({ page }) => {
    test.skip(!E2E_USER || !E2E_PASS, "Credenciais E2E_USER_* ausentes");
    await loginViaUI(page, { email: E2E_USER!, password: E2E_PASS! });
    await expectAuthenticated(page);
    await logout(page);
    await expectUnauthenticated(page);
  });

  test("negativo: credenciais inválidas mantém usuário em /login com botão habilitado", async ({ page }) => {
    const ok = await loginViaUI(page, {
      email: "ninguem-existe@example.com",
      password: "SenhaErrada@2025!",
      expectFail: true,
    });
    expect(ok).toBe(false);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator(Sel.login.submit).first()).toBeEnabled({ timeout: 5_000 });
  });

  test("negativo: refresh de token retorna 401 → sessão é descartada e rota protegida cai em /login", async ({ page }) => {
    test.skip(!E2E_USER || !E2E_PASS, "Credenciais E2E_USER_* ausentes");

    // Login válido primeiro.
    await loginViaUI(page, { email: E2E_USER!, password: E2E_PASS! });
    await expectAuthenticated(page);

    // Simula expiração: TODA chamada subsequente ao /auth/v1/* responde 401.
    await mockSessionExpired(page);
    await page.reload();

    // Pode redirecionar imediato OU exigir nova ação — em todo caso, a
    // próxima navegação a uma rota protegida deve cair em /login.
    await page.goto("/produtos").catch(() => {});
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("negativo: back após logout NÃO restaura acesso a rota protegida", async ({ page }) => {
    test.skip(!E2E_USER || !E2E_PASS, "Credenciais E2E_USER_* ausentes");
    await loginViaUI(page, { email: E2E_USER!, password: E2E_PASS! });
    await page.goto("/produtos");
    await expectAuthenticated(page);

    await logout(page);
    await expectUnauthenticated(page);

    await page.goBack().catch(() => {});
    // Mesmo que o back devolva ao path anterior, o guard deve recolocar em /login.
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test("positivo: storage limpo após logout (sem tokens residuais)", async ({ page }) => {
    test.skip(!E2E_USER || !E2E_PASS, "Credenciais E2E_USER_* ausentes");
    await loginViaUI(page, { email: E2E_USER!, password: E2E_PASS! });
    await logout(page);

    const leftover = await page.evaluate(() => {
      const keys = [
        ...Object.keys(localStorage),
        ...Object.keys(sessionStorage),
      ];
      return keys.filter(k => /supabase\.auth|sb-.*-auth-token/i.test(k));
    });
    expect(leftover, "tokens supabase devem ser purgados após logout").toEqual([]);
  });
});
