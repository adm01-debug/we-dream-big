// supabase/functions/_shared/external-db-cache.ts
// In-memory cache (survives across requests within same isolate).
//
// Suporta TTL por entrada para diferenciar:
//   - Tabelas estáticas (categorias, fornecedores) → 10min
//   - Listings dinâmicos (products lightweight) → 60s
//
// O TTL default permanece 10min para preservar compatibilidade com chamadas
// existentes que não passam ttlMs explícito.

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10min — tabelas estáticas
const referenceCache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = referenceCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    referenceCache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Armazena valor com TTL opcional. Default = 10min.
 * Use TTL menor (ex.: 60_000) para listings dinâmicos.
 */
export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  referenceCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}
