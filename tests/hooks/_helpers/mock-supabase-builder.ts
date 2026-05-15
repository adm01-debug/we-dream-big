/**
 * Mock Supabase Builder — helpers fluentes para construir mocks de queries
 * encadeadas (`.from().select().eq().order()...`) sem ter que escrever
 * dezenas de `mockReturnThis` em cada teste.
 *
 * Uso típico:
 *
 *   import { supabase } from "@/integrations/supabase/client";
 *   import { mockFromOnce } from "../_helpers/mock-supabase-builder";
 *
 *   mockFromOnce({ data: [{ id: "1" }], error: null });
 *   // ...renderHook do seu hook que chama supabase.from(...)...
 */
import { vi, type Mock } from "vitest";
import { supabase } from "@/integrations/supabase/client";

export type QueryResult<T = unknown> = { data: T | null; error: { message: string; code?: string } | null };

/**
 * Cria um chain mock que resolve em `result` para qualquer terminal
 * (`.single()`, `.maybeSingle()`, `await thenable`).
 */
export function makeChain<T = unknown>(result: QueryResult<T>) {
  const chain: Record<string, unknown> = {};
  const chainable = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte",
    "like", "ilike", "match", "or", "filter",
    "order", "limit", "range", "returns",
  ];
  for (const method of chainable) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: QueryResult<T>) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

/**
 * Faz `supabase.from()` retornar UMA chain customizada na próxima chamada.
 * Subsequentes voltam ao default global.
 */
export function mockFromOnce<T = unknown>(result: QueryResult<T>) {
  const chain = makeChain(result);
  (supabase.from as unknown as Mock).mockReturnValueOnce(chain);
  return chain;
}

/**
 * Faz `supabase.from()` sempre retornar a mesma chain até o próximo reset.
 */
export function mockFromAlways<T = unknown>(result: QueryResult<T>) {
  const chain = makeChain(result);
  (supabase.from as unknown as Mock).mockReturnValue(chain);
  return chain;
}

export function mockFunctionsInvoke<T = unknown>(result: { data: T | null; error: { message: string } | null }) {
  (supabase.functions.invoke as unknown as Mock).mockResolvedValueOnce(result);
}

export function mockRpcOnce<T = unknown>(result: QueryResult<T>) {
  (supabase.rpc as unknown as Mock).mockResolvedValueOnce(result);
}

export function resetSupabaseMocks() {
  (supabase.from as unknown as Mock).mockReset();
  (supabase.functions.invoke as unknown as Mock).mockReset();
  (supabase.rpc as unknown as Mock).mockReset();

  // Restaurar defaults seguros após o reset. Sem isso, mocks ficam retornando
  // undefined e código que faz `const { data, error } = await invoke()` quebra
  // com TypeError ao destruturar. Defaults espelham o mock global de
  // tests/components/render-helpers.tsx (data: null, error: null).
  (supabase.functions.invoke as unknown as Mock).mockResolvedValue({ data: null, error: null });
  (supabase.rpc as unknown as Mock).mockResolvedValue({ data: null, error: null });
}
