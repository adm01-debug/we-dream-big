/**
 * Helpers para registrar entradas em `admin_audit_log` com os
 * campos enriquecidos (request_id, started_at/finished_at,
 * duration_ms, status, payload_summary, source).
 *
 * - `redactPayload` remove segredos antes de salvar.
 * - `summarizePayload` produz uma versão estruturada e curta.
 * - `writeAuditEntry` insere a linha usando o cliente service-role.
 */

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

/** Chaves cujo valor NUNCA pode ser persistido em texto puro. */
const SENSITIVE_KEYS = new Set([
  "key",
  "plain",
  "plain_key",
  "secret",
  "password",
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "apikey",
  "service_role_key",
  "authorization",
  "key_hash",
  "hash",
]);

/** Trunca strings longas e marca o tamanho original. */
function truncateString(value: string, max = 240): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…(+${value.length - max} chars)`;
}

/**
 * Remove/redige campos sensíveis recursivamente. Mantém estrutura
 * para que o auditor consiga ver QUE havia algo, sem expor o valor.
 */
export function redactPayload(input: unknown, depth = 0): unknown {
  if (depth > 6) return "[max_depth]";
  if (input === null || input === undefined) return input;
  if (typeof input === "string") return truncateString(input);
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (Array.isArray(input)) {
    return input.slice(0, 50).map((v) => redactPayload(v, depth + 1));
  }
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        if (typeof v === "string" && v.length > 0) {
          out[k] = `[redacted:${v.length}chars]`;
        } else {
          out[k] = "[redacted]";
        }
        continue;
      }
      out[k] = redactPayload(v, depth + 1);
    }
    return out;
  }
  return "[unsupported]";
}

/**
 * Gera um resumo estruturado: contagem de campos, lista das chaves
 * presentes (para diff rápido) e o payload já redigido (limitado).
 */
export function summarizePayload(payload: unknown): Record<string, unknown> {
  if (payload === null || payload === undefined) {
    return { present: false };
  }
  if (typeof payload !== "object" || Array.isArray(payload)) {
    return { present: true, kind: Array.isArray(payload) ? "array" : typeof payload, value: redactPayload(payload) };
  }
  const obj = payload as Record<string, unknown>;
  const keys = Object.keys(obj);
  return {
    present: true,
    kind: "object",
    field_count: keys.length,
    fields: keys,
    redacted: redactPayload(obj),
  };
}

export interface AuditEntryInput {
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  /** Detalhes ricos (legado) — continuam funcionando. */
  details?: Record<string, unknown>;
  /** Campos novos (Wave de hardening). */
  request_id: string;
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
  status: "success" | "error" | "denied" | "partial";
  payload_summary?: Record<string, unknown>;
  source: string;
}

/**
 * Insere uma entrada enriquecida em `admin_audit_log` com o cliente
 * service-role já autenticado. Falhas de log são silenciadas (warn)
 * para nunca derrubar a operação principal.
 */
export async function writeAuditEntry(
  admin: SupabaseAdmin,
  entry: AuditEntryInput,
): Promise<void> {
  try {
    const finished = entry.finished_at ?? new Date().toISOString();
    const duration =
      entry.duration_ms ??
      Math.max(0, new Date(finished).getTime() - new Date(entry.started_at).getTime());

    await admin.from("admin_audit_log").insert({
      user_id: entry.user_id,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      ip_address: entry.ip_address ?? null,
      user_agent: entry.user_agent ?? null,
      details: entry.details ?? {},
      request_id: entry.request_id,
      started_at: entry.started_at,
      finished_at: finished,
      duration_ms: duration,
      status: entry.status,
      payload_summary: entry.payload_summary ?? {},
      source: entry.source,
    });
  } catch (err) {
    console.warn("[audit-log] failed to write entry:", err instanceof Error ? err.message : err);
  }
}

/** Extrai IP/UA do request de forma consistente. */
export function extractRequestMeta(req: Request): { ip: string | null; ua: string | null } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    null;
  const ua = req.headers.get("user-agent") ?? null;
  return { ip, ua };
}
