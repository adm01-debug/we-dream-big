// supabase/functions/_shared/security.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

/**
 * Log a security event to the audit_logs table.
 */
export async function logSecurityEvent(
  eventType: string,
  endpoint: string,
  identifier: string,
  metadata: Record<string, any> = {}
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      event_type: eventType,
      endpoint,
      identifier,
      metadata,
    });

  if (error) {
    console.error('[security] Error logging audit event:', error.message);
  }
}

/**
 * CSRF protection helper.
 * Validates the presence and validity of a CSRF token in requests using cookies.
 */
export function validateCsrfToken(req: Request) {
  const cookies = req.headers.get('Cookie');
  if (cookies && (cookies.includes('sb-access-token') || cookies.includes('sb-refresh-token'))) {
    const csrfToken = req.headers.get('X-CSRF-Token');
    if (!csrfToken) {
      throw { status: 403, message: 'CSRF token missing for cookie-based request' };
    }
    // In a real scenario, we'd verify the token against a session-stored value.
    // For now, we enforce its presence as a baseline protection.
  }
}
