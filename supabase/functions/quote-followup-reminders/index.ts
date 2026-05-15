/**
 * quote-followup-reminders
 * Cria notificações para vendedores cujos orçamentos enviados há ≥2 dias
 * ainda não foram visualizados pelo cliente. Idempotente por dia (não duplica).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";
import { authorizeCron } from "../_shared/dispatcher-auth.ts";

const corsHeaders = buildPublicCorsHeaders();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Cron: exige x-cron-secret para evitar chamadas diretas não autorizadas
  const cronAuth = await authorizeCron(req, {
    corsHeaders: {},
    secretEnvName: "CRON_SECRET",
    headerName: "x-cron-secret",
  });
  if (!cronAuth.ok) return cronAuth.response;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    // 1) Orçamentos enviados há ≥2d
    const { data: quotes, error: qErr } = await supabase
      .from("quotes")
      .select("id, quote_number, client_name, seller_id, updated_at")
      .in("status", ["sent", "pending"])
      .lte("updated_at", twoDaysAgo)
      .limit(500);

    if (qErr) throw qErr;
    if (!quotes || quotes.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quoteIds = quotes.map((q) => q.id);

    // 2) Todos os orçamentos com ≥2d são candidatos
    // (Tokens públicos foram removidos em 07/05/2026 — não há mais sinal de "visualização externa".
    //  A heurística agora é puramente temporal: orçamento parado há ≥2d gera lembrete.)
    const candidates = quotes;

    // 3) Idempotência: ignora os que já têm reminder hoje
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: existing } = await supabase
      .from("follow_up_reminders")
      .select("quote_id")
      .in("quote_id", candidates.map((c) => c.id))
      .gte("created_at", todayStart.toISOString());
    const existingSet = new Set((existing || []).map((e) => e.quote_id));

    const toInsert = candidates
      .filter((c) => !existingSet.has(c.id) && c.seller_id)
      .map((c) => ({
        quote_id: c.id,
        seller_id: c.seller_id!,
        reminder_type: "no_view",
        scheduled_for: new Date().toISOString(),
        title: `Orçamento ${c.quote_number} sem visualização`,
        notes: `Cliente ${c.client_name || "—"} ainda não abriu o link. Considere enviar follow-up.`,
        is_sent: true,
        sent_at: new Date().toISOString(),
      }));

    let inserted = 0;
    if (toInsert.length > 0) {
      const { error: insErr, count } = await supabase
        .from("follow_up_reminders")
        .insert(toInsert, { count: "exact" });
      if (insErr) throw insErr;
      inserted = count ?? toInsert.length;
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: quotes.length, candidates: candidates.length, inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
