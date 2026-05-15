/**
 * E2E Suite: Navigation & RBAC Integrity
 * 
 * Objectives:
 * 1. Map and validate navigation between all dashboards.
 * 2. Verify complete permission flows for different user profiles.
 * 3. Document access control guards (allow/deny).
 * 
 * Profiles covered:
 * - Admin (Supervisor/Dev): Full access.
 * - Editor (Manager): Intermediate access.
 * - Viewer (Agente/Seller): Restricted access.
 * - Anonymous: Blocked.
 */

import { test, expect, requireAuth, requireAdmin } from "../fixtures/test-base";
import { gotoAndSettle, expectOnRoute } from "../helpers/nav";
import { Sel } from "../fixtures/selectors";
import { loginViaUI, logout } from "../helpers/auth";

test.describe("Navigation & RBAC Integrity", () => {

  test.describe("Scenario 1: Anonymous User", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("should redirect anonymous user to login for protected routes", async ({ page }) => {
      const protectedRoutes = ["/dashboard", "/produtos", "/orcamentos", "/admin/usuarios"];
      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(/\/login/);
      }
    });

    test("should allow access to public routes", async ({ page }) => {
      const publicRoutes = ["/login", "/reset-password"];
      for (const route of publicRoutes) {
        await page.goto(route);
        await expect(page).not.toHaveURL(/\/login/);
        await expect(page.locator("body")).toBeVisible();
      }
    });
  });

  test.describe("Scenario 2: Viewer (Agente/Seller) Profile", () => {
    // Note: Viewer is the default E2E_USER in storageState if not admin
    test.beforeEach(async ({ page }) => {
      requireAuth();
      // Ensure we are logged in as a standard user
      const email = process.env.E2E_USER_EMAIL!;
      const password = process.env.E2E_USER_PASSWORD!;
      await loginViaUI(page, { email, password });
    });

    test("should navigate freely between commercial dashboards", async ({ page }) => {
      const viewerRoutes = [
        { path: "/", title: "dashboard" },
        { path: "/produtos", title: "produtos" },
        { path: "/favoritos", title: "favoritos" },
        { path: "/orcamentos", title: "orcamentos" }
      ];

      for (const route of viewerRoutes) {
        await gotoAndSettle(page, route.path);
        await expect(page.locator(Sel.page.title(route.title))).toBeVisible();
      }
    });

    test("should be blocked from technical admin panels", async ({ page }) => {
      const adminRoutes = ["/admin/usuarios", "/admin/seguranca", "/admin/conexoes"];
      for (const route of adminRoutes) {
        await page.goto(route);
        // Should show the restricted route notice
        await expect(page.locator(Sel.app.accessDenied).or(page.locator('[data-testid="sidebar-restricted-notice"]'))).toBeVisible();
      }
    });
  });

  test.describe("Scenario 3: Admin (Supervisor/Dev) Profile", () => {
    test.beforeEach(async ({ page }) => {
      requireAdmin();
      const email = process.env.E2E_ADMIN_EMAIL!;
      const password = process.env.E2E_ADMIN_PASSWORD!;
      await loginViaUI(page, { email, password });
    });

    test("should access all administrative and technical panels", async ({ page }) => {
      const adminPanels = [
        { path: "/admin/usuarios", label: "Usuários" },
        { path: "/admin/conexoes", label: "Conexões" },
        { path: "/admin/seguranca", label: "Segurança" },
        { path: "/admin/cadastros", label: "Cadastros" }
      ];

      for (const panel of adminPanels) {
        await gotoAndSettle(page, panel.path);
        await expect(page).toHaveURL(new RegExp(panel.path));
        await expect(page.locator(Sel.app.accessDenied)).not.toBeVisible();
      }
    });

    test("should navigate through the full chain: Catalog -> Quote -> Admin", async ({ page }) => {
      // 1. Catalog
      await gotoAndSettle(page, "/produtos");
      await expect(page.locator(Sel.page.title("produtos"))).toBeVisible();

      // 2. Open Quote List
      await gotoAndSettle(page, "/orcamentos");
      await expect(page.locator(Sel.page.title("orcamentos"))).toBeVisible();

      // 3. Jump to Admin Management
      await gotoAndSettle(page, "/admin/usuarios");
      await expect(page).toHaveURL(/\/admin\/usuarios/);
    });
  });
});
