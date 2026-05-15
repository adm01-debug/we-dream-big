/**
 * Fábrica de mock do cliente Supabase para testes de mutação.
 *
 * Captura todos os payloads enviados a `.insert()` / `.update()` / `.delete()`
 * e os filtros aplicados, permitindo que os testes asseverem que `seller_id`
 * (ou `user_id`) está presente e corresponde ao usuário autenticado.
 *
 * Uso:
 *   const sb = createSupabaseMock({
 *     selects: { quotes: [{ id: "q1", status: "approved", ... }] },
 *   });
 *   vi.doMock("@/integrations/supabase/client", () => ({ supabase: sb.client }));
 *   ...
 *   expect(sb.calls.insert).toContainEqual({ table: "orders", payload: expect.objectContaining({ seller_id: "u1" }) });
 */
import { vi } from "vitest";

export interface MutationCall {
  table: string;
  payload: unknown;
}
export interface UpdateCall extends MutationCall {
  filters: Array<{ column: string; value: unknown }>;
}

export interface SupabaseMock {
  client: {
    from: (table: string) => Record<string, unknown>;
    auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  };
  calls: {
    insert: MutationCall[];
    update: UpdateCall[];
    delete: UpdateCall[];
  };
}

interface MockOptions {
  /** Resposta de `select(...).eq(...).maybeSingle()` por tabela. */
  selects?: Record<string, unknown[] | unknown>;
  /** Resposta default do `.insert(...).select().single()`. Default: ecoa o payload com id sintético. */
  insertReturn?: (table: string, payload: unknown) => unknown;
  /** Erro a injetar em uma operação específica. */
  errorOn?: { op: "insert" | "update" | "delete"; table: string; message: string };
}

export function createSupabaseMock(opts: MockOptions = {}): SupabaseMock {
  const calls: SupabaseMock["calls"] = { insert: [], update: [], delete: [] };

  function builder(table: string) {
    const filters: Array<{ column: string; value: unknown }> = [];
    let pendingOp: "insert" | "update" | "delete" | "select" | null = null;
    let pendingPayload: unknown = undefined;

    const api: Record<string, unknown> = {};

    api.select = vi.fn(() => api);
    api.eq = vi.fn((column: string, value: unknown) => {
      filters.push({ column, value });
      return api;
    });
    api.in = vi.fn(() => api);
    api.order = vi.fn(() => api);
    api.limit = vi.fn(() => api);

    api.insert = vi.fn((payload: unknown) => {
      pendingOp = "insert";
      pendingPayload = payload;
      calls.insert.push({ table, payload });
      return api;
    });
    api.update = vi.fn((payload: unknown) => {
      pendingOp = "update";
      pendingPayload = payload;
      return api;
    });
    api.delete = vi.fn(() => {
      pendingOp = "delete";
      return api;
    });

    const rawSelect = () => opts.selects?.[table];
    const firstOrNull = () => {
      const sel = rawSelect();
      if (Array.isArray(sel)) return sel[0] ?? null;
      return sel ?? null;
    };

    const errorFor = (op: "insert" | "update" | "delete") =>
      opts.errorOn && opts.errorOn.op === op && opts.errorOn.table === table
        ? { message: opts.errorOn.message }
        : null;

    api.maybeSingle = vi.fn(async () => ({ data: firstOrNull(), error: null }));
    api.single = vi.fn(async () => {
      if (pendingOp === "insert") {
        const err = errorFor("insert");
        if (err) return { data: null, error: err };
        const ret = opts.insertReturn
          ? opts.insertReturn(table, pendingPayload)
          : { id: `mock-${table}-id`, ...(pendingPayload as object) };
        return { data: ret, error: null };
      }
      return { data: firstOrNull(), error: null };
    });

    // `.from(...).insert(...).select(...)` resolve via then com o registro inserido.
    // `.from(...).select(...).eq(...)` resolve via then com array (multi-row).
    // `.from(...).update(...).eq(...)` / `.delete().eq(...)` registram a chamada.
    api.then = vi.fn(async (resolve: (r: unknown) => void) => {
      if (pendingOp === "update") {
        calls.update.push({ table, payload: pendingPayload, filters: [...filters] });
        const err = errorFor("update");
        resolve({ data: null, error: err });
        return;
      }
      if (pendingOp === "delete") {
        calls.delete.push({ table, payload: undefined, filters: [...filters] });
        const err = errorFor("delete");
        resolve({ data: null, error: err });
        return;
      }
      if (pendingOp === "insert") {
        const err = errorFor("insert");
        if (err) {
          resolve({ data: null, error: err });
          return;
        }
        const ret = opts.insertReturn
          ? opts.insertReturn(table, pendingPayload)
          : { id: `mock-${table}-id`, ...(pendingPayload as object) };
        resolve({ data: ret, error: null });
        return;
      }
      // select sem terminal — devolve array se houver, senão []
      const sel = rawSelect();
      const data = Array.isArray(sel) ? sel : sel ? [sel] : [];
      resolve({ data, error: null });
    });

    return api;
  }

  return {
    calls,
    client: {
      from: vi.fn(builder),
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: "test-user" } } })),
      },
    },
  };
}
