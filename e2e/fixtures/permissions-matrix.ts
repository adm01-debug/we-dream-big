/**
 * Matriz de Permissões SSOT (Single Source of Truth) para testes E2E.
 * Mapeia papéis (roles) para rotas e comportamentos esperados.
 */

export type Role = "agente" | "supervisor" | "dev" | "publico";

export interface PermissionRoute {
  path: string;
  /** Permite testar rotas com parâmetros. Pode ser um objeto simples ou um array de objetos. */
  params?: Record<string, string> | Record<string, string>[];
  expectedBehavior: "allow" | "deny_redirect_home" | "deny_403" | "deny_login" | "deny_404";
}

/** Helper para resolver os paths reais substituindo parâmetros. Retorna um array para suportar múltiplos valores. */
export function resolvePaths(route: PermissionRoute): string[] {
  const paramsArray = Array.isArray(route.params) 
    ? route.params 
    : [route.params || {}];

  return paramsArray.map(params => {
    let finalPath = route.path;
    for (const [key, value] of Object.entries(params)) {
      finalPath = finalPath.split(`:${key}`).join(value);
    }
    return finalPath;
  });
}

// Definições de rotas base para evitar repetição
const BASE_ROUTES = {
  PUBLIC: [
    { path: "/login", expectedBehavior: "allow" },
    { path: "/produtos", expectedBehavior: "deny_login" },
    { path: "/orcamentos/:id", params: [{ id: "std-quote-789" }, { id: "another-quote-456" }], expectedBehavior: "deny_login" },
    { path: "/admin/usuarios", expectedBehavior: "deny_login" },
  ] as PermissionRoute[],
  
  COMMERCIAL: [
    { path: "/produtos", expectedBehavior: "allow" },
    { path: "/orcamentos", expectedBehavior: "allow" },
    { path: "/orcamentos/:id", params: { id: "std-quote-789" }, expectedBehavior: "allow" },
    { path: "/orcamentos/:id/editar", params: { id: "std-quote-789" }, expectedBehavior: "allow" },
    { path: "/orcamentos/:id/itens/:itemId", params: { id: "std-quote-789", itemId: "std-item-456" }, expectedBehavior: "allow" },
  ] as PermissionRoute[],

  ADMIN_BUSINESS: [
    { path: "/admin/usuarios", expectedBehavior: "allow" },
    { path: "/admin/cadastros", expectedBehavior: "allow" },
    { path: "/admin/cadastros/produto/:id", params: { id: "std-prod-123" }, expectedBehavior: "allow" },
    { path: "/admin/cadastros/produto/:id/variante/:variantId", params: { id: "std-prod-123", variantId: "std-var-001" }, expectedBehavior: "allow" },
  ] as PermissionRoute[],

  ADMIN_TECH: [
    { path: "/admin/telemetria", expectedBehavior: "allow" },
    { path: "/admin/seguranca", expectedBehavior: "allow" },
    { path: "/admin/workflows", expectedBehavior: "allow" },
  ] as PermissionRoute[],
};

// Construtor da matriz final aplicando políticas de acesso
export const PERMISSION_MATRIX: Record<Role, PermissionRoute[]> = {
  publico: [
    ...BASE_ROUTES.PUBLIC,
    { path: "/admin/cadastros/produto/:id/variante/:variantId", params: { id: "std-prod-123", variantId: "std-var-001" }, expectedBehavior: "deny_login" },
    { path: "/orcamentos/:id/itens/:itemId", params: { id: "non-existent-777", itemId: "invalid-item-999" }, expectedBehavior: "deny_login" },
  ],

  agente: [
    ...BASE_ROUTES.COMMERCIAL,
    { path: "/admin/usuarios", expectedBehavior: "deny_redirect_home" },
    { path: "/admin/cadastros", expectedBehavior: "deny_redirect_home" },
    { path: "/admin/telemetria", expectedBehavior: "deny_403" },
    { path: "/rota-fantasma", expectedBehavior: "deny_404" },
    { path: "/orcamentos/:id", params: { id: "inexistente-123" }, expectedBehavior: "deny_404" },
  ],

  supervisor: [
    ...BASE_ROUTES.COMMERCIAL,
    ...BASE_ROUTES.ADMIN_BUSINESS,
    { path: "/admin/telemetria", expectedBehavior: "deny_403" },
    { path: "/admin/telemetria/:id", params: { id: "invalid-id-123" }, expectedBehavior: "deny_403" },
    { path: "/admin/non-existent-area", expectedBehavior: "deny_404" },
  ],

  dev: [
    ...BASE_ROUTES.COMMERCIAL,
    ...BASE_ROUTES.ADMIN_BUSINESS,
    ...BASE_ROUTES.ADMIN_TECH,
  ],
};
