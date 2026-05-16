// /api/health-details — endpoint de depuração combinando /api/health + /api/ready.
//
// Retorna o MESMO payload de /api/health (metadados de build: status/version/
// commit/branch/builtAt/node/env + requestId + servedAt) e ADICIONA o bloco
// `checks` produzido pela mesma lógica de /api/ready (env vars, ping Supabase
// principal e externo, latência por dependência).
//
// Diferenças em relação aos outros dois endpoints:
//   - /api/health        → leve, só metadados (rápido, smoke phase 1)
//   - /api/ready         → checks runtime (smoke phase 2)
//   - /api/health-details → combinado, ideal para depurar quando o smoke falha
//                            (status agregado + por-dependência + correlation ID
//                             em um único request)
//
// Status HTTP:
//   200 ready/degraded   → mesmo critério de /api/ready
//   503 unhealthy        → algum check com status "fail"
//
// Header `X-Request-Id` é ecoado/gerado igual /api/health para correlacionar
// com os logs estruturados emitidos por esta função.

export const config = { runtime: "edge" };

interface HealthMeta {
  status: string;
  name?: string;
  version?: string;
  commit?: string;
  branch?: string;
  builtAt?: string;
  node?: string;
  env?: string;
}

let BUILD_META: HealthMeta = { status: "ok" };
try {
  // @ts-expect-error — JSON import resolvido em build time
  const mod = await import("../public/api/health.json", { assert: { type: "json" } });
  BUILD_META = (mod.default ?? mod) as HealthMeta;
} catch {
  BUILD_META = {
    status: "ok",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
    branch: process.env.VERCEL_GIT_COMMIT_REF || "unknown",
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  };
}

const REQUEST_ID_HEADER = "x-request-id";
const TIMEOUT_MS = 3500;

type CheckStatus = "ok" | "degraded" | "fail" | "skipped";
interface Check {
  status: CheckStatus;
  latency_ms?: number;
  error?: string;
  detail?: string;
}

function resolveRequestId(req: Request): { id: string; source: "client" | "generated" } {
  const incoming = req.headers.get(REQUEST_ID_HEADER);
  if (incoming && /^[A-Za-z0-9_-]{8,128}$/.test(incoming)) {
    return { id: incoming, source: "client" };
  }
  return { id: crypto.randomUUID(), source: "generated" };
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`${label} timeout after ${ms}ms`)), ms),
    ),
  ]);
}

function checkEnv(): { check: Check; envs: Record<string, string | undefined> } {
  const required = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_EXTERNAL_SUPABASE_URL",
    "VITE_EXTERNAL_SUPABASE_ANON_KEY",
  ] as const;
  const envs: Record<string, string | undefined> = {};
  const missing: string[] = [];
  for (const k of required) {
    const v = process.env[k];
    envs[k] = v;
    if (!v) missing.push(k);
  }
  if (missing.length) {
    return { check: { status: "fail", error: `Missing env: ${missing.join(", ")}` }, envs };
  }
  return { check: { status: "ok", detail: `${required.length} vars presentes` }, envs };
}

async function pingSupabase(url: string, apikey: string, label: string): Promise<Check> {
  const t0 = Date.now();
  try {
    const target = label === "supabase_main"
      ? `${url.replace(/\/$/, "")}/auth/v1/health`
      : `${url.replace(/\/$/, "")}/rest/v1/`;
    const res = await withTimeout(
      fetch(target, { method: "GET", headers: { apikey, Authorization: `Bearer ${apikey}` } }),
      TIMEOUT_MS,
      label,
    );
    const latency_ms = Date.now() - t0;
    if (res.status < 500) return { status: "ok", latency_ms, detail: `HTTP ${res.status}` };
    return { status: "degraded", latency_ms, error: `HTTP ${res.status}` };
  } catch (err) {
    return { status: "fail", latency_ms: Date.now() - t0, error: (err as Error)?.message ?? "unknown" };
  }
}

export default async function handler(req: Request): Promise<Response> {
  const start = Date.now();
  const { id: requestId, source } = resolveRequestId(req);
  const servedAt = new Date().toISOString();

  const checks: Record<string, Check> = {};
  const { check: envCheck, envs } = checkEnv();
  checks.env = envCheck;

  const [mainCheck, extCheck] = await Promise.all([
    envs.VITE_SUPABASE_URL && envs.VITE_SUPABASE_PUBLISHABLE_KEY
      ? pingSupabase(envs.VITE_SUPABASE_URL, envs.VITE_SUPABASE_PUBLISHABLE_KEY, "supabase_main")
      : Promise.resolve<Check>({ status: "skipped", error: "missing url/key" }),
    envs.VITE_EXTERNAL_SUPABASE_URL && envs.VITE_EXTERNAL_SUPABASE_ANON_KEY
      ? pingSupabase(envs.VITE_EXTERNAL_SUPABASE_URL, envs.VITE_EXTERNAL_SUPABASE_ANON_KEY, "supabase_external")
      : Promise.resolve<Check>({ status: "skipped", error: "missing url/key" }),
  ]);
  checks.supabase_main = mainCheck;
  checks.supabase_external = extCheck;

  const statuses = Object.values(checks).map((c) => c.status);
  const overall: "ready" | "degraded" | "unhealthy" =
    statuses.some((s) => s === "fail") ? "unhealthy"
    : statuses.some((s) => s === "degraded") ? "degraded"
    : "ready";

  const totalLatency = Date.now() - start;

  const payload = {
    ...BUILD_META,
    requestId,
    servedAt,
    readiness: overall,
    latency_ms: totalLatency,
    checks,
  };

  console.log(JSON.stringify({
    level: overall === "unhealthy" ? "error" : overall === "degraded" ? "warn" : "info",
    scope: "api.health-details",
    event: "health_details_served",
    requestId,
    requestIdSource: source,
    commit: BUILD_META.commit,
    version: BUILD_META.version,
    env: BUILD_META.env,
    readiness: overall,
    latency_ms: totalLatency,
    checks: Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, { status: v.status, latency_ms: v.latency_ms }])),
    servedAt,
    ua: req.headers.get("user-agent") ?? undefined,
  }));

  return new Response(JSON.stringify(payload, null, 2), {
    status: overall === "unhealthy" ? 503 : 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      [REQUEST_ID_HEADER]: requestId,
      "Access-Control-Expose-Headers": REQUEST_ID_HEADER,
    },
  });
}
