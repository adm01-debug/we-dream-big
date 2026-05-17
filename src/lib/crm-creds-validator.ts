/**
 * Valida no boot da aplicação se o `crm-db-bridge` tem credenciais
 * (CRM_SUPABASE_URL e CRM_SUPABASE_SERVICE_KEY / ANON_KEY) resolvidas
 * antes de qualquer chamada real ao CRM.
 *
 * Estratégia: chama `?op=creds_health` (endpoint bypass-auth) e analisa
 * o snapshot agregado `{ health: 'healthy' | 'degraded' | 'missing' }`.
 *
 * Resultado é cacheado por 60s (sessionStorage) para evitar bater na edge
 * a cada navegação. Em caso de falha, libera o cache imediatamente para
 * forçar nova verificação no próximo gatilho.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type CrmCredsHealth = 'healthy' | 'degraded' | 'missing' | 'unknown';

export interface CrmCredsValidationResult {
  ok: boolean;
  health: CrmCredsHealth;
  details?: {
    url?: { present: boolean; source: string; resolved_name: string };
    serviceKey?: { present: boolean; source: string; resolved_name: string };
    anonKey?: { present: boolean; source: string; resolved_name: string };
  };
  error?: string;
}

interface CredEntry {
  name: string;
  present: boolean;
  source: string;
  resolved_name: string;
}

interface CredsHealthResponse {
  ok?: boolean;
  health?: CrmCredsHealth;
  credentials?: CredEntry[];
  error?: string;
}

const CACHE_KEY = '__crm_creds_validated__';
const CACHE_TTL_MS = 60_000;

interface CachedResult {
  ts: number;
  result: CrmCredsValidationResult;
}

function readCache(): CrmCredsValidationResult | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedResult;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.result;
  } catch {
    return null;
  }
}

function writeCache(result: CrmCredsValidationResult): void {
  try {
    if (result.ok) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), result } satisfies CachedResult));
    } else {
      sessionStorage.removeItem(CACHE_KEY);
    }
  } catch {
    /* ignore quota errors */
  }
}

let inflight: Promise<CrmCredsValidationResult> | null = null;

/**
 * Verifica e retorna o estado atual das credenciais do CRM.
 * Coalesce chamadas concorrentes. Cacheia sucesso por 60s.
 */
export async function validateCrmCredentials(force = false): Promise<CrmCredsValidationResult> {
  if (!force) {
    const cached = readCache();
    if (cached) return cached;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke<CredsHealthResponse>(
        'crm-db-bridge?op=creds_health',
        { body: { operation: 'creds_health' } },
      );

      if (error) {
        const result: CrmCredsValidationResult = {
          ok: false,
          health: 'unknown',
          error: `Falha ao chamar crm-db-bridge: ${error.message}`,
        };
        logger.warn('[CRM-Creds-Validator] ⚠️ Não foi possível verificar credenciais:', result.error);
        writeCache(result);
        return result;
      }

      const credentials = data?.credentials ?? [];
      const findCred = (name: string) => credentials.find((c) => c.name === name);
      const urlCred = findCred('EXTERNAL_CRM_URL');
      const svcCred = findCred('EXTERNAL_CRM_SERVICE_ROLE_KEY');
      const anonCred = findCred('EXTERNAL_CRM_ANON_KEY');

      const details = {
        url: urlCred
          ? { present: urlCred.present, source: urlCred.source, resolved_name: urlCred.resolved_name }
          : undefined,
        serviceKey: svcCred
          ? { present: svcCred.present, source: svcCred.source, resolved_name: svcCred.resolved_name }
          : undefined,
        anonKey: anonCred
          ? { present: anonCred.present, source: anonCred.source, resolved_name: anonCred.resolved_name }
          : undefined,
      };

      const health = (data?.health ?? 'unknown') as CrmCredsHealth;
      const ok = health === 'healthy';

      const result: CrmCredsValidationResult = { ok, health, details };

      if (ok) {
        logger.log(
          `[CRM-Creds-Validator] ✅ Credenciais OK: URL=${details.url?.resolved_name}(${details.url?.source}) ` +
            `KEY=${details.serviceKey?.present ? details.serviceKey.resolved_name : details.anonKey?.resolved_name}` +
            `(${details.serviceKey?.present ? details.serviceKey.source : details.anonKey?.source})`,
        );
      } else {
        logger.error(
          `[CRM-Creds-Validator] ❌ Credenciais ${health.toUpperCase()} — chamadas ao CRM vão falhar com 500. ` +
            `URL_present=${!!details.url?.present} SERVICE_present=${!!details.serviceKey?.present} ` +
            `ANON_present=${!!details.anonKey?.present}`,
        );
      }

      writeCache(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const result: CrmCredsValidationResult = {
        ok: false,
        health: 'unknown',
        error: `Exceção ao validar credenciais: ${msg}`,
      };
      logger.warn('[CRM-Creds-Validator] ⚠️ Exceção:', msg);
      writeCache(result);
      return result;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Limpa cache — chamar em logout ou ao alternar de ambiente. */
export function resetCrmCredsValidation(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
