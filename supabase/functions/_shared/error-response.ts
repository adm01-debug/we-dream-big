/**
 * Unified error response builders for Edge Function input validation.
 *
 * V1 (legacy, 400):
 *   { error: "Validation failed", details: <fieldErrors-or-formErrors> }
 *   Byte-for-byte compatible with the previous behavior of
 *   `parseBodyWithSchema` in zod-validate.ts. Existing clients (n8n, etc.)
 *   keep working unchanged.
 *
 * V2 (new, 422, application/problem+json):
 *   {
 *     code: "validation_failed",
 *     message: "Request body failed schema validation",
 *     fields: [{ path: "product.sku", code: "invalid_type", message: "..." }],
 *   }
 *   Stable contract for new integrations. Inspired by RFC 7807 Problem Details.
 */

import { z } from "https://esm.sh/zod@3.23.8";

export interface V2ValidationField {
  path: string;
  code: string;
  message: string;
}

export interface V2ValidationErrorBody {
  code: "validation_failed";
  message: string;
  fields: V2ValidationField[];
}

const V2_CONTENT_TYPE = "application/problem+json";
const V2_DEFAULT_MESSAGE = "Request body failed schema validation";

/**
 * V1: legacy 400 response. Preserves the exact JSON shape produced by
 * `parseBodyWithSchema` before this change so n8n / external clients are not
 * impacted.
 */
export function buildV1ValidationError(
  err: z.ZodError,
  corsHeaders: Record<string, string>,
): Response {
  const flattened = err.flatten();
  const fieldErrors = flattened.fieldErrors;
  const formErrors = flattened.formErrors;
  return new Response(
    JSON.stringify({
      error: "Validation failed",
      details: Object.keys(fieldErrors).length > 0 ? fieldErrors : formErrors,
    }),
    {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * V2: new 422 problem+json response with structured `fields`.
 */
export function buildV2ValidationError(
  err: z.ZodError,
  corsHeaders: Record<string, string>,
  message: string = V2_DEFAULT_MESSAGE,
): Response {
  const fields: V2ValidationField[] = err.issues.map((issue) => ({
    path: issue.path.length === 0 ? "(root)" : issue.path.join("."),
    code: String(issue.code),
    message: issue.message,
  }));
  const body: V2ValidationErrorBody = {
    code: "validation_failed",
    message,
    fields,
  };
  return new Response(JSON.stringify(body), {
    status: 422,
    headers: { ...corsHeaders, "Content-Type": V2_CONTENT_TYPE },
  });
}

/**
 * V2 generic non-validation error (e.g. auth failure with structured shape).
 * Kept here so all v2 error shapes live in one place.
 */
export function buildV2Error(
  code: string,
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
  fields: V2ValidationField[] = [],
): Response {
  return new Response(
    JSON.stringify({ code, message, fields }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": V2_CONTENT_TYPE },
    },
  );
}
