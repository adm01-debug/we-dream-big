/**
 * Structured Logger SSOT — Edge Functions
 * ----------------------------------------------------------------
 * Emite uma única linha JSON por evento (Logflare/Supabase Analytics
 * indexa direto). Inclui correlation-id (request_id), severity, função,
 * latência e quaisquer campos contextuais.
 *
 * Uso típico em uma edge function:
 *
 *   import { createStructuredLogger } from "../_shared/structured-logger.ts";
 *   import { getOrCreateRequestId } from "../_shared/request-id.ts";
 *
 *   Deno.serve(async (req) => {
 *     const requestId = getOrCreateRequestId(req);
 *     const log = createStructuredLogger({ fn: "minha-fn", requestId, req });
 *     log.info("request_start");
 *     try {
 *       // ... lógica ...
 *       log.info("request_ok", { rows: 42 });
 *       return log.respond(new Response(...));
 *     } catch (err) {
 *       log.error("request_failed", { err });
 *       return log.respond(new Response("error", { status: 500 }));
 *     }
 *   });
 *
 * As linhas saem assim:
 *   {"ts":"2026-...","level":"info","fn":"minha-fn","request_id":"...","event":"request_start","method":"POST","path":"/minha-fn","duration_ms":12,"status":200}
 */

import { REQUEST_ID_HEADER } from "./request-id.ts";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface StructuredLoggerInit {
  fn: string;
  requestId: string;
  req?: Request;
  /** Campos extras anexados a TODA linha emitida pelo logger. */
  base?: Record<string, unknown>;
}

export interface StructuredLogger {
  requestId: string;
  fn: string;
  /** Marca o início para cálculo de duration_ms. */
  startedAt: number;
  debug: (event: string, fields?: Record<string, unknown>) => void;
  info: (event: string, fields?: Record<string, unknown>) => void;
  warn: (event: string, fields?: Record<string, unknown>) => void;
  error: (event: string, fields?: Record<string, unknown>) => void;
  /** Adiciona request_id ao header de uma resposta e loga `request_end` com status+duration. */
  respond: (res: Response) => Response;
  /** Cria sub-logger com campos extras. */
  child: (extra: Record<string, unknown>) => StructuredLogger;
}

function serializeError(value: unknown): Record<string, unknown> {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack?.split("\n").slice(0, 5).join("\n"),
    };
  }
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return { value: String(value) };
}

function emit(
  level: LogLevel,
  fn: string,
  requestId: string,
  event: string,
  base: Record<string, unknown>,
  fields: Record<string, unknown> | undefined,
  startedAt: number,
): void {
  const line: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    fn,
    request_id: requestId,
    event,
    elapsed_ms: Date.now() - startedAt,
    ...base,
  };
  if (fields) {
    for (const [k, v] of Object.entries(fields)) {
      line[k] = k === "err" || k === "error" ? serializeError(v) : v;
    }
  }
  const out = JSON.stringify(line);
  switch (level) {
    case "warn":
      console.warn(out);
      break;
    case "error":
      console.error(out);
      break;
    default:
      console.log(out);
  }
}

export function createStructuredLogger(init: StructuredLoggerInit): StructuredLogger {
  const startedAt = Date.now();
  const base: Record<string, unknown> = { ...(init.base || {}) };
  if (init.req) {
    try {
      const u = new URL(init.req.url);
      base.method = init.req.method;
      base.path = u.pathname;
    } catch {
      // ignore
    }
  }

  const make = (extraBase: Record<string, unknown>): StructuredLogger => {
    const merged = { ...base, ...extraBase };
    const self: StructuredLogger = {
      requestId: init.requestId,
      fn: init.fn,
      startedAt,
      debug: (event, fields) => emit("debug", init.fn, init.requestId, event, merged, fields, startedAt),
      info: (event, fields) => emit("info", init.fn, init.requestId, event, merged, fields, startedAt),
      warn: (event, fields) => emit("warn", init.fn, init.requestId, event, merged, fields, startedAt),
      error: (event, fields) => emit("error", init.fn, init.requestId, event, merged, fields, startedAt),
      respond: (res: Response) => {
        const headers = new Headers(res.headers);
        if (!headers.has(REQUEST_ID_HEADER)) headers.set(REQUEST_ID_HEADER, init.requestId);
        const wrapped = new Response(res.body, { status: res.status, statusText: res.statusText, headers });
        const lvl: LogLevel = res.status >= 500 ? "error" : res.status >= 400 ? "warn" : "info";
        emit(lvl, init.fn, init.requestId, "request_end", merged, {
          status: res.status,
          duration_ms: Date.now() - startedAt,
        }, startedAt);
        return wrapped;
      },
      child: (extra) => make({ ...extraBase, ...extra }),
    };
    return self;
  };

  return make({});
}
