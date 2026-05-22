/**
 * Shared Zod validation utilities for edge functions.
 * Provides type-safe request body parsing with clear error messages.
 *
 * Two parsers are exposed:
 *   - parseBodyWithSchema  → legacy 400 / {error,details}. Used by ~40 functions.
 *   - parseBodyVersioned   → path-versioned (v1=legacy 400, v2=422 problem+json).
 *     Use for new webhooks and for any function migrating to v2.
 */

// Using Zod from esm.sh for Deno compatibility
export { z } from "https://esm.sh/zod@3.23.8";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  buildV1ValidationError,
  buildV2ValidationError,
} from "./error-response.ts";
import {
  resolveVersion,
  type ContractVersion,
  VERSION_SERVED_HEADER,
} from "./version-dispatch.ts";

/**
 * Parse and validate a request body against a Zod schema.
 * Returns parsed data on success, or a 400 Response on failure.
 */
export async function parseBodyWithSchema<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
  corsHeaders: Record<string, string>
): Promise<{ data: z.infer<T> } | { error: Response }> {
  let rawBody: unknown;
  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      return {
        error: new Response(
          JSON.stringify({ error: 'Request body is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        ),
      };
    }
    rawBody = JSON.parse(text);
  } catch {
    return {
      error: new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  const result = schema.safeParse(rawBody);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    const formErrors = result.error.flatten().formErrors;
    return {
      error: new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: Object.keys(fieldErrors).length > 0 ? fieldErrors : formErrors,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { data: result.data };
}

/**
 * Parse and validate a request body against version-specific schemas.
 *
 * Dispatches based on URL path (`/v1` or `/v2`) — see version-dispatch.ts.
 * On failure, returns the appropriate error shape for the requested version:
 *   - v1: 400 with {error,details} (back-compat)
 *   - v2: 422 with {code,message,fields} (problem+json)
 *
 * The returned `version` field allows handlers to adapt v1 data to the
 * canonical v2 shape so business logic stays single-implementation.
 */
export async function parseBodyVersioned<
  S1 extends z.ZodTypeAny,
  S2 extends z.ZodTypeAny,
>(
  req: Request,
  schemas: { v1: S1; v2: S2 },
  corsHeaders: Record<string, string>,
): Promise<
  | { data: z.infer<S1> | z.infer<S2>; version: ContractVersion }
  | { error: Response; version: ContractVersion }
> {
  const version = resolveVersion(req);
  const corsWithVersion = { ...corsHeaders, [VERSION_SERVED_HEADER]: version };

  let rawBody: unknown;
  try {
    const text = await req.text();
    if (!text || text.trim() === "") {
      const emptyBody = makeEmptyBodyError(version, corsWithVersion);
      return { error: emptyBody, version };
    }
    rawBody = JSON.parse(text);
  } catch {
    const invalidJson = makeInvalidJsonError(version, corsWithVersion);
    return { error: invalidJson, version };
  }

  const schema = version === "v2" ? schemas.v2 : schemas.v1;
  const result = schema.safeParse(rawBody);
  if (!result.success) {
    const errResponse = version === "v2"
      ? buildV2ValidationError(result.error, corsWithVersion)
      : buildV1ValidationError(result.error, corsWithVersion);
    return { error: errResponse, version };
  }

  return { data: result.data, version };
}

function makeEmptyBodyError(
  version: ContractVersion,
  corsHeaders: Record<string, string>,
): Response {
  if (version === "v2") {
    return new Response(
      JSON.stringify({
        code: "empty_body",
        message: "Request body is required",
        fields: [],
      }),
      {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
      },
    );
  }
  return new Response(
    JSON.stringify({ error: "Request body is required" }),
    {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

function makeInvalidJsonError(
  version: ContractVersion,
  corsHeaders: Record<string, string>,
): Response {
  if (version === "v2") {
    return new Response(
      JSON.stringify({
        code: "invalid_json",
        message: "Invalid JSON in request body",
        fields: [],
      }),
      {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/problem+json" },
      },
    );
  }
  return new Response(
    JSON.stringify({ error: "Invalid JSON in request body" }),
    {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ========== Common reusable schemas ==========

/** UUID v4 string */
export const uuidSchema = z.string().uuid();

/** Non-empty trimmed string */
export const nonEmptyString = z.string().trim().min(1, 'Cannot be empty');

/** Positive integer */
export const positiveInt = z.number().int().positive();

/** Non-negative number (for prices, quantities) */
export const nonNegativeNumber = z.number().nonnegative();

/** Email */
export const emailSchema = z.string().email().max(255);

/** Token (hex string, 64 chars) */
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Invalid token format');

/** Base64 or URL image */
export const imageInputSchema = z.string().min(10).max(10_000_000);

/** Pagination */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(500).default(50),
}).partial();
