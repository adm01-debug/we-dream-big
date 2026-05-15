/**
 * Testes — applySellerScope (defesa em profundidade do filtro seller_id)
 *
 * Garante que a UI aplica o filtro `seller_id = userId` quando o escopo é
 * `self`, e o omite quando o usuário tem visibilidade ampliada
 * (admin/dev/supervisor) — delegando ao RLS do banco.
 */
import { describe, it, expect, vi } from "vitest";
import { applySellerScope, shouldShortCircuitForSelf } from "@/lib/auth/apply-seller-scope";

function makeBuilder() {
  const eq = vi.fn().mockImplementation(function (this: unknown) {
    return this;
  });
  const builder = { eq } as { eq: typeof eq };
  return builder;
}

describe("applySellerScope", () => {
  it("aplica .eq('seller_id', userId) quando escopo é self", () => {
    const b = makeBuilder();
    const out = applySellerScope(b, { scope: "self", userId: "user-1" });
    expect(b.eq).toHaveBeenCalledWith("seller_id", "user-1");
    expect(out).toBe(b);
  });

  it("permite trocar a coluna do filtro (ex.: user_id)", () => {
    const b = makeBuilder();
    applySellerScope(b, { scope: "self", userId: "user-1", column: "user_id" });
    expect(b.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("NÃO aplica filtro quando escopo é all (admin/dev)", () => {
    const b = makeBuilder();
    applySellerScope(b, { scope: "all", userId: "user-1" });
    expect(b.eq).not.toHaveBeenCalled();
  });

  it("NÃO aplica filtro quando escopo é team (delegado ao RLS por organization_id)", () => {
    const b = makeBuilder();
    applySellerScope(b, { scope: "team", userId: "user-1" });
    expect(b.eq).not.toHaveBeenCalled();
  });

  it("NÃO aplica filtro quando userId está ausente, mesmo em self", () => {
    const b = makeBuilder();
    applySellerScope(b, { scope: "self", userId: null });
    expect(b.eq).not.toHaveBeenCalled();
  });
});

describe("shouldShortCircuitForSelf", () => {
  it("retorna true quando self sem userId (não disparar query)", () => {
    expect(shouldShortCircuitForSelf("self", null)).toBe(true);
    expect(shouldShortCircuitForSelf("self", undefined)).toBe(true);
  });

  it("retorna false quando self com userId", () => {
    expect(shouldShortCircuitForSelf("self", "user-1")).toBe(false);
  });

  it("retorna false para escopos amplos (independente de userId)", () => {
    expect(shouldShortCircuitForSelf("all", null)).toBe(false);
    expect(shouldShortCircuitForSelf("team", null)).toBe(false);
  });
});
