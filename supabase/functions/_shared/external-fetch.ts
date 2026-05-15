/**
 * Wrapper resiliente para fetch a APIs externas com circuit breaker integrado.
 *
 * Uso:
 *   import { fetchWithBreaker } from "../_shared/external-fetch.ts";
 *   const res = await fetchWithBreaker("bitrix", "https://api.bitrix.com/...", { method: "POST" });
 *
 * Hardening defensivo:
 * - Rejeita URLs sem `https://` (anti-SSRF). Em testes locais, `ALLOW_HTTP_FETCH=1` libera HTTP.
 * - Falhas HTTP 5xx/network contam como falha; 2xx/3xx/4xx contam como sucesso.
 * - Se circuito OPEN, lança `CircuitOpenError` imediatamente.
 */
import { getBreaker } from "./circuit-breaker.ts";

export class CircuitOpenError extends Error {
  constructor(public service: string) {
    super(`circuit_open:${service}`);
    this.name = "CircuitOpenError";
  }
}

export class InsecureUrlError extends Error {
  constructor(public url: string) {
    super(`insecure_url:${url}`);
    this.name = "InsecureUrlError";
  }
}

function assertSecureUrl(url: string | URL): void {
  const allowHttp = Deno.env.get("ALLOW_HTTP_FETCH") === "1";
  const u = typeof url === "string" ? url : url.toString();
  if (allowHttp) return;
  if (!u.startsWith("https://")) {
    throw new InsecureUrlError(u);
  }
}

export async function fetchWithBreaker(
  service: string,
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  assertSecureUrl(url);

  const breaker = getBreaker(service);
  if (!breaker.canRequest()) {
    throw new CircuitOpenError(service);
  }

  try {
    const res = await fetch(url, init);
    if (res.status >= 500) {
      breaker.recordFailure();
    } else {
      breaker.recordSuccess();
    }
    return res;
  } catch (err) {
    breaker.recordFailure();
    throw err;
  }
}

/**
 * Helper para responder 503 + Retry-After quando circuito aberto.
 * Use em catch blocks: `if (err instanceof CircuitOpenError) return circuitOpenResponse(err, corsHeaders);`
 */
export function circuitOpenResponse(
  err: CircuitOpenError,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Service temporarily unavailable",
      service: err.service,
      retry_after_seconds: 60,
    }),
    {
      status: 503,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    },
  );
}
