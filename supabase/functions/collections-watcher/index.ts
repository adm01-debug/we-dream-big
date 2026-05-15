import { getCorsHeaders } from "../_shared/cors.ts";
import { authorizeCron } from "../_shared/dispatcher-auth.ts";
// collections-watcher: cron diário que detecta quedas de preço em itens de coleções
// e gera workspace_notifications (categoria "collections") com dedupe 24h.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { castSupabaseClient } from "../_shared/supabase-client-adapter.ts";


const DEDUPE_WINDOW_HOURS = 24;
const DROP_THRESHOLD_PCT = 5;

interface ColRow {
  id: string;
  collection_id: string;
  product_id: string;
  price_at_save: number | null;
}

async function alreadyNotified(service: import("../_shared/supabase-client-adapter.ts").CompatibleSupabaseClient, userId: string, key: string) {
  const since = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 3600 * 1000).toISOString();
  const { data } = await service
    .from("workspace_notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("category", "collections")
    .gte("created_at", since)
    .filter("metadata->>incident_key", "eq", key)
    .limit(1);
  return (data ?? []).length > 0;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Cron: exige x-cron-secret para evitar chamadas diretas não autorizadas
  const cronAuth = await authorizeCron(req, {
    corsHeaders: {},
    secretEnvName: "CRON_SECRET",
    headerName: "x-cron-secret",
  });
  if (!cronAuth.ok) return cronAuth.response;

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: items, error: itemErr } = await service
      .from("collection_items")
      .select("id, collection_id, product_id, price_at_save")
      .not("price_at_save", "is", null);
    if (itemErr) throw itemErr;
    const rows = (items ?? []) as ColRow[];

    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, scanned: 0, drops: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map collection -> user
    const colIds = [...new Set(rows.map((r) => r.collection_id))];
    const { data: cols } = await service
      .from("collections")
      .select("id, user_id")
      .in("id", colIds);
    const colUserMap = new Map<string, string>();
    (cols ?? []).forEach((c: { id: string; user_id: string }) => colUserMap.set(c.id, c.user_id));

    const productIds = [...new Set(rows.map((r) => r.product_id))];
    const { data: products } = await service
      .from("products")
      .select("id, name, price")
      .in("id", productIds);

    const priceMap = new Map<string, { name: string; price: number }>();
    (products ?? []).forEach((p: { id: string; name: string; price: number | null }) => {
      if (p.price && p.price > 0) priceMap.set(p.id, { name: p.name, price: p.price });
    });

    const userDrops = new Map<string, Array<{ name: string; pct: number; productId: string; collectionId: string }>>();
    let totalDrops = 0;

    for (const item of rows) {
      const userId = colUserMap.get(item.collection_id);
      if (!userId) continue;
      const current = priceMap.get(item.product_id);
      if (!current || !item.price_at_save) continue;
      const diffPct = ((current.price - item.price_at_save) / item.price_at_save) * 100;
      if (diffPct >= -DROP_THRESHOLD_PCT) continue;
      totalDrops++;
      if (!userDrops.has(userId)) userDrops.set(userId, []);
      userDrops.get(userId)!.push({
        name: current.name,
        pct: Math.abs(diffPct),
        productId: item.product_id,
        collectionId: item.collection_id,
      });
    }

    let notified = 0;
    for (const [userId, drops] of userDrops.entries()) {
      const dayKey = new Date().toISOString().slice(0, 10);
      const incidentKey = `collections_drop:${dayKey}`;
      if (await alreadyNotified(castSupabaseClient(service), userId, incidentKey)) continue;

      const top = drops.sort((a, b) => b.pct - a.pct).slice(0, 3);
      const message = drops.length === 1
        ? `${top[0].name} caiu ${top[0].pct.toFixed(0)}% desde que você adicionou à coleção.`
        : `${drops.length} produtos em coleções com queda de preço. Maior: ${top[0].name} (−${top[0].pct.toFixed(0)}%).`;

      await service.from("workspace_notifications").insert({
        user_id: userId,
        title: "💸 Queda de preço nas coleções",
        message,
        type: "success",
        category: "collections",
        action_url: `/colecoes/${top[0].collectionId}`,
        is_read: false,
        metadata: {
          incident_key: incidentKey,
          source: "collections-watcher",
          drops_count: drops.length,
          top_drops: top,
        },
      });
      notified++;
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: rows.length, drops: totalDrops, users_notified: notified }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[collections-watcher]", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
