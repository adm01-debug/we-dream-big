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

function generateFuzzedPayload(type: string) {
  const fuzzedStrings = [
    "' OR '1'='1", 
    "<script>alert(1)</script>", 
    "A".repeat(10000), 
    null, 
    12345, 
    {}, 
    "undefined", 
    "\0", 
    "NaN", 
    "-1"
  ];
  const item = fuzzedStrings[Math.floor(Math.random() * fuzzedStrings.length)];
  
  if (type === "product") {
    return { sku: item, name: item, price: typeof item === 'number' ? item : -1 };
  }
  if (type === "webhook") {
    return { event: item, id: crypto.randomUUID(), data: { fuzzed: item } };
  }
  return { [String(item)]: item };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = performance.now();

  try {
    const { 
      count = 100, 
      targetFunctions = ["external-db-bridge", "webhook-inbound", "product-webhook"],
      mode = "resilience" // "resilience", "load", "fuzzing"
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const n8nSecret = Deno.env.get("N8N_PRODUCT_WEBHOOK_SECRET") || "sim-secret";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const report = {
      totalScenarios: 0,
      successes: 0,
      failures: 0,
      details: [] as any[],
      startTime: new Date().toISOString(),
      endTime: "",
      consistencyChecks: { passed: 0, failed: 0 },
      latencies: [] as number[],
    };

    const { data: simEndpoint } = await supabase
      .from("inbound_webhook_endpoints")
      .select("id")
      .eq("slug", "simulation-test")
      .maybeSingle();
      
    const endpointId = simEndpoint?.id;

    const runScenario = async (fnName: string, payload: any, expectedStatuses: number[], extraHeaders = {}) => {
      const url = `${supabaseUrl}/functions/v1/${fnName}`;
      const callStart = performance.now();
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
        const latency = performance.now() - callStart;
        report.latencies.push(latency);
        
        if (success) {
          report.successes++;
        } else {
          report.failures++;
          if (report.details.length < 50) {
             const errorBody = await res.text().catch(() => "N/A");
             report.details.push({ fnName, status, error: errorBody, payload: JSON.stringify(payload).substring(0, 150) });
          }
        }
        report.totalScenarios++;
        return { status, success, payload };
      } catch (err) {
        report.failures++;
        report.totalScenarios++;
        return { success: false, error: String(err) };
      }
    };

    const batchSize = mode === "load" ? 50 : 20;
    const finalCount = mode === "load" ? Math.max(count, 500) : count;

    for (let i = 0; i < finalCount; i += batchSize) {
      const promises = [];
      const currentBatch = Math.min(batchSize, finalCount - i);
      
      for (let j = 0; j < currentBatch; j++) {
        // 1. External DB Bridge (Standard Resilience)
        if (targetFunctions.includes("external-db-bridge")) {
          const payload = mode === "fuzzing" ? generateFuzzedPayload("bridge") : { operation: "select", table: "products", limit: 1 };
          promises.push(runScenario("external-db-bridge", payload, [200, 400, 401, 404, 422]));
        }

        // 2. Webhook Inbound (Consistency + Security)
        if (targetFunctions.includes("webhook-inbound")) {
          promises.push((async () => {
            const payload = mode === "fuzzing" ? generateFuzzedPayload("webhook") : { event: "simulation", id: `sim-${crypto.randomUUID()}` };
            const signature = "sha256=" + await hmacSign(JSON.stringify(payload), serviceRoleKey);
            
            const result = await runScenario("webhook-inbound?slug=simulation-test", payload, [200, 400, 401, 422], {
              "x-signature-256": signature
            });
            
            if (result.success && result.status === 200 && endpointId && mode !== "fuzzing") {
              await new Promise(r => setTimeout(r, 50));
              const { data } = await supabase.from("inbound_webhook_events")
                .select("id")
                .eq("endpoint_id", endpointId)
                .contains("payload", { id: payload.id })
                .maybeSingle();
              if (data) report.consistencyChecks.passed++;
              else report.consistencyChecks.failed++;
            }
          })());
        }

        // 3. Product Webhook (Data Integrity)
        if (targetFunctions.includes("product-webhook")) {
          const payload = mode === "fuzzing" ? 
            { action: "upsert", product: generateFuzzedPayload("product") } : 
            { action: "upsert", product: { sku: `SIM-${crypto.randomUUID().substring(0,8)}`, name: "Simulation", price: 99.99 } };
            
          promises.push(runScenario("product-webhook", payload, [200, 400, 422, 500], {
            "x-webhook-secret": n8nSecret
          }));
        }
      }
      
      await Promise.all(promises);
      if (performance.now() - startTime > 55000) break;
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
