// supabase/functions/_shared/validate.ts
// Shared input validation utilities for edge functions

/**
 * Safely parse JSON from a Request body.
 * Returns null if body is empty or malformed — never throws.
 */
export async function safeParseBody<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Validate that required fields are present in the body.
 * Returns a descriptive error string if validation fails, null if OK.
 */
export function validateRequired(
  body: Record<string, unknown> | null,
  fields: string[]
): string | null {
  if (!body) return 'Request body is required';
  
  const missing = fields.filter(f => {
    const val = body[f];
    return val === undefined || val === null || val === '';
  });
  
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(', ')}`;
  }
  
  return null;
}

/**
 * Validate that a value is a non-empty string.
 */
export function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

/**
 * Validate that a value is a positive number.
 */
export function isPositiveNumber(val: unknown): val is number {
  return typeof val === 'number' && val > 0 && Number.isFinite(val);
}

/**
 * Create a JSON error response with proper headers.
 */
export function validationError(message: string, headers: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...headers },
    }
  );
}
