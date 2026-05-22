/**
 * api-errors.ts — Formato único de erro de validação 422.
 *
 * Antes deste módulo existiam respostas heterogêneas:
 *   - product-webhook:    400 { error: 'Validation failed', details: {...fieldErrors} }
 *   - webhook-dispatcher: 400 { error: 'Invalid body' }
 *   - webhook-inbound:    nenhuma (aceitava qualquer JSON após HMAC OK)
 *
 * Padrão único (RFC 7807-inspired, simplificado):
 *
 *   422 Unprocessable Entity
 *   {
 *     "code":    "VALIDATION_FAILED",
 *     "message": "Payload inválido para esta rota",
 *     "fields":  [
 *       { "path": "product.price", "message": "Number must be greater than or equal to 0" },
 *       { "path": "sku",           "message": "Required" }
 *     ]
 *   }
 *
 * Outros códigos previstos:
 *   - INVALID_JSON       → corpo da requisição não é JSON válido
 *   - EMPTY_BODY         → body vazio quando exigido
 *   - UNSUPPORTED_VERSION→ header/param de versão aponta para versão inexistente
 *   - DEPRECATED_VERSION → versão ainda funciona, mas retornar header Sunset
 */

// Carregar Zod do mesmo ponto que o helper compartilhado (esm.sh, Deno-friendly).
import { z } from "https://esm.sh/zod@3.23.8";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "INVALID_JSON"
  | "EMPTY_BODY"
  | "UNSUPPORTED_VERSION"
  | "DEPRECATED_VERSION";

export interface ApiFieldError {
  /** Caminho do campo em notação dot (ex: "product.images.0.url"). */
  path: string;
  /** Mensagem humana. */
  message: string;
  /** Código Zod opcional (ex: "invalid_type", "too_small"). */
  code?: string;
}

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  /** Sempre presente em VALIDATION_FAILED; array vazio caso contrário. */
  fields: ApiFieldError[];
  /** Versão da API resolvida (quando aplicável). */
  api_version?: string;
}

// ---------------------------------------------------------------------------
// Conversão de ZodError para fields[]
// ---------------------------------------------------------------------------

/**
 * Converte um ZodError em lista plana de `{path, message, code}`,
 * incluindo erros em arrays e objetos aninhados.
 *
 * Exemplo de saída para `{ images: [{ url: 123 }] }` violando `url`:
 *   [{ path: "images.0.url", message: "Expected string, received number", code: "invalid_type" }]
 */
export function zodErrorToFields(error: z.ZodError): ApiFieldError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length === 0 ? "(root)" : issue.path.map(String).join("."),
    message: issue.message,
    code: issue.code,
  }));
}

// ---------------------------------------------------------------------------
// Builders de Response
// ---------------------------------------------------------------------------

interface BuildOpts {
  corsHeaders: Record<string, string>;
  apiVersion?: string;
  extraHeaders?: Record<string, string>;
}

function jsonResponse(status: number, body: ApiErrorBody, opts: BuildOpts): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...opts.corsHeaders,
      ...(opts.extraHeaders ?? {}),
      "Content-Type": "application/json",
    },
  });
}

/** 422 — falha de schema. */
export function validationError422(
  error: z.ZodError,
  opts: BuildOpts & { message?: string }
): Response {
  const body: ApiErrorBody = {
    code: "VALIDATION_FAILED",
    message: opts.message ?? "Payload inválido para esta rota",
    fields: zodErrorToFields(error),
    api_version: opts.apiVersion,
  };
  return jsonResponse(422, body, opts);
}

/** 400 — JSON malformado (não é problema de schema; é parse). */
export function invalidJsonError400(opts: BuildOpts): Response {
  const body: ApiErrorBody = {
    code: "INVALID_JSON",
    message: "Body da requisição não é JSON válido",
    fields: [],
    api_version: opts.apiVersion,
  };
  return jsonResponse(400, body, opts);
}

/** 400 — body vazio quando schema exige conteúdo. */
export function emptyBodyError400(opts: BuildOpts): Response {
  const body: ApiErrorBody = {
    code: "EMPTY_BODY",
    message: "Body da requisição é obrigatório",
    fields: [],
    api_version: opts.apiVersion,
  };
  return jsonResponse(400, body, opts);
}

/** 400 — versão solicitada não existe. */
export function unsupportedVersionError400(
  requestedVersion: string,
  supportedVersions: readonly string[],
  opts: BuildOpts
): Response {
  const body: ApiErrorBody = {
    code: "UNSUPPORTED_VERSION",
    message: `Versão "${requestedVersion}" não suportada. Disponíveis: ${supportedVersions.join(", ")}`,
    fields: [],
  };
  return jsonResponse(400, body, opts);
}
