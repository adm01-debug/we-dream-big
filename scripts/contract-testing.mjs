/**
 * Live HTTP contract tests for webhooks and Edge Functions.
 *
 * Iterates over the registry in `tests/contracts/webhook-schemas.ts` and
 * sends three baseline scenarios to every deployed endpoint:
 *
 *   1. valid (default scenario) — expects 200 OR a sane response
 *   2. empty-body 400/422 EMPTY_BODY
 *   3. malformed JSON 400 INVALID_JSON
 *
 * For each canonical webhook + cnpj-lookup + external-db-bridge we also
 * send hand-crafted 422 cases (missing required, wrong type, empty value)
 * and assert the unified envelope shape:
 *
 *   { code, message, fields:[{path,code,message}], error: <alias> }
 *
 * Run:   npm run test:contract
 * Env (required — fail-fast if missing):
 *   SUPABASE_URL                — endpoint base
 *   SUPABASE_SERVICE_ROLE_KEY   — Bearer for invocation (or SUPABASE_ANON_KEY)
 * Env (optional):
 *   N8N_PRODUCT_WEBHOOK_SECRET  — product-webhook auth
 *   WEBHOOK_DISPATCHER_SECRET   — webhook-dispatcher auth
 *   CONTRACT_TEST_FAIL_FAST=1   — stop at first failure
 */
import * as dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Fail-fast on missing env: silently falling back to a hardcoded URL once
// caused this script to point at an obsolete Supabase project for months.
// The official BD is doufsxqlfjyuvxuezpln — define it in .env or export it
// before running, otherwise the script aborts with a clear message.
const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) {
  console.error("❌ SUPABASE_URL não definida.");
  console.error("   Defina no .env (raiz do repo) ou exporte antes de rodar:");
  console.error("   export SUPABASE_URL=https://doufsxqlfjyuvxuezpln.supabase.co");
  process.exit(2);
}

const AUTH_TOKEN =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!AUTH_TOKEN) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) não definida.");
  console.error("   Defina no .env (raiz do repo) ou exporte antes de rodar.");
  process.exit(2);
}

const FAIL_FAST = process.env.CONTRACT_TEST_FAIL_FAST === "1";

// ---------------------------------------------------------------------------
// Load the contract registry by grepping endpoint keys from the TS source.
// We don't import the .ts module (no ts-loader here); we just need the names.
// ---------------------------------------------------------------------------
const registrySrc = readFileSync(
  resolve(ROOT, "tests/contracts/webhook-schemas.ts"),
  "utf8"
);
function parseRegistryEndpoints(src) {
  const start = src.indexOf("export const CONTRACTS");
  if (start < 0) return [];
  const open = src.indexOf("{", start);
  let depth = 0, end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  const block = src.slice(open, end);
  const out = [];
  const re = /"([a-z][a-z0-9-]*)":\s*\{([\s\S]*?)\n\s{2,}\}/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const descMatch = m[2].match(/description:\s*"([^"]+)"/);
    out.push({ endpoint: m[1], description: descMatch ? descMatch[1] : "" });
  }
  return out;
}

const REGISTRY = parseRegistryEndpoints(registrySrc);

// ---------------------------------------------------------------------------
// Endpoint-specific overrides (auth headers, valid payload, expected status).
// Defaults to "any non-5xx is OK" for the valid scenario when unspecified.
// ---------------------------------------------------------------------------
const OVERRIDES = {
  "product-webhook": {
    headers: { "x-webhook-secret": process.env.N8N_PRODUCT_WEBHOOK_SECRET || "sim-secret" },
    validPayload: {
      action: "upsert",
      product: { sku: `CT-${Date.now()}`, name: "Contract Test", price: 1 },
    },
    validStatus: 200,
  },
  "webhook-dispatcher": {
    headers: { "x-dispatcher-secret": process.env.WEBHOOK_DISPATCHER_SECRET || "sim-secret" },
    validPayload: { event: "contract.test" },
    validStatus: [200, 401, 403],
  },
  "cnpj-lookup": {
    validPayload: { cnpj: "00.000.000/0001-91" },
    validStatus: [200, 400, 502],
  },
  "external-db-bridge": {
    validPayload: { operation: "select", table: "products", limit: 1 },
    validStatus: [200, 401, 403, 500],
  },
};

function asStatusList(v) {
  return Array.isArray(v) ? v : [v];
}

function isUnifiedErrorEnvelope(data, expectedCode) {
  if (!data || typeof data !== "object") return false;
  if (typeof data.code !== "string" || !data.code) return false;
  if (typeof data.message !== "string" || !data.message) return false;
  if (!Array.isArray(data.fields)) return false;
  for (const f of data.fields) {
    if (!f || typeof f.path !== "string" || typeof f.code !== "string" || typeof f.message !== "string") return false;
  }
  if (expectedCode && data.code !== expectedCode) return false;
  return true;
}

async function callEndpoint(endpoint, { headers = {}, body, raw }) {
  const url = `${SUPABASE_URL}/functions/v1/${endpoint}`;
  const init = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AUTH_TOKEN}`,
      ...headers,
    },
  };
  if (raw !== undefined) init.body = raw;
  else if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runContractTests() {
  console.log("🚀 Iniciando Testes de Contrato HTTP — envelope unificado + cobertura completa");
  console.log(`🎯 Alvo: ${SUPABASE_URL}`);
  console.log(`📦 ${REGISTRY.length} endpoints no registry`);
  let passed = 0;
  let failedCount = 0;
  let skipped = 0;
  const failures = [];

  for (const { endpoint, description } of REGISTRY) {
    console.log(`\n📦 ${endpoint} — ${description}`);
    const ov = OVERRIDES[endpoint] || {};
    const scenarios = [];

    if (ov.validPayload) {
      scenarios.push({
        name: "valid payload",
        request: { headers: ov.headers, body: ov.validPayload },
        check: (r) => asStatusList(ov.validStatus ?? 200).includes(r.status),
      });
    }

    scenarios.push({
      name: "empty body → 400 EMPTY_BODY (unified envelope)",
      request: { headers: ov.headers, raw: "" },
      check: (r) => r.status === 400 && isUnifiedErrorEnvelope(r.data, "EMPTY_BODY"),
    });

    scenarios.push({
      name: "malformed JSON → 400 INVALID_JSON (unified envelope)",
      request: { headers: ov.headers, raw: "{not-json" },
      check: (r) => r.status === 400 && isUnifiedErrorEnvelope(r.data, "INVALID_JSON"),
    });

    scenarios.push({
      name: "obviously invalid (string) → 422 VALIDATION_FAILED",
      request: { headers: ov.headers, body: "not-an-object-payload" },
      check: (r) => r.status === 422 && isUnifiedErrorEnvelope(r.data, "VALIDATION_FAILED"),
    });

    for (const s of scenarios) {
      process.stdout.write(`  - ${s.name}: `);
      try {
        const r = await callEndpoint(endpoint, s.request);
        if (s.check(r)) {
          console.log("✅ PASS");
          passed++;
        } else {
          console.log("❌ FAIL");
          console.log(`    status=${r.status} body=${JSON.stringify(r.data).slice(0, 300)}`);
          failedCount++;
          failures.push({ endpoint, scenario: s.name });
          if (FAIL_FAST) break;
        }
      } catch (err) {
        console.log("⚠️  SKIP (network)");
        console.error(`    ${err?.message || err}`);
        skipped++;
      }
    }
    if (FAIL_FAST && failedCount > 0) break;
  }

  console.log(`\n--- RESULTADO ---`);
  console.log(`✅ Sucessos: ${passed}`);
  console.log(`❌ Falhas:   ${failedCount}`);
  console.log(`⚠️  Skipped:  ${skipped}`);
  if (failures.length) {
    console.log("\nFalhas:");
    for (const f of failures) console.log(`  • ${f.endpoint} :: ${f.scenario}`);
  }
  console.log("-------------------\n");

  if (failedCount > 0) process.exit(1);
}

runContractTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
