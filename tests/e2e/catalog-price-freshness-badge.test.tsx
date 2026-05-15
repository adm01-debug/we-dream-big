/**
 * E2E — Visibilidade do PriceFreshnessBadge no fluxo de catálogo.
 *
 * Percorre os 4 pontos de exibição do catálogo (card, card aprimorado,
 * lista, tabela e quick view) usando exatamente as mesmas props que cada
 * componente real chama em produção, e valida:
 *
 *   1. variant="icon-only" (ProductCard, EnhancedProductCard, ProductTableView):
 *      só renderiza quando aging/stale.
 *   2. variant="compact"   (ProductListItem):
 *      só renderiza quando aging/stale.
 *   3. variant="inline" + alwaysShow (ProductQuickView):
 *      SEMPRE renderiza, em qualquer estado (incluindo fresh/unknown).
 *
 * Os componentes "host" (cards, lista, tabela, quick view) trazem dezenas
 * de dependências (gallery, favoritos, comparador, hooks de estoque,
 * supplier trust, etc.). Esta suíte E2E preserva o contrato visual do
 * catálogo isolando o ponto que importa — o badge — e variando o produto
 * pela mesma matriz de freshness percorrida em produção. Se alguém trocar
 * a variant em qualquer um dos hosts (ex.: passar inline no card), os
 * snapshots dedicados de cada host quebram; se mudarem a regra de
 * visibilidade do próprio badge, ESTA suíte quebra primeiro com uma
 * mensagem legível ("card icon-only deve ficar invisível em fresh").
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";

const FIXED_NOW = new Date("2026-04-24T12:00:00.000Z").getTime();
const daysAgo = (d: number) =>
  new Date(FIXED_NOW - d * 86400000).toISOString();

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});
afterAll(() => {
  vi.useRealTimers();
});

/**
 * Conjunto de produtos do catálogo simulado — um por estado de
 * freshness. Threshold default 60d (igual ao do banco externo).
 */
const CATALOG = [
  {
    id: "fresh",
    name: "Caneta Fresh",
    price: 5.5,
    priceUpdatedAt: daysAgo(5),
    priceFreshnessThresholdDays: 60,
  },
  {
    id: "aging",
    name: "Mochila Aging",
    price: 89.9,
    priceUpdatedAt: daysAgo(45),
    priceFreshnessThresholdDays: 60,
  },
  {
    id: "stale",
    name: "Squeeze Stale",
    price: 35,
    priceUpdatedAt: daysAgo(90),
    priceFreshnessThresholdDays: 60,
  },
  {
    id: "unknown",
    name: "Chaveiro Unknown",
    price: 8.9,
    priceUpdatedAt: null,
    priceFreshnessThresholdDays: 60,
  },
] as const;

/**
 * Renderiza a invocação EXATA usada por cada host em produção,
 * encapsulando o badge num wrapper data-testid para identificação no
 * percurso. Mudança de assinatura em qualquer host quebra também os
 * testes específicos daquele host; este E2E foca no contrato de
 * visibilidade.
 */
function renderCatalogRow(product: (typeof CATALOG)[number]) {
  return render(
    <div data-testid={`catalog-row-${product.id}`}>
      {/* ProductCard.tsx — variant="icon-only" */}
      <div data-testid={`card-${product.id}`}>
        <PriceFreshnessBadge
          priceUpdatedAt={product.priceUpdatedAt}
          thresholdDays={product.priceFreshnessThresholdDays}
          variant="icon-only"
        />
      </div>
      {/* EnhancedProductCard.tsx — também variant="icon-only" */}
      <div data-testid={`enhanced-card-${product.id}`}>
        <PriceFreshnessBadge
          priceUpdatedAt={product.priceUpdatedAt}
          thresholdDays={product.priceFreshnessThresholdDays}
          variant="icon-only"
        />
      </div>
      {/* ProductListItem.tsx — variant="compact" */}
      <div data-testid={`list-${product.id}`}>
        <PriceFreshnessBadge
          priceUpdatedAt={product.priceUpdatedAt}
          thresholdDays={product.priceFreshnessThresholdDays}
          variant="compact"
        />
      </div>
      {/* ProductTableView.tsx — variant="icon-only" */}
      <div data-testid={`table-${product.id}`}>
        <PriceFreshnessBadge
          priceUpdatedAt={product.priceUpdatedAt}
          thresholdDays={product.priceFreshnessThresholdDays}
          variant="icon-only"
        />
      </div>
      {/* ProductQuickView.tsx — variant="inline" + alwaysShow */}
      <div data-testid={`quickview-${product.id}`}>
        <PriceFreshnessBadge
          priceUpdatedAt={product.priceUpdatedAt}
          thresholdDays={product.priceFreshnessThresholdDays}
          variant="inline"
          alwaysShow
        />
      </div>
    </div>,
  );
}

/** Conta badges (role=status) dentro de um wrapper testid. */
function badgeCountIn(testId: string): number {
  const wrapper = screen.getByTestId(testId);
  return wrapper.querySelectorAll('[role="status"]').length;
}

describe("E2E Catálogo — visibilidade do PriceFreshnessBadge por host", () => {
  describe("Produto FRESH (5d, threshold 60d) — preço dentro do prazo", () => {
    beforeEach(() => renderCatalogRow(CATALOG[0]));

    it("Card (icon-only) NÃO renderiza badge", () => {
      expect(badgeCountIn("card-fresh")).toBe(0);
    });
    it("EnhancedCard (icon-only) NÃO renderiza badge", () => {
      expect(badgeCountIn("enhanced-card-fresh")).toBe(0);
    });
    it("Lista (compact) NÃO renderiza badge", () => {
      expect(badgeCountIn("list-fresh")).toBe(0);
    });
    it("Tabela (icon-only) NÃO renderiza badge", () => {
      expect(badgeCountIn("table-fresh")).toBe(0);
    });
    it("Quick View (inline + alwaysShow) RENDERIZA badge mesmo em fresh", () => {
      expect(badgeCountIn("quickview-fresh")).toBe(1);
      const badge = screen.getByTestId("quickview-fresh").querySelector('[role="status"]')!;
      expect(badge.textContent).toMatch(/atualizado/i);
      expect(badge.className).toMatch(/emerald-(200|400|500|700)/);
    });
  });

  describe("Produto AGING (45d, threshold 60d) — próximo do limite", () => {
    beforeEach(() => renderCatalogRow(CATALOG[1]));

    it("Card (icon-only) RENDERIZA badge amber", () => {
      expect(badgeCountIn("card-aging")).toBe(1);
      const badge = screen.getByTestId("card-aging").querySelector('[role="status"]')!;
      expect(badge.className).toMatch(/text-amber-700/);
    });
    it("EnhancedCard (icon-only) RENDERIZA badge amber", () => {
      expect(badgeCountIn("enhanced-card-aging")).toBe(1);
    });
    it("Lista (compact) RENDERIZA badge com 'há Nd'", () => {
      expect(badgeCountIn("list-aging")).toBe(1);
      const badge = screen.getByTestId("list-aging").querySelector('[role="status"]')!;
      expect(badge.textContent).toMatch(/há \d+[dma]/);
    });
    it("Tabela (icon-only) RENDERIZA badge amber", () => {
      expect(badgeCountIn("table-aging")).toBe(1);
    });
    it("Quick View (inline + alwaysShow) RENDERIZA badge", () => {
      expect(badgeCountIn("quickview-aging")).toBe(1);
    });
  });

  describe("Produto STALE (90d, threshold 60d) — preço defasado", () => {
    beforeEach(() => renderCatalogRow(CATALOG[2]));

    it("Card (icon-only) RENDERIZA badge de alerta", () => {
      expect(badgeCountIn("card-stale")).toBe(1);
      const badge = screen.getByTestId("card-stale").querySelector('[role="status"]')!;
      expect(badge.getAttribute("aria-label")).toMatch(/possivelmente defasado/i);
    });
    it("EnhancedCard (icon-only) RENDERIZA badge de alerta", () => {
      expect(badgeCountIn("enhanced-card-stale")).toBe(1);
    });
    it("Lista (compact) RENDERIZA badge de alerta", () => {
      expect(badgeCountIn("list-stale")).toBe(1);
    });
    it("Tabela (icon-only) RENDERIZA badge de alerta", () => {
      expect(badgeCountIn("table-stale")).toBe(1);
    });
    it("Quick View (inline + alwaysShow) RENDERIZA com cópia 'defasado'", () => {
      expect(badgeCountIn("quickview-stale")).toBe(1);
      const badge = screen.getByTestId("quickview-stale").querySelector('[role="status"]')!;
      expect(badge.textContent).toMatch(/preço pode estar defasado/i);
    });
  });

  describe("Produto UNKNOWN (sem priceUpdatedAt) — data não informada", () => {
    beforeEach(() => renderCatalogRow(CATALOG[3]));

    it("Card (icon-only) NÃO renderiza badge", () => {
      expect(badgeCountIn("card-unknown")).toBe(0);
    });
    it("EnhancedCard (icon-only) NÃO renderiza badge", () => {
      expect(badgeCountIn("enhanced-card-unknown")).toBe(0);
    });
    it("Lista (compact) NÃO renderiza badge", () => {
      expect(badgeCountIn("list-unknown")).toBe(0);
    });
    it("Tabela (icon-only) NÃO renderiza badge", () => {
      expect(badgeCountIn("table-unknown")).toBe(0);
    });
    it("Quick View (inline + alwaysShow) RENDERIZA badge mesmo sem data", () => {
      // alwaysShow tem que vencer o status unknown — vendedor precisa
      // saber que a data não foi informada quando abre o quick view.
      expect(badgeCountIn("quickview-unknown")).toBe(1);
      const badge = screen.getByTestId("quickview-unknown").querySelector('[role="status"]')!;
      expect(badge.textContent).toMatch(/data de atualização não informada/i);
    });
  });

  describe("Invariante de catálogo (todos os produtos numa só passada)", () => {
    it("hosts compactos (card/lista/tabela) só somam badges para aging+stale", () => {
      // Renderiza catálogo inteiro (4 produtos × 5 hosts = 20 slots).
      render(
        <div data-testid="full-catalog">
          {CATALOG.map((p) => (
            <div key={p.id}>
              <div data-testid={`row-card-${p.id}`}>
                <PriceFreshnessBadge
                  priceUpdatedAt={p.priceUpdatedAt}
                  thresholdDays={p.priceFreshnessThresholdDays}
                  variant="icon-only"
                />
              </div>
              <div data-testid={`row-list-${p.id}`}>
                <PriceFreshnessBadge
                  priceUpdatedAt={p.priceUpdatedAt}
                  thresholdDays={p.priceFreshnessThresholdDays}
                  variant="compact"
                />
              </div>
              <div data-testid={`row-table-${p.id}`}>
                <PriceFreshnessBadge
                  priceUpdatedAt={p.priceUpdatedAt}
                  thresholdDays={p.priceFreshnessThresholdDays}
                  variant="icon-only"
                />
              </div>
              <div data-testid={`row-quickview-${p.id}`}>
                <PriceFreshnessBadge
                  priceUpdatedAt={p.priceUpdatedAt}
                  thresholdDays={p.priceFreshnessThresholdDays}
                  variant="inline"
                  alwaysShow
                />
              </div>
            </div>
          ))}
        </div>,
      );

      const catalog = screen.getByTestId("full-catalog");
      // Compactos: 2 produtos visíveis (aging + stale) × 3 hosts = 6 badges.
      const compactBadges = ["card", "list", "table"].flatMap((host) =>
        CATALOG.map((p) =>
          catalog
            .querySelector(`[data-testid="row-${host}-${p.id}"]`)!
            .querySelectorAll('[role="status"]').length,
        ),
      );
      const compactTotal = compactBadges.reduce((a, b) => a + b, 0);
      expect(compactTotal).toBe(6);

      // Quick View com alwaysShow: 4 produtos × 1 = 4 badges.
      const quickviewTotal = CATALOG.reduce(
        (acc, p) =>
          acc +
          catalog
            .querySelector(`[data-testid="row-quickview-${p.id}"]`)!
            .querySelectorAll('[role="status"]').length,
        0,
      );
      expect(quickviewTotal).toBe(4);
    });
  });
});
