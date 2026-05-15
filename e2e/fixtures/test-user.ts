/**
 * Identidade canônica do usuário de teste E2E.
 *
 * Centraliza:
 *  - email / senha vindos das envs (E2E_USER_EMAIL / E2E_USER_PASSWORD)
 *  - prefixo determinístico (E2E_TEST_PREFIX) para nomear recursos criados
 *    nos testes (orçamentos, coleções, listas, etc.). Default: "[E2E]".
 *  - resolução cacheada do `user_id` autenticado, lida do próprio
 *    storageState do Supabase no `localStorage` (sb-<ref>-auth-token).
 *  - geração de nomes únicos com o prefixo + timestamp + random, para
 *    que o cleanup automático possa filtrar APENAS o que os E2E criaram.
 *
 * Uso típico em um spec:
 *   import { getTestUserEmail, getTestUserId, e2eName } from "../fixtures/test-user";
 *
 *   const email = getTestUserEmail();
 *   const userId = await getTestUserId(page);
 *   const quoteName = e2eName("orcamento");
 *
 * Cleanup server-side (edge function `e2e-cleanup`) continua resolvendo o
 * user_id pelo email — esses helpers garantem que client e server estão
 * falando do MESMO usuário e que recursos criados sejam reconhecíveis.
 */
import type { Page } from "@playwright/test";

const DEFAULT_PREFIX = "[E2E]";

export function getTestUserEmail(): string {
  const email = process.env.E2E_USER_EMAIL;
  if (!email) {
    throw new Error(
      "E2E_USER_EMAIL não definido — defina nas envs antes de rodar specs autenticados.",
    );
  }
  return email.trim().toLowerCase();
}

export function getTestUserPassword(): string {
  const pw = process.env.E2E_USER_PASSWORD;
  if (!pw) {
    throw new Error("E2E_USER_PASSWORD não definido.");
  }
  return pw;
}

/**
 * Prefixo único usado para nomear recursos criados nos E2E.
 * Configurável via `E2E_TEST_PREFIX`. Sempre termina sem espaço extra.
 */
export function getTestPrefix(): string {
  return (process.env.E2E_TEST_PREFIX || DEFAULT_PREFIX).trim();
}

/**
 * Deriva um sub-prefixo determinístico a partir de um slug de spec
 * (ex.: "quote-create"). Garante isolamento por spec/feature: cleanup
 * pós-falha pode filtrar por `[E2E:quote-create]` sem tocar em recursos
 * vivos de specs paralelos `[E2E:kit-builder]`.
 *
 * O slug é normalizado: apenas [a-zA-Z0-9-], truncado a 32 chars.
 */
export function e2eScope(specSlug: string): string {
  const safe = specSlug.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "spec";
  return `[E2E:${safe}]`;
}

/**
 * Gera um nome único e reconhecível para um recurso criado pelo E2E.
 *
 *   e2eName("orcamento")                        -> "[E2E] orcamento 1730000000000-a1b2"
 *   e2eName("orcamento", { prefix: "[E2E:qc]" }) -> "[E2E:qc] orcamento 1730000000000-a1b2"
 *
 * O `prefix` opcional permite escopar por spec via `e2eScope(slug)` —
 * usado pela fixture `e2eResources` em `test-base.ts`.
 */
export function e2eName(label: string, opts: { prefix?: string } = {}): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  const prefix = opts.prefix ?? getTestPrefix();
  return `${prefix} ${label} ${ts}-${rand}`;
}

/**
 * Verifica se um nome arbitrário foi gerado pelo E2E (heurística pelo prefixo).
 * Aceita o prefixo global E2E_TEST_PREFIX OU qualquer sub-prefixo `[E2E:*]`.
 */
export function isE2eName(name: string | null | undefined): boolean {
  if (!name) return false;
  if (name.startsWith(getTestPrefix())) return true;
  return /^\[E2E:[a-zA-Z0-9-]{1,32}\]/.test(name);
}

const userIdCache = new WeakMap<Page, string>();

/**
 * Resolve o `user_id` do usuário autenticado lendo o token do Supabase
 * persistido no `localStorage` (`sb-<projectRef>-auth-token`).
 *
 * Requer que o spec já tenha o storageState autenticado carregado e
 * que a página esteja na origin do app (qualquer rota serve).
 *
 * Resultado é cacheado por `Page` para evitar reler o storage múltiplas vezes.
 */
export async function getTestUserId(page: Page): Promise<string> {
  const cached = userIdCache.get(page);
  if (cached) return cached;

  // Precisa estar na origin para localStorage estar acessível.
  if (!/^https?:/.test(page.url())) {
    await page.goto("/produtos", { waitUntil: "domcontentloaded" }).catch(() => {});
  }

  const userId = await page.evaluate(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const id = parsed?.user?.id ?? parsed?.currentSession?.user?.id;
        if (typeof id === "string" && id.length > 0) return id;
      }
    } catch {
      /* noop */
    }
    return null;
  });

  if (!userId) {
    throw new Error(
      "Não foi possível resolver o user_id do usuário de teste — confirme que o storageState autenticado foi carregado e que a página está na origin do app.",
    );
  }
  userIdCache.set(page, userId);
  return userId;
}

/**
 * Conjunto consolidado da identidade do usuário de teste, conveniente
 * para passar a helpers de cleanup ou a edge functions.
 */
export interface TestUserIdentity {
  email: string;
  userId: string;
  prefix: string;
}

export async function getTestUserIdentity(page: Page): Promise<TestUserIdentity> {
  return {
    email: getTestUserEmail(),
    userId: await getTestUserId(page),
    prefix: getTestPrefix(),
  };
}
