import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";
import { authorizeCron } from "../_shared/dispatcher-auth.ts";

const corsHeaders = buildPublicCorsHeaders();

Deno.serve(async (req) => {
  // Cron: exige x-cron-secret para evitar chamadas diretas não autorizadas
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  const cronAuth = await authorizeCron(req, { corsHeaders: {}, secretEnvName: "CRON_SECRET", headerName: "x-cron-secret" });
  if (!cronAuth.ok) return cronAuth.response;

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Cleanup old read notifications
    const { error: cleanupError } = await supabase.rpc('cleanup_old_notifications');
    
    if (cleanupError) {
      console.warn('Cleanup warning:', cleanupError.message);
    }

    // 2. Count unprocessed notifications per user for digest
    const { data: unreadNotifs, error: fetchError } = await supabase
      .from('workspace_notifications')
      .select('user_id, id, title, message, type, category, created_at')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(500);

    if (fetchError) throw fetchError;

    if (!unreadNotifs || unreadNotifs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0,
          message: 'No unread notifications to process'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Group by user
    const byUser = new Map<string, typeof unreadNotifs>();
    for (const notif of unreadNotifs) {
      const existing = byUser.get(notif.user_id) || [];
      existing.push(notif);
      byUser.set(notif.user_id, existing);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: byUser.size,
        users_with_unread: byUser.size,
        total_unread: unreadNotifs.length,
        cleanup_ran: !cleanupError,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Queue processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
