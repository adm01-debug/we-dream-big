/**
 * Defesa em profundidade — testes unitários de `applySellerScope` e
 * `shouldShortCircuitForSelf`.
 *
 * Garante que, quando o escopo é "self", a query Supabase é forçada a
 * incluir `.eq("seller_id", userId)` antes de chegar no banco. Mesmo que
 * o RLS esteja correto, a UI nunca deve emitir uma query sem o filtro
 * — isso reduz tráfego e blinda contra regressões de policy.
 */
import { describe, it, expect, vi } from "vitest";
import {
  applySellerScope,
  shouldShortCircuitForSelf,
} from "@/lib/auth/apply-seller-scope";

function makeFakeBuilder() {
  const calls: Array<[string, string]> = [];
  const builder = {
    eq(col: string, val: string) {
      calls.push([col, val]);
      return builder;
    },
  };
  return { builder, calls };
}

describe("applySellerScope", () => {
  it('aplica .eq("seller_id", userId) quando scope = "self"', () => {
    const { builder, calls } = makeFakeBuilder();
    const out = applySellerScope(builder, { scope: "self", userId: "user-1" });
    expect(out).toBe(builder);
    expect(calls).toEqual([["seller_id", "user-1"]]);
  });

  it('NÃO aplica filtro quando scope = "team"', () => {
    const { builder, calls } = makeFakeBuilder();
    applySellerScope(builder, { scope: "team", userId: "user-1" });
    expect(calls).toEqual([]);
  });

  it('NÃO aplica filtro quando scope = "all"', () => {
    const { builder, calls } = makeFakeBuilder();
    applySellerScope(builder, { scope: "all", userId: "user-1" });
    expect(calls).toEqual([]);
  });

  it('NÃO aplica filtro quando scope = "self" mas userId é null/undefined', () => {
    const { builder, calls } = makeFakeBuilder();
    applySellerScope(builder, { scope: "self", userId: null });
    applySellerScope(builder, { scope: "self", userId: undefined });
    expect(calls).toEqual([]);
  });

  it("permite override da coluna (ex.: created_by)", () => {
    const { builder, calls } = makeFakeBuilder();
    applySellerScope(builder, {
      scope: "self",
      userId: "u-9",
      column: "created_by",
    });
    expect(calls).toEqual([["created_by", "u-9"]]);
  });
});

describe("shouldShortCircuitForSelf", () => {
  it('retorna true quando scope = "self" sem userId', () => {
    expect(shouldShortCircuitForSelf("self", null)).toBe(true);
    expect(shouldShortCircuitForSelf("self", undefined)).toBe(true);
    expect(shouldShortCircuitForSelf("self", "")).toBe(true);
  });

  it('retorna false quando scope = "self" com userId presente', () => {
    expect(shouldShortCircuitForSelf("self", "user-1")).toBe(false);
  });

  it('retorna false para scopes não-restritos', () => {
    expect(shouldShortCircuitForSelf("team", null)).toBe(false);
    expect(shouldShortCircuitForSelf("all", null)).toBe(false);
  });
});

/**
 * Smoke test: simula o uso real (cadeia .from().select().eq()) e confirma
 * que .eq("seller_id", ...) foi chamado exatamente uma vez no caminho self.
 */
describe("applySellerScope — uso encadeado realista", () => {
  it("integra com builder mockado tipo PostgrestFilterBuilder", () => {
    const eq = vi.fn().mockReturnThis();
    const builder = { eq, select: vi.fn().mockReturnThis() } as unknown as {
      eq: (c: string, v: string) => typeof builder;
    };
    applySellerScope(builder, { scope: "self", userId: "abc" });
    expect(eq).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith("seller_id", "abc");
  });
});
