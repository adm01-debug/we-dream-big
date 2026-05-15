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

    // Fetch unread notifications grouped by user
    const { data: unreadNotifs, error } = await supabase
      .from('workspace_notifications')
      .select('user_id, id, title, message, type, category, created_at')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    if (!unreadNotifs || unreadNotifs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          digests_sent: 0,
          message: 'No unread notifications for digest'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by user
    const byUser = new Map<string, typeof unreadNotifs>();
    for (const notif of unreadNotifs) {
      const existing = byUser.get(notif.user_id) || [];
      existing.push(notif);
      byUser.set(notif.user_id, existing);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        users_with_unread: byUser.size,
        total_unread: unreadNotifs.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Digest error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
