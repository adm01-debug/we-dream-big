import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return encodeHex(new Uint8Array(sig));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = performance.now();

  try {
    const { count = 100, targetFunctions = ["external-db-bridge", "webhook-inbound", "product-webhook"] } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const n8nSecret = Deno.env.get("N8N_PRODUCT_WEBHOOK_SECRET") || "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const report = {
      totalScenarios: 0,
      successes: 0,
      failures: 0,
      details: [] as any[],
      startTime: new Date().toISOString(),
      endTime: "",
      consistencyChecks: { passed: 0, failed: 0 },
    };

    // 1. Setup Simulation Data
    const { data: simEndpoint } = await supabase
      .from("inbound_webhook_endpoints")
      .select("id, slug")
      .eq("slug", "simulation-test")
      .maybeSingle();
      
    let endpointId = simEndpoint?.id;
    if (!simEndpoint) {
      const { data: newEndpoint, error } = await supabase.from("inbound_webhook_endpoints").insert({
        slug: "simulation-test",
        name: "Simulation Test Endpoint",
        active: true,
        source_system: "simulation",
        hmac_secret_ref: "SUPABASE_SERVICE_ROLE_KEY",
        created_by: "7b565451-7eb6-4063-a74b-8ce4dca8703d",
        allowed_events: ["test"]
      }).select("id").single();
      if (error) throw new Error(`Setup failed: ${error.message}`);
      endpointId = newEndpoint.id;
    }

    const runScenario = async (fnName: string, payload: any, expectedStatuses: number[], extraHeaders = {}) => {
      const url = `${supabaseUrl}/functions/v1/${fnName}`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
            ...extraHeaders
          },
          body: JSON.stringify(payload),
        });
        const status = res.status;
        const success = expectedStatuses.includes(status);
        
        if (success) {
          report.successes++;
        } else {
          report.failures++;
          if (report.details.length < 20) {
             const errorBody = await res.text().catch(() => "N/A");
             report.details.push({ fnName, status, error: errorBody, payload: JSON.stringify(payload).substring(0, 100) });
          }
        }
        report.totalScenarios++;
        return { status, success };
      } catch (err) {
        report.failures++;
        report.totalScenarios++;
        return { success: false, error: String(err) };
      }
    };

    const TABLES = ["products", "categories", "suppliers", "brands", "quotes"];
    const OPERATORS = ["gte", "lte", "gt", "lt", "neq", "like", "ilike"];

    const batchSize = 20;
    for (let i = 0; i < count; i += batchSize) {
      const promises = [];
      const currentBatch = Math.min(batchSize, count - i);
      
      for (let j = 0; j < currentBatch; j++) {
        // Bridge scenarios
        if (targetFunctions.includes("external-db-bridge")) {
          const table = TABLES[Math.floor(Math.random() * TABLES.length)];
          const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
          promises.push(runScenario("external-db-bridge", {
            operation: "select", table, filters: { [`id_${op}`]: "123" }, limit: 5
          }, [200, 404, 400, 401]));
        }

        // Webhook scenarios with HMAC signing
        if (targetFunctions.includes("webhook-inbound")) {
          promises.push((async () => {
            const testEventId = `sim-event-${crypto.randomUUID()}`;
            const payload = { event: "test", id: testEventId };
            const signature = "sha256=" + await hmacSign(JSON.stringify(payload), serviceRoleKey);
            
            const result = await runScenario("webhook-inbound?slug=simulation-test", payload, [200], {
              "x-signature-256": signature
            });
            
            if (result.success && result.status === 200) {
              // Wait briefly for persistence
              await new Promise(r => setTimeout(r, 100));
              const { data } = await supabase.from("inbound_webhook_events")
                .select("id")
                .eq("endpoint_id", endpointId)
                .contains("payload", { id: testEventId })
                .maybeSingle();
              if (data) report.consistencyChecks.passed++;
              else report.consistencyChecks.failed++;
            }
          })());
        }

        // Product Webhook scenarios
        if (targetFunctions.includes("product-webhook")) {
          const sku = `SIM-SKU-${Math.random().toString(36).substring(7)}`;
          promises.push(runScenario("product-webhook", {
            action: "upsert",
            product: { sku, name: "Sim Product", price: 10.5 }
          }, [200], {
            "x-webhook-secret": n8nSecret
          }));
        }
      }
      
      await Promise.all(promises);
      
      // Stop if timeout is approaching (50s)
      if (performance.now() - startTime > 50000) break;
    }

    report.endTime = new Date().toISOString();

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
