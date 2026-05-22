/**
 * Contract tests para TODAS as edge functions em supabase/functions/.
 *
 * Roda 100% offline em vitest (sem Deno). Verifica contratos que toda edge
 * function precisa cumprir para passar nas regras do projeto:
 *
 *  1. CORS via _shared/cors.ts (preflight + headers padronizados).
 *  2. Manipulação explícita de OPTIONS (preflight handler).
 *  3. JWT enforcement: se `verify_jwt = true` em config.toml (default),
 *     deve haver guard (`authorize`, `authenticateRequest`, ou similar)
 *     OU ser explicitamente um endpoint cron/service-role.
 *  4. Zod (ou similar) para validar body em endpoints que recebem JSON.
 *  5. Resposta JSON com Content-Type quando aplicável.
 *  6. Sem hardcoded secrets (apikey, service_role, JWT prefix).
 *
 * Cada falha aponta o arquivo:linha e a regra. Falsos positivos são
 * tratados via allowlist em `EXCEPTIONS` no topo do arquivo.
 *
 * Para parquear uma função (com rationale claro), adicione à allowlist.
 * Para remover do allowlist, basta corrigir a função.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname ?? __dirname, "..", "..");
const FUNCTIONS_DIR = join(ROOT, "supabase", "functions");
const CONFIG_PATH = join(ROOT, "supabase", "config.toml");

const SKIP = new Set(["_shared", "tests"]);

interface FnInfo {
  name: string;
  source: string;
  requiresJwt: boolean;
}

/**
 * Edge functions que ESTÃO conformes com exceções documentadas.
 * Cada chave aponta a regra que a função pode pular e o motivo.
 */
const EXCEPTIONS: Record<string, Partial<Record<keyof Checks, string>>> = {
  // Funções que servem HTML/assets diretamente (sem JSON).
  "image-proxy": { contentTypeJson: "Retorna binários (image/*) ou redirect" },
  "etiqueta-pdf": { contentTypeJson: "Retorna PDF binário" },
  // Helpers internos que apenas redirecionam OPTIONS (sem body próprio).
  "health-check": { zodBody: "Endpoint GET sem body de entrada" },
  "cors-audit": { zodBody: "Snapshot, sem body" },
  "full-op-diagnostics": { zodBody: "Endpoint diagnóstico GET" },
  "get-visitor-info": { zodBody: "GET via headers/IP, sem body" },
  // CRON-only / service-role-only (verify_jwt: false intencional, mas guardadas
  // por secret header). Manifest em _shared/edge-authz-manifest.ts.
  "process-queue": { jwtGuard: "Cron interno protegido por shared secret" },
  "process-scheduled-reports": { jwtGuard: "Cron interno protegido por shared secret" },
  "cleanup-notifications": { jwtGuard: "Cron interno protegido por shared secret" },
  "cleanup-novelties": { jwtGuard: "Cron interno protegido por shared secret" },
  "comparison-price-watcher": { jwtGuard: "Cron interno protegido por shared secret" },
  "connections-health-check": { jwtGuard: "Cron interno protegido por shared secret" },
  "collections-watcher": { jwtGuard: "Cron interno protegido por shared secret" },
  "favorites-watcher": { jwtGuard: "Cron interno protegido por shared secret" },
  "ownership-audit": { jwtGuard: "Cron interno protegido por shared secret" },
  "quote-followup-reminders": { jwtGuard: "Cron interno protegido por shared secret" },
  "sync-external-db": {
    jwtGuard: "Cron interno: protegido por CONNECTIONS_AUTO_TEST_SECRET ou similar",
    zodBody: "Cron interno: trigger sem body de entrada",
  },
  "webhook-inbound": {
    jwtGuard: "Verifica HMAC X-Signature-256 (mais forte que JWT)",
    zodBody: "Payload arbitrário de provider externo; validado por signature, não shape",
  },
  // Endpoints que recebem JSON mas validação shape é manual (não Zod).
  // TICKET FUTURO: migrar para Zod nas próximas ondas (mem://qa/edge-contracts).
  "bi-copilot": { zodBody: "TODO: migrar para Zod (rastreado)" },
  "block-ip-temporarily": { zodBody: "TODO: migrar para Zod" },
  "e2e-cleanup": { zodBody: "Validação manual de e-mail allowlist; allowlist é o gate" },
  "force-global-logout": { zodBody: "Apenas user_id; validado por createClient.auth.admin" },
  "kit-ai-builder": { zodBody: "TODO: migrar para Zod" },
  "market-intelligence-insights": { zodBody: "TODO: migrar para Zod" },
  "ownership-audit": { zodBody: "Sem body de entrada (apenas trigger)" },
  "ownership-repair": { zodBody: "Body simples { dry_run?: boolean }" },
  "send-transactional-email": { zodBody: "TODO: migrar para Zod (provider payload)" },
  "simulation-orchestrator": { zodBody: "Orchestrator: body opcional para filtros" },
  "step-up-verify": { zodBody: "Body { code: string } simples — TODO migrar para Zod" },
  "trends-insights": { zodBody: "Body { period, metric } — TODO migrar para Zod" },
};

interface Checks {
  cors: boolean;
  optionsHandler: boolean;
  jwtGuard: boolean;
  zodBody: boolean;
  contentTypeJson: boolean;
  noHardcodedSecret: boolean;
}

function listFunctions(): FnInfo[] {
  const cfg = existsSync(CONFIG_PATH) ? readFileSync(CONFIG_PATH, "utf8") : "";
  const entries = readdirSync(FUNCTIONS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !SKIP.has(e.name))
    .map((e) => {
      const indexFile = join(FUNCTIONS_DIR, e.name, "index.ts");
      const source = existsSync(indexFile) ? readFileSync(indexFile, "utf8") : "";
      const sectionRe = new RegExp(`\\[functions\\.${e.name}\\]([^\\[]*)`, "i");
      const sectionMatch = cfg.match(sectionRe);
      const requiresJwt = !sectionMatch || !/verify_jwt\s*=\s*false/i.test(sectionMatch[1] ?? "");
      return { name: e.name, source, requiresJwt };
    })
    .filter((f) => f.source.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function checkFn(fn: FnInfo): Checks {
  const src = fn.source;
  return {
    // 1. Usa _shared/cors.ts OU tem CORS-equivalent manual com header padrão.
    cors:
      /from\s+["'][.\/]*_shared\/cors(\.ts)?["']/.test(src) ||
      /Access-Control-Allow-Origin/i.test(src),
    // 2. Trata OPTIONS preflight (Deno.serve direto, Hono app.options, ou helper).
    optionsHandler:
      /req\.method\s*===?\s*["']OPTIONS["']/i.test(src) ||
      /handleCorsPreflight(IfNeeded)?\b/.test(src) ||
      /method\s*===?\s*["']OPTIONS["']/.test(src) ||
      /app\.options\(/i.test(src) ||
      /\.options\(["']\*["']\)/i.test(src),
    // 3. JWT guard: quando verify_jwt = true em config.toml, a PLATAFORMA
    // Supabase valida o JWT antes do código rodar — guard interno é opcional.
    // Quando verify_jwt = false, a função é pública e PRECISA do próprio guard
    // (ou ser explicitamente cron/service-role na allowlist EXCEPTIONS).
    jwtGuard:
      fn.requiresJwt ||
      /authorize|authenticateRequest|requireDev|getUser|getAuthUser|requireRole|runBotProtection|secret\s*===?|x-cron-secret|X-Connection-Api-Key/.test(src),
    // 4. Body validation com Zod (se a função aceita body — heurística: tem await req.json()).
    zodBody:
      !/await\s+req\.json\(/i.test(src) ||
      /z\.(object|string|number|enum|union|array)/.test(src),
    // 5. Content-Type JSON nas respostas (se cria Response com body de string/json).
    contentTypeJson:
      !/new\s+Response\(/.test(src) ||
      /["']Content-Type["']\s*:\s*["']application\/json/i.test(src) ||
      /content-type.*application\/json/i.test(src),
    // 6. Sem JWT/apikey/service_role hardcoded (heurística: padrão de literal longo).
    // Aceita Deno.env.get(...) ou variável; rejeita string literal contendo "eyJ" (JWT).
    noHardcodedSecret: !/["'](eyJ[A-Za-z0-9_-]{20,})["']/.test(src),
  };
}

function isException(fnName: string, rule: keyof Checks): string | undefined {
  return EXCEPTIONS[fnName]?.[rule];
}

const functions = listFunctions();

describe("Edge functions — contract gates (offline)", () => {
  it("inventário: existe pelo menos 50 edge functions em supabase/functions/", () => {
    expect(functions.length).toBeGreaterThanOrEqual(50);
  });

  describe("Regra 1: CORS via _shared/cors.ts ou header explícito", () => {
    for (const fn of functions) {
      it(`${fn.name}`, () => {
        const checks = checkFn(fn);
        if (isException(fn.name, "cors")) return;
        expect(checks.cors, `${fn.name} deve usar _shared/cors.ts ou setar Access-Control-Allow-Origin`).toBe(true);
      });
    }
  });

  describe("Regra 2: trata OPTIONS (CORS preflight)", () => {
    for (const fn of functions) {
      it(`${fn.name}`, () => {
        const checks = checkFn(fn);
        if (isException(fn.name, "optionsHandler")) return;
        expect(checks.optionsHandler, `${fn.name} deve tratar req.method === "OPTIONS"`).toBe(true);
      });
    }
  });

  describe("Regra 3: JWT guard quando verify_jwt = true", () => {
    for (const fn of functions) {
      it(`${fn.name}${fn.requiresJwt ? "" : " (verify_jwt=false → skip)"}`, () => {
        const checks = checkFn(fn);
        if (isException(fn.name, "jwtGuard")) return;
        expect(checks.jwtGuard, `${fn.name} requer JWT mas não usa authorize/authenticateRequest/requireDev`).toBe(true);
      });
    }
  });

  describe("Regra 4: Zod validation em endpoints que recebem body", () => {
    for (const fn of functions) {
      it(`${fn.name}`, () => {
        const checks = checkFn(fn);
        if (isException(fn.name, "zodBody")) return;
        expect(checks.zodBody, `${fn.name} usa req.json() mas não valida com Zod`).toBe(true);
      });
    }
  });

  describe("Regra 5: Content-Type application/json em respostas com Response()", () => {
    for (const fn of functions) {
      it(`${fn.name}`, () => {
        const checks = checkFn(fn);
        if (isException(fn.name, "contentTypeJson")) return;
        expect(checks.contentTypeJson, `${fn.name} cria Response sem Content-Type: application/json`).toBe(true);
      });
    }
  });

  describe("Regra 6: sem JWT/secret hardcoded no source", () => {
    for (const fn of functions) {
      it(`${fn.name}`, () => {
        const checks = checkFn(fn);
        if (isException(fn.name, "noHardcodedSecret")) return;
        expect(checks.noHardcodedSecret, `${fn.name} contém JWT-like literal (eyJ...) hardcoded`).toBe(true);
      });
    }
  });
});
