/**
 * tests/hooks/quotes/quoteHelpers.freight.test.ts
 *
 * Testes unitários focados nos cálculos de frete dentro de calculateQuoteTotals.
 * Cobre: modes FOB-repassado, FOB-pré-negociado, CIF, arredondamento, edge cases.
 */

import { describe, expect, it } from 'vitest';
import { calculateQuoteTotals, round2 } from '@/hooks/quotes/quoteHelpers';
import type { QuoteItem } from '@/hooks/quotes/quoteTypes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeItem(quantity: number, unit_price: number): QuoteItem {
  return {
    id: `item-${Math.random()}`,
    quote_id: 'q-1',
    product_id: 'p-1',
    product_name: 'Produto Teste',
    quantity,
    unit_price,
    total_price: quantity * unit_price,
    personalizations: [],
  } as unknown as QuoteItem;
}

function items(quantity: number, unitPrice: number): QuoteItem[] {
  return [makeItem(quantity, unitPrice)];
}

// ─── round2 ──────────────────────────────────────────────────────────────────

describe("round2 — arredondamento monetário", () => {
  it("1.005 → 1.01 (half-up)", () => {
    expect(round2(1.005)).toBe(1.01);
  });

  it("1.004 → 1.00 (trunca)", () => {
    expect(round2(1.004)).toBe(1.00);
  });

  it("0 → 0", () => {
    expect(round2(0)).toBe(0);
  });

  it("null → 0", () => {
    expect(round2(null)).toBe(0);
  });

  it("undefined → 0", () => {
    expect(round2(undefined)).toBe(0);
  });

  it("NaN → 0", () => {
    expect(round2(NaN)).toBe(0);
  });

  it("Infinity → 0", () => {
    expect(round2(Infinity)).toBe(0);
  });

  it("-Infinity → 0", () => {
    expect(round2(-Infinity)).toBe(0);
  });

  it("valor negativo arredonda corretamente", () => {
    expect(round2(-1.005)).toBe(-1.00);
  });
});

// ─── calculateQuoteTotals — sem frete ────────────────────────────────────────

describe("calculateQuoteTotals — base sem frete", () => {
  it("subtotal = quantidade × preço unitário", () => {
    const r = calculateQuoteTotals({}, items(10, 5));
    expect(r.subtotal).toBe(50);
  });

  it("total = subtotal sem desconto e sem frete", () => {
    const r = calculateQuoteTotals({}, items(10, 5));
    expect(r.total).toBe(50);
  });

  it("desconto percentual deduz do subtotal", () => {
    const r = calculateQuoteTotals({ discount_percent: 10 }, items(10, 10));
    expect(r.subtotal).toBe(100);
    expect(r.discountAmount).toBe(10);
    expect(r.total).toBe(90);
  });
});

// ─── FOB-repassado (shipping_type = 'fob_rep') ───────────────────────────────

describe("calculateQuoteTotals — FOB repassado ao cliente", () => {
  it("frete NÃO é somado ao total (tipo fob_rep)", () => {
    const r = calculateQuoteTotals(
      { shipping_type: "fob_rep", shipping_cost: 150 },
      items(10, 10),
    );
    expect(r.total).toBe(100);
  });

  it("total é apenas subtotal quando fob_rep", () => {
    const r = calculateQuoteTotals(
      { shipping_type: "fob_rep", shipping_cost: 999 },
      items(5, 20),
    );
    expect(r.total).toBe(100);
  });

  it("shipping_cost null com fob_rep → total = subtotal", () => {
    const r = calculateQuoteTotals(
      { shipping_type: "fob_rep", shipping_cost: null as unknown as number },
      items(2, 50),
    );
    expect(r.total).toBe(100);
  });
});

// ─── FOB-pré-negociado (shipping_type = 'fob_pre') ──────────────────────────

describe("calculateQuoteTotals — FOB pré-negociado", () => {
  it("frete é somado ao total", () => {
    const r = calculateQuoteTotals(
      { shipping_type: "fob_pre", shipping_cost: 150 },
      items(10, 10),
    );
    expect(r.total).toBe(250);
  });

  it("frete R$ 0 não altera total", () => {
    const r = calculateQuoteTotals(
      { shipping_type: "fob_pre", shipping_cost: 0 },
      items(10, 10),
    );
    expect(r.total).toBe(100);
  });

  it("frete decimal arredondado: R$ 33.333 → 33.33 no total", () => {
    const r = calculateQuoteTotals(
      { shipping_type: "fob_pre", shipping_cost: 33.333 },
      items(1, 100),
    );
    expect(r.total).toBe(133.33);
  });

  it("total = subtotal + frete − desconto", () => {
    const r = calculateQuoteTotals(
      { shipping_type: "fob_pre", shipping_cost: 50, discount_percent: 10 },
      items(10, 10),
    );
    // subtotal=100, discount=10, shipping=50, total=140
    expect(r.total).toBe(140);
  });

  it("frete não afeta discountAmount", () => {
    const r = calculateQuoteTotals(
      { shipping_type: "fob_pre", shipping_cost: 200, discount_percent: 20 },
      items(10, 10),
    );
    expect(r.discountAmount).toBe(20);
  });
});

// ─── shipping_type ausente (CIF — frete incluso) ─────────────────────────────

describe("calculateQuoteTotals — CIF (sem shipping_type)", () => {
  it("shipping_cost é ignorado quando shipping_type não é fob_pre", () => {
    const r = calculateQuoteTotals(
      { shipping_cost: 500 },
      items(10, 10),
    );
    expect(r.total).toBe(100);
  });
});

// ─── Markup de negociação ─────────────────────────────────────────────────────

describe("calculateQuoteTotals — markup + frete", () => {
  it("markup 10% + frete fob_pre R$ 50 = (110 + 50) = 160", () => {
    const r = calculateQuoteTotals(
      { negotiation_markup_percent: 10, shipping_type: "fob_pre", shipping_cost: 50 },
      items(10, 10),
    );
    expect(r.subtotal).toBe(110);
    expect(r.total).toBe(160);
  });

  it("markup > 50% lança erro", () => {
    expect(() =>
      calculateQuoteTotals(
        { negotiation_markup_percent: 51, shipping_type: "fob_pre", shipping_cost: 50 },
        items(10, 10),
      )
    ).toThrow(/50%/);
  });

  it("markup = 50% aceita", () => {
    expect(() =>
      calculateQuoteTotals(
        { negotiation_markup_percent: 50 },
        items(10, 10),
      )
    ).not.toThrow();
  });
});

// ─── Personalização nos itens ────────────────────────────────────────────────

describe("calculateQuoteTotals — personalização + frete", () => {
  it("personalização adiciona ao subtotal antes do frete", () => {
    const itemsWithPers: QuoteItem[] = [
      {
        ...makeItem(10, 10),
        personalizations: [{ total_cost: 50 } as never],
      },
    ];
    const r = calculateQuoteTotals(
      { shipping_type: "fob_pre", shipping_cost: 30 },
      itemsWithPers,
    );
    // subtotal = 100 + 50 = 150; total = 150 + 30 = 180
    expect(r.subtotal).toBe(150);
    expect(r.total).toBe(180);
  });
});

// ─── Validação de desconto ────────────────────────────────────────────────────

describe("validateDiscount — integrado via calculateQuoteTotals", () => {
  it("desconto 100% → total = 0 (com frete FOB repassado)", () => {
    const r = calculateQuoteTotals(
      { discount_percent: 100, shipping_type: "fob_rep", shipping_cost: 999 },
      items(10, 10),
    );
    expect(r.total).toBe(0);
  });

  it("desconto > 100% computa total negativo (validateDiscount só é chamado em buildInsertPayload)", () => {
    const r = calculateQuoteTotals({ discount_percent: 101 }, items(10, 10));
    // subtotal = 100, desconto = 101 → total = -1
    expect(r.total).toBeLessThan(0);
    expect(r.discountAmount).toBeGreaterThan(r.subtotal);
  });

  it("desconto negativo aumenta o total (validateDiscount só é chamado em buildInsertPayload)", () => {
    const r = calculateQuoteTotals({ discount_percent: -1 }, items(10, 10));
    // subtotal = 100, desconto = -1 → total = 101
    expect(r.total).toBeGreaterThan(r.subtotal);
  });
});
