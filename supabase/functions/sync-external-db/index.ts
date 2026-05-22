import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";

const corsHeaders = buildPublicCorsHeaders();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "sync-external-db", requestId, req });

  // Authorization: dev role required. The function uses service-role
  // keys to read/write internal AND external databases, so it must be
  // restricted to developers. Anonymous/anon-role JWT must NOT pass.
  const authResult = await authorize(req, { requireRole: "dev" });
  if (!authResult.ok) {
    log.warn("unauthorized");
    return authResult.response;
  }

  try {
    const { table, direction = "to-external", since } = await req.json();

    if (!table) {
      return new Response(JSON.stringify({ error: "Table name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Conexão com Supabase Interno (Lovable)
    const internalUrl = Deno.env.get("SUPABASE_URL")!;
    const internalKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalSupabase = createClient(internalUrl, internalKey);

    // 2. Conexão com Supabase Externo
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL") || Deno.env.get("VITE_EXTERNAL_SUPABASE_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");

    if (!externalUrl || !externalKey) {
       return new Response(JSON.stringify({ error: "External Supabase credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    const sourceClient = direction === "to-external" ? internalSupabase : externalSupabase;
    const targetClient = direction === "to-external" ? externalSupabase : internalSupabase;

    log.info("sync_start", { table, direction, since });

    // 3. Buscar dados da origem
    let query = sourceClient.from(table).select("*").limit(1000);

    // Sincronização incremental se updated_at estiver disponível e solicitado
    if (since) {
      query = query.gt('updated_at', since);
    }

    const { data: sourceData, error: sourceError } = await query;

    if (sourceError) throw sourceError;

    if (!sourceData || sourceData.length === 0) {
      return new Response(JSON.stringify({ message: "No data to sync", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Inserir/Atualizar no destino (Upsert)
    const { error: syncError } = await targetClient
      .from(table)
      .upsert(sourceData, { onConflict: 'id' });

    if (syncError) throw syncError;

    log.info("sync_ok", { table, direction, count: sourceData.length });

    return new Response(JSON.stringify({
      success: true,
      message: `Synced ${sourceData.length} records to ${direction === "to-external" ? 'external' : 'internal'} database.`,
      count: sourceData.length,
      last_updated: sourceData.length > 0 ? sourceData.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), sourceData[0].updated_at) : null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    log.error("sync_failed", { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "sync_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
