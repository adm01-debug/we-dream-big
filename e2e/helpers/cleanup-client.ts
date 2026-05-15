/**
 * Cliente da edge function `e2e-cleanup` reutilizável.
 *
 * Usado pelo globalSetup (limpa ANTES da suite), globalTeardown (limpa
 * DEPOIS) e pela fixture `cleanup-on-failure` (limpa por teste falho).
 *
 * Skip silencioso quando faltam VITE_SUPABASE_URL ou E2E_CLEANUP_TOKEN.
 * Em CI loga warning amarelo; localmente loga em dim para não poluir.
 *
 * Variáveis de ambiente lidas:
 *   - VITE_SUPABASE_URL | SUPABASE_URL
 *   - E2E_CLEANUP_TOKEN
 *   - E2E_USER_EMAIL
 *   - E2E_ADMIN_EMAIL  (opcional)
 *   - E2E_CLEANUP_DRY_RUN ("1" para apenas contar)
 */
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export type CleanupResponse = {
  ok: boolean;
  dryRun: boolean;
  userId?: string;
  email?: string;
  deleted?: Record<string, number>;
  errors?: Record<string, string>;
  totalMs?: number;
  error?: string;
};

export interface CleanupConfig {
  baseUrl: string;
  token: string;
  userEmail?: string;
  adminEmail?: string;
  dryRun: boolean;
  /** "explicit" exige que sellerId resolvido bata com o user_id resolvido por email. */
  sellerScope?: "self" | "explicit";
  /** Quando sellerScope === "explicit", deve bater com o user_id real do email. */
  sellerId?: string;
  /**
   * Quando definido, restringe DELETEs a recursos cujo nome começa com este
   * prefixo (ex.: "[E2E]"). Por padrão usa `getTestPrefix()` para evitar
   * apagar dados criados manualmente fora do escopo dos testes.
   * Para purga total (sem filtro), defina E2E_CLEANUP_NO_NAME_FILTER=1.
   */
  nameFilterPrefix?: string | null;
}

export function loadCleanupConfig(): CleanupConfig | null {
  const baseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const token = process.env.E2E_CLEANUP_TOKEN || "";
  const userEmail = process.env.E2E_USER_EMAIL || "";
  const adminEmail = process.env.E2E_ADMIN_EMAIL || "";
  const dryRun = process.env.E2E_CLEANUP_DRY_RUN === "1";
  const sellerScope: "self" | "explicit" =
    process.env.E2E_CLEANUP_SELLER_SCOPE === "explicit" ? "explicit" : "self";
  const sellerId = process.env.E2E_CLEANUP_SELLER_ID || undefined;

  // Filtro por prefixo de nome — ATIVO POR PADRÃO. Use o mesmo prefixo
  // usado por `e2eName(label)` para garantir paridade.
  const noNameFilter = process.env.E2E_CLEANUP_NO_NAME_FILTER === "1";
  const explicitPrefix = process.env.E2E_TEST_PREFIX?.trim();
  const nameFilterPrefix = noNameFilter
    ? null
    : explicitPrefix && explicitPrefix.length > 0
      ? explicitPrefix
      : "[E2E]"; // fallback alinhado ao DEFAULT_PREFIX de test-user.ts

  if (!baseUrl || !token) return null;
  if (!userEmail && !adminEmail) return null;

  return {
    baseUrl,
    token,
    userEmail,
    adminEmail,
    dryRun,
    sellerScope,
    sellerId,
    nameFilterPrefix,
  };
}

/**
 * Configuração de retry para chamadas à edge `e2e-cleanup`.
 *
 * Política:
 *   - Retry em: erro de rede (timeout/abort/DNS), HTTP 5xx, HTTP 429.
 *   - NÃO retry em: 4xx determinístico (400/401/403/404/409). Esses
 *     significam configuração inválida — retry só esconderia o problema.
 *   - Backoff exponencial: base * 2^attempt, com jitter ±25%, capado por max.
 *   - Em 429 com `Retry-After`/`retry_after_seconds`, usa esse valor (mais
 *     o jitter), respeitando o cap.
 *
 * Defaults sintonizados para CI: 4 tentativas (= até 3 retries), base 500ms,
 * cap 5_000ms, timeout por tentativa 15s. Sobrescrevíveis via env:
 *   E2E_CLEANUP_RETRY_ATTEMPTS, E2E_CLEANUP_RETRY_BASE_MS,
 *   E2E_CLEANUP_RETRY_MAX_MS, E2E_CLEANUP_REQUEST_TIMEOUT_MS.
 */
export interface RetryPolicy {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  requestTimeoutMs: number;
}

export function loadRetryPolicy(): RetryPolicy {
  const num = (k: string, def: number): number => {
    const v = Number(process.env[k]);
    return Number.isFinite(v) && v > 0 ? v : def;
  };
  return {
    attempts: Math.max(1, num("E2E_CLEANUP_RETRY_ATTEMPTS", 4)),
    baseDelayMs: num("E2E_CLEANUP_RETRY_BASE_MS", 500),
    maxDelayMs: num("E2E_CLEANUP_RETRY_MAX_MS", 5_000),
    requestTimeoutMs: num("E2E_CLEANUP_REQUEST_TIMEOUT_MS", 15_000),
  };
}

interface AttemptOutcome {
  /** Resposta parseada (mesmo em falha estruturada). null se nem chegou a parsear. */
  json: CleanupResponse | null;
  /** HTTP status; 0 quando erro de rede. */
  status: number;
  /** "Retry-After" em segundos extraído do header ou body (429). */
  retryAfterSeconds: number | null;
  /** Erro de rede (abort/DNS/etc.) — quando definido, nunca houve resposta HTTP. */
  networkError: Error | null;
}

async function attemptCleanupRequest(
  cfg: CleanupConfig,
  email: string,
  policy: RetryPolicy,
): Promise<AttemptOutcome> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/functions/v1/e2e-cleanup`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), policy.requestTimeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-e2e-cleanup-token": cfg.token,
      },
      body: JSON.stringify({
        email,
        dryRun: cfg.dryRun,
        sellerScope: cfg.sellerScope ?? "self",
        ...(cfg.sellerId ? { sellerId: cfg.sellerId } : {}),
        ...(cfg.nameFilterPrefix
          ? { nameFilterPrefix: cfg.nameFilterPrefix }
          : {}),
      }),
      signal: ctrl.signal,
    });
    const json = (await res.json().catch(() => ({}))) as CleanupResponse;
    const headerRetry = Number(res.headers.get("Retry-After"));
    const bodyRetry = Number(
      (json as unknown as { retry_after_seconds?: number }).retry_after_seconds,
    );
    const retryAfterSeconds = Number.isFinite(headerRetry) && headerRetry > 0
      ? headerRetry
      : Number.isFinite(bodyRetry) && bodyRetry > 0
        ? bodyRetry
        : null;
    return { json, status: res.status, retryAfterSeconds, networkError: null };
  } catch (err) {
    return {
      json: null,
      status: 0,
      retryAfterSeconds: null,
      networkError: err as Error,
    };
  } finally {
    clearTimeout(t);
  }
}

/** true ⇒ tentativa pode ser repetida; false ⇒ resultado é terminal. */
function isRetryable(outcome: AttemptOutcome): boolean {
  if (outcome.networkError) return true; // timeout/abort/DNS/connreset
  if (outcome.status >= 500) return true; // 5xx server-side
  if (outcome.status === 429) return true; // rate limit
  return false; // 2xx (sucesso) ou 4xx determinístico
}

/**
 * Calcula delay com backoff exponencial + jitter ±25%, respeitando
 * `Retry-After` quando presente. Sempre limitado ao `maxDelayMs`.
 */
function computeBackoff(
  attempt: number,
  policy: RetryPolicy,
  retryAfterSeconds: number | null,
): number {
  const base = retryAfterSeconds !== null
    ? retryAfterSeconds * 1000
    : policy.baseDelayMs * 2 ** attempt;
  const jitter = base * (0.75 + Math.random() * 0.5); // ±25%
  return Math.min(Math.round(jitter), policy.maxDelayMs);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface PurgeOpts {
  quiet?: boolean;
  reason?: string;
  retryPolicy?: RetryPolicy;
  /**
   * Sobrescreve `cfg.nameFilterPrefix` apenas para esta chamada. Use para
   * cleanup escopado por spec (ex.: prefixo `[E2E:quote-create]` derivado
   * de `e2eScope`). Passe `null` para forçar purga sem filtro de nome.
   */
  nameFilterPrefix?: string | null;
}

export async function purgeOne(
  cfg: CleanupConfig,
  email: string,
  opts: PurgeOpts = {},
): Promise<CleanupResponse | null> {
  const policy = opts.retryPolicy ?? loadRetryPolicy();
  const effectiveCfg: CleanupConfig =
    opts.nameFilterPrefix !== undefined
      ? { ...cfg, nameFilterPrefix: opts.nameFilterPrefix }
      : cfg;
  let lastOutcome: AttemptOutcome | null = null;

  for (let attempt = 0; attempt < policy.attempts; attempt++) {
    const outcome = await attemptCleanupRequest(effectiveCfg, email, policy);
    lastOutcome = outcome;

    const isLastAttempt = attempt === policy.attempts - 1;
    if (!isRetryable(outcome) || isLastAttempt) {
      // Sai do loop: terminal (sucesso/4xx) ou esgotou as tentativas.
      break;
    }

    const delay = computeBackoff(attempt, policy, outcome.retryAfterSeconds);
    const reasonStr = outcome.networkError
      ? `network: ${outcome.networkError.message}`
      : `HTTP ${outcome.status}`;
    console.warn(
      `${YELLOW}[e2e-cleanup] retry ${attempt + 1}/${policy.attempts - 1} ` +
        `em ${delay}ms (${reasonStr}) p/ ${email}${RESET}`,
    );
    await sleep(delay);
  }

  if (!lastOutcome) return null;

  // Falha de rede após todas as tentativas
  if (lastOutcome.networkError && !lastOutcome.json) {
    console.warn(
      `${RED}[e2e-cleanup] erro de rede ao limpar ${email} após ${policy.attempts} ` +
        `tentativa(s): ${String(lastOutcome.networkError)}${RESET}`,
    );
    return null;
  }

  const json = lastOutcome.json ?? ({} as CleanupResponse);

  // Resposta com erro estruturado (4xx/5xx parseados)
  if (lastOutcome.status >= 400 || !json.ok) {
    console.warn(
      `${YELLOW}[e2e-cleanup] falha para ${email}: HTTP ${lastOutcome.status} ${json.error ?? ""}${RESET}`,
    );
    return json;
  }

  // Sucesso
  if (!opts.quiet) {
    const deleted = json.deleted ?? {};
    const total = Object.values(deleted).reduce((a, b) => a + b, 0);
    const tag = json.dryRun ? "DRY-RUN" : "DELETED";
    const reason = opts.reason ? ` ${DIM}[${opts.reason}]${RESET}` : "";
    const scope = effectiveCfg.nameFilterPrefix
      ? ` ${DIM}<${effectiveCfg.nameFilterPrefix}>${RESET}`
      : "";
    console.log(
      `${GREEN}[e2e-cleanup] ${tag} ${total} linha(s) para ${email}${RESET}${reason}${scope} ${DIM}(${json.totalMs ?? 0}ms)${RESET}`,
    );
    const rows = Object.entries(deleted)
      .filter(([, n]) => n > 0)
      .map(([t, n]) => `  · ${t.padEnd(32)} ${n}`)
      .join("\n");
    if (rows) console.log(rows);
    if (json.errors && Object.keys(json.errors).length > 0) {
      console.warn(
        `${YELLOW}[e2e-cleanup] avisos:${RESET}\n${Object.entries(json.errors)
          .map(([t, e]) => `  · ${t}: ${e}`)
          .join("\n")}`,
      );
    }
  }
  return json;
}

/**
 * Purga TODOS os usuários configurados (user + admin se distintos).
 * Aceita `nameFilterPrefix` para escopar por spec — propaga para `purgeOne`.
 */
export async function purgeAll(
  cfg: CleanupConfig,
  opts: PurgeOpts = {},
): Promise<void> {
  const seen = new Set<string>();
  if (cfg.userEmail) {
    seen.add(cfg.userEmail.toLowerCase());
    await purgeOne(cfg, cfg.userEmail, opts);
  }
  if (cfg.adminEmail && !seen.has(cfg.adminEmail.toLowerCase())) {
    await purgeOne(cfg, cfg.adminEmail, opts);
  }
}

export function logSkipReason(phase: "setup" | "teardown"): void {
  const baseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const token = process.env.E2E_CLEANUP_TOKEN || "";
  const hasEmail = !!(process.env.E2E_USER_EMAIL || process.env.E2E_ADMIN_EMAIL);

  let msg = `[e2e-cleanup:${phase}] pulado — `;
  if (!baseUrl || !token) {
    msg += "VITE_SUPABASE_URL ou E2E_CLEANUP_TOKEN ausentes.";
  } else if (!hasEmail) {
    msg += "nenhum E2E_USER_EMAIL/E2E_ADMIN_EMAIL definido.";
  } else {
    msg += "configuração incompleta.";
  }
  if (process.env.CI) console.warn(`${YELLOW}${msg}${RESET}`);
  else console.log(`${DIM}${msg}${RESET}`);
}
