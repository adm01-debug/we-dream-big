/**
 * Garante o contrato de visibilidade do selo "preço atualizado em" nos
 * componentes do catálogo (cards, lista, tabela, sticky header, quick view).
 *
 * Regra de negócio (validada por consumidor):
 *  - `icon-only` (ProductCard, EnhancedProductCard, ProductTableView):
 *      só renderiza para aging/stale; some quando fresh ou unknown.
 *  - `compact` (ProductListItem, ProductStickyHeader):
 *      mesma regra — só aging/stale.
 *  - `inline` + `alwaysShow` (ProductQuickView): sempre renderiza.
 *
 * Em vez de montar cada página inteira (que arrasta supabase, gallery,
 * favoritos, etc.), reproduzimos a invocação exata feita por cada
 * componente. Se um consumidor mudar a `variant` ou esquecer o `alwaysShow`,
 * estes testes apontam o regressão imediatamente.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";

const FIXED_NOW = new Date("2026-04-24T12:00:00.000Z").getTime();
const daysAgo = (d: number) => new Date(FIXED_NOW - d * 86400000).toISOString();

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

/** Espelha exatamente a invocação de ProductCard/EnhancedProductCard/ProductTableView. */
function CardBadge(props: {
  priceUpdatedAt: string | null;
  thresholdDays?: number | null;
}) {
  return (
    <PriceFreshnessBadge
      priceUpdatedAt={props.priceUpdatedAt}
      thresholdDays={props.thresholdDays ?? null}
      variant="icon-only"
    />
  );
}

/** Espelha exatamente a invocação de ProductListItem/ProductStickyHeader. */
function ListBadge(props: {
  priceUpdatedAt: string | null;
  thresholdDays?: number | null;
}) {
  return (
    <PriceFreshnessBadge
      priceUpdatedAt={props.priceUpdatedAt}
      thresholdDays={props.thresholdDays ?? null}
      variant="compact"
    />
  );
}

/** Espelha exatamente a invocação de ProductQuickView. */
function QuickViewBadge(props: {
  priceUpdatedAt: string | null;
  thresholdDays?: number | null;
}) {
  return (
    <PriceFreshnessBadge
      priceUpdatedAt={props.priceUpdatedAt}
      thresholdDays={props.thresholdDays ?? null}
      variant="inline"
      alwaysShow
    />
  );
}

describe("PriceFreshnessBadge — visibilidade nos componentes do catálogo", () => {
  describe("ProductCard / EnhancedProductCard / ProductTableView (variant='icon-only')", () => {
    it("NÃO renderiza quando fresh (preço atualizado dentro de 50% do threshold)", () => {
      const { container } = render(
        <CardBadge priceUpdatedAt={daysAgo(5)} thresholdDays={60} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("NÃO renderiza quando o status é unknown (data ausente)", () => {
      const { container } = render(
        <CardBadge priceUpdatedAt={null} thresholdDays={60} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("NÃO renderiza quando a data é inválida (cai em unknown)", () => {
      const { container } = render(
        <CardBadge priceUpdatedAt={"not-a-date"} thresholdDays={60} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("RENDERIZA quando aging (entre 50% e 100% do threshold)", () => {
      render(<CardBadge priceUpdatedAt={daysAgo(45)} thresholdDays={60} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("RENDERIZA quando stale (acima do threshold) com cor de alerta", () => {
      render(<CardBadge priceUpdatedAt={daysAgo(90)} thresholdDays={60} />);
      const badge = screen.getByRole("status");
      expect(badge).toBeInTheDocument();
      // amber-700 garante WCAG AA (≥ 4.5:1) sobre fundos claros.
      expect(badge.className).toMatch(/amber-700/);
    });

    it("respeita o threshold per-produto: 25 dias com janela 30 ainda é fresh → some", () => {
      const { container } = render(
        <CardBadge priceUpdatedAt={daysAgo(10)} thresholdDays={30} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("respeita o threshold per-produto: 25 dias com janela 30 vira aging → aparece", () => {
      render(<CardBadge priceUpdatedAt={daysAgo(20)} thresholdDays={30} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  describe("ProductListItem / ProductStickyHeader (variant='compact')", () => {
    it("NÃO renderiza quando fresh", () => {
      const { container } = render(
        <ListBadge priceUpdatedAt={daysAgo(5)} thresholdDays={60} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("NÃO renderiza quando unknown", () => {
      const { container } = render(
        <ListBadge priceUpdatedAt={null} thresholdDays={60} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("RENDERIZA quando aging mostrando relativo + data curta pt-BR", () => {
      render(<ListBadge priceUpdatedAt={daysAgo(45)} thresholdDays={60} />);
      const badge = screen.getByRole("status");
      expect(badge).toBeInTheDocument();
      const text = badge.textContent ?? "";
      expect(text).toMatch(/há \d+/);
      expect(text).toMatch(/em \d{2}\/\d{2}\/\d{4}/);
    });

    it("RENDERIZA quando stale", () => {
      render(<ListBadge priceUpdatedAt={daysAgo(90)} thresholdDays={60} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  describe("ProductQuickView (variant='inline' + alwaysShow)", () => {
    it("RENDERIZA mesmo quando fresh (alwaysShow força exibição)", () => {
      render(
        <QuickViewBadge priceUpdatedAt={daysAgo(5)} thresholdDays={60} />,
      );
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("RENDERIZA mesmo quando unknown (alwaysShow força exibição)", () => {
      render(<QuickViewBadge priceUpdatedAt={null} thresholdDays={60} />);
      expect(screen.getByRole("status").textContent).toMatch(
        /não informada/i,
      );
    });

    it("RENDERIZA quando aging/stale (comportamento natural)", () => {
      render(
        <QuickViewBadge priceUpdatedAt={daysAgo(90)} thresholdDays={60} />,
      );
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  describe("Limites das transições (defesa contra off-by-one)", () => {
    // threshold=60 ⇒ fresh: dias <= 30, aging: 31..60, stale: > 60
    it("dia exatamente no meio (30/60) ainda é fresh → some no card", () => {
      const { container } = render(
        <CardBadge priceUpdatedAt={daysAgo(30)} thresholdDays={60} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("dia logo após o meio (31/60) já é aging → aparece no card", () => {
      render(<CardBadge priceUpdatedAt={daysAgo(31)} thresholdDays={60} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("dia exatamente no threshold (60/60) ainda é aging → aparece", () => {
      render(<CardBadge priceUpdatedAt={daysAgo(60)} thresholdDays={60} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("dia logo após o threshold (61/60) é stale → aparece com alerta", () => {
      render(<CardBadge priceUpdatedAt={daysAgo(61)} thresholdDays={60} />);
      const badge = screen.getByRole("status");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toMatch(/amber-700/);
    });
  });
});
