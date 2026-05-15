/**
 * Catálogo canônico de escopos de chaves MCP.
 *
 * Espelhado em `src/lib/mcp/scopes.ts` para consumo do frontend.
 * Mantenha os dois arquivos sincronizados.
 */

export const KNOWN_SCOPES = [
  "quotes:read",
  "orders:read",
  "crm:read",
  "products:read",
  "code:read",
  "code:write",
  "*",
] as const;

export type McpScope = (typeof KNOWN_SCOPES)[number];

export const FULL_SCOPE: McpScope = "*";

export function isFullAccess(scopes: readonly string[]): boolean {
  return scopes.includes(FULL_SCOPE);
}

export function areScopesValid(scopes: readonly string[]): boolean {
  if (scopes.length === 0) return false;
  return scopes.every((s) => (KNOWN_SCOPES as readonly string[]).includes(s));
}

/** Janela máxima de validade para uma chave full (180 dias em ms). */
export const FULL_SCOPE_MAX_TTL_MS = 180 * 24 * 60 * 60 * 1000;

/** Frase exata exigida no campo de confirmação ao emitir chave full. */
export const FULL_SCOPE_CONFIRMATION = "CONCEDER FULL";

/** Tamanho mínimo da justificativa para chaves full. */
export const FULL_SCOPE_MIN_JUSTIFICATION = 20;
