// supabase/functions/tests/load-test.ts
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Configuração para "milhares" de eventos
const CONCURRENCY = 50;
const TOTAL_REQUESTS = 1000; // Começamos com 1000 para não estourar o tempo de execução do Deno no sandbox

async function runLoadTest(name: string, path: string, method = "GET", body: any = null, headers: any = {}) {
  console.log(`\n🚀 Starting stress test for ${name} (${TOTAL_REQUESTS} requests, concurrency ${CONCURRENCY})...`);
  
  const start = performance.now();
  let success = 0;
  let failure = 0;
  let status401 = 0;
  const latencies: number[] = [];
  const errors: Record<string, number> = {};

  const workers = Array.from({ length: CONCURRENCY }).map(async (_, workerId) => {
    for (let i = 0; i < TOTAL_REQUESTS / CONCURRENCY; i++) {
      const reqStart = performance.now();
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`,
            "X-Test-Worker": String(workerId),
            "X-Internal-Call": "true", // Bypass consistent for tests
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        
        const text = await res.text();
        const latency = performance.now() - reqStart;
        latencies.push(latency);

        if (res.ok) {
          success++;
        } else if (res.status === 401) {
          status401++;
          success++; // Expected in some security tests, but counted separately
        } else if (res.status >= 500) {
          failure++;
          const errKey = `HTTP ${res.status}: ${text.slice(0, 50)}`;
          errors[errKey] = (errors[errKey] || 0) + 1;
        } else {
          success++;
        }
      } catch (e) {
        failure++;
        const errKey = `Network/Fetch Error: ${(e as Error).message}`;
        errors[errKey] = (errors[errKey] || 0) + 1;
      }
    }
  });

  await Promise.all(workers);
  const totalTime = performance.now() - start;
  
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const avgLatency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p95Latency = sortedLatencies.length ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] : 0;
  const p99Latency = sortedLatencies.length ? sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] : 0;

  console.log(`\n📊 Results for ${name}:`);
  console.log(`- Handled (OK/401/400): ${success}`);
  console.log(`- 401 Unauthorized: ${status401}`);
  console.log(`- Failure (5xx/Network): ${failure}`);
  console.log(`- Total Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`- Throughput: ${(TOTAL_REQUESTS / (totalTime / 1000)).toFixed(1)} req/s`);
  console.log(`- Avg Latency: ${avgLatency.toFixed(0)}ms`);
  console.log(`- P95 Latency: ${p95Latency.toFixed(0)}ms`);
  console.log(`- P99 Latency: ${p99Latency.toFixed(0)}ms`);

  if (Object.keys(errors).length > 0) {
    console.log(`- Top Errors:`);
    Object.entries(errors).forEach(([err, count]) => {
      console.log(`  * ${err}: ${count}`);
    });
  }
}

// 1. Resilience test: Webhook inbound (Burst)
await runLoadTest("webhook-inbound (Burst)", "/webhook-inbound?slug=test", "POST", { event: "ping" }, {
  "X-Signature-256": "sha256=invalid-but-triggers-logic"
});

// 2. Stress test: Health check (Heavy DB connectivity)
await runLoadTest("health-check (Stress)", "/health-check");

// 3. Security test: Validate access
await runLoadTest("validate-access (Security Logic)", "/validate-access", "POST", { ip: "127.0.0.1" });

// 4. Heavy DB Test: materials-api
await runLoadTest("materials-api (DB heavy)", "/materials-api", "POST", { action: "groups" });

// 5. External DB Resilience: connections-health-check
await runLoadTest("connections-health-check (External DB)", "/connections-health-check");
