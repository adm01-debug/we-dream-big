import { getCorsHeaders } from "../_shared/cors.ts";
import { authorizeCron } from "../_shared/dispatcher-auth.ts";
/**
 * comparison-price-watcher (C6 #7) — Cron diário.
 * Cruza user_comparisons ativas com price_history; se houve queda > 5% nos
 * últimos 7d em produto comparado, cria notificação em workspace_notifications.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const THRESHOLD_PCT = 5;
const LOOKBACK_DAYS = 7;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  // Cron: exige x-cron-secret para evitar chamadas diretas não autorizadas
  const cronAuth = await authorizeCron(req, {
    corsHeaders: {},
    secretEnvName: "CRON_SECRET",
    headerName: "x-cron-secret",
  });
  if (!cronAuth.ok) return cronAuth.response;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stats = { comparisons: 0, products: 0, drops: 0, notifications: 0, errors: 0 };

  try {
    const { data: comparisons, error: cmpErr } = await supabase
      .from("user_comparisons")
      .select("id, user_id, items")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (cmpErr) throw cmpErr;
    stats.comparisons = comparisons?.length ?? 0;

    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString();
    const productSet = new Set<string>();
    const userByProduct = new Map<string, Set<string>>();

    for (const c of comparisons ?? []) {
      const items = (c.items as any[]) ?? [];
      for (const it of items) {
        const pid = it?.productId;
        if (!pid) continue;
        productSet.add(pid);
        if (!userByProduct.has(pid)) userByProduct.set(pid, new Set());
        userByProduct.get(pid)!.add(c.user_id);
      }
    }
    stats.products = productSet.size;

    if (productSet.size === 0) {
      return new Response(JSON.stringify({ ok: true, stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenta ler price_history; se não existir, encerra graciosamente
    const { data: history, error: histErr } = await supabase
      .from("price_history" as any)
      .select("product_id, price, recorded_at")
      .in("product_id", Array.from(productSet))
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: false });

    if (histErr) {
      return new Response(JSON.stringify({ ok: true, stats, note: "price_history indisponível" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Agrupa por produto: pega mais antigo e mais recente da janela
    const byProduct = new Map<string, { oldest: number; newest: number }>();
    for (const h of (history ?? []) as any[]) {
      const cur = byProduct.get(h.product_id);
      const price = Number(h.price);
      if (!cur) byProduct.set(h.product_id, { oldest: price, newest: price });
      else byProduct.set(h.product_id, { oldest: price, newest: cur.newest });
    }

    for (const [pid, { oldest, newest }] of byProduct) {
      if (!oldest || !newest) continue;
      const dropPct = ((oldest - newest) / oldest) * 100;
      if (dropPct < THRESHOLD_PCT) continue;
      stats.drops++;

      const users = userByProduct.get(pid);
      if (!users) continue;

      for (const userId of users) {
        try {
          const { error: nErr } = await supabase.from("workspace_notifications" as any).insert({
            user_id: userId,
            type: "price_drop",
            title: "Preço caiu em produto comparado",
            message: `Queda de ${dropPct.toFixed(1)}% nos últimos ${LOOKBACK_DAYS} dias.`,
            metadata: { product_id: pid, drop_pct: dropPct, source: "comparison-price-watcher" },
            is_read: false,
          });
          if (!nErr) stats.notifications++;
          else stats.errors++;
        } catch { stats.errors++; }
      }
    }

    return new Response(JSON.stringify({ ok: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), stats }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
