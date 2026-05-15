/**
 * Helper para registrar tentativas bloqueadas de acesso a chaves MCP.
 * Dispara `record_mcp_access_violation` no banco, que por sua vez
 * verifica o threshold de abuso e gera alertas para admins.
 *
 * Falhas de log são silenciadas para nunca derrubar o caminho de erro.
 */

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

export type McpViolationReason =
  | "missing_jwt"
  | "invalid_jwt"
  | "not_admin"
  | "stepup_missing"
  | "stepup_invalid"
  | "stepup_consume_failed"
  | "rate_limited"
  | "validation_failed"
  | "unauthorized_direct_write"
  | "other";

export interface RecordMcpViolationInput {
  userId: string | null;
  reason: McpViolationReason;
  source: string;        // ex: "mcp-keys-issue"
  operation?: string | null; // ex: "issue" | "rotate" | "revoke" | "update"
  targetKeyId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  details?: Record<string, unknown>;
}

export async function recordMcpViolation(
  admin: SupabaseAdmin,
  input: RecordMcpViolationInput,
): Promise<void> {
  try {
    await admin.rpc("record_mcp_access_violation", {
      _user_id: input.userId,
      _reason: input.reason,
      _source: input.source,
      _operation: input.operation ?? null,
      _target_key_id: input.targetKeyId ?? null,
      _ip: input.ip ?? null,
      _user_agent: input.userAgent ?? null,
      _request_id: input.requestId ?? null,
      _details: input.details ?? {},
    });
  } catch (err) {
    console.warn(
      "[mcp-violations] failed to record:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Mapeia um motivo livre (string usada no audit log) para um McpViolationReason
 * estável. Mantém todos os reasons centralizados.
 */
export function mapViolationReason(rawReason: unknown): McpViolationReason {
  const r = typeof rawReason === "string" ? rawReason : "";
  switch (r) {
    case "unauthenticated": return "missing_jwt";
    case "invalid_jwt": return "invalid_jwt";
    case "not_dev":
    case "not_admin":
    case "full_grant_forbidden":
      return "not_admin";
    case "step_up_required": return "stepup_missing";
    case "step_up_invalid": return "stepup_invalid";
    case "validation_failed": return "validation_failed";
    default: return "other";
  }
}
