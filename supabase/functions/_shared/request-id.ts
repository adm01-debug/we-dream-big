/**
 * Helpers para o request-id (correlation-id) propagado pelo client
 * via header `X-Request-Id`. Usado pelas bridges para correlacionar
 * uma chamada do frontend com os logs estruturados das edge functions.
 */

export const REQUEST_ID_HEADER = "X-Request-Id";

/** Lê o request-id do header ou gera um novo. */
export function getOrCreateRequestId(req: Request): string {
  const incoming = req.headers.get(REQUEST_ID_HEADER) || req.headers.get("x-request-id");
  if (incoming && incoming.length >= 8 && incoming.length <= 128) return incoming;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback ultra-simples (boot só uma vez por isolate; aceitável).
  return `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Constrói um logger fininho que prefixa toda mensagem com [req_id=...]. */
export function makeRequestLogger(requestId: string) {
  const prefix = `[req_id=${requestId}]`;
  return {
    info: (...args: unknown[]) => console.log(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
  };
}

/** Mescla `request_id` em um body JSON (objeto). Não modifica originais. */
export function withRequestIdBody<T>(body: T, requestId: string): T & { request_id: string } {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return { ...(body as Record<string, unknown>), request_id: requestId } as T & { request_id: string };
  }
  // Se body não for objeto, devolve {data: body, request_id} — aceitável p/ casos raros.
  return { data: body, request_id: requestId } as unknown as T & { request_id: string };
}

/** Adiciona `X-Request-Id` aos headers de resposta. */
export function withRequestIdHeader(headers: HeadersInit | undefined, requestId: string): HeadersInit {
  const merged = new Headers(headers || {});
  merged.set(REQUEST_ID_HEADER, requestId);
  return merged;
}
