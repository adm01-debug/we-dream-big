import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";

const FIXED_NOW = new Date("2025-06-15T12:00:00.000Z").getTime();

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

function daysAgo(days: number) {
  return new Date(FIXED_NOW - days * 86400000).toISOString();
}

describe("PriceFreshnessBadge", () => {
  it("renders inline variant with full label for fresh status", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={60}
        variant="inline"
      />,
    );
    expect(screen.getByRole("status")).toHaveAccessibleName(/atualizado/i);
  });

  it("does NOT render compact variant when status is fresh", () => {
    const { container } = render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={60}
        variant="compact"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders compact variant when status is aging", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(45)}
        thresholdDays={60}
        variant="compact"
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does NOT render icon-only variant when status is fresh", () => {
    const { container } = render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={60}
        variant="icon-only"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders icon-only variant for stale and uses warning color (WCAG AA)", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(90)}
        thresholdDays={60}
        variant="icon-only"
      />,
    );
    const badge = screen.getByRole("status");
    expect(badge).toBeInTheDocument();
    // amber-700 atinge ≥ 4.5:1 sobre fundo claro (era amber-600 = 3.4:1).
    expect(badge.className).toMatch(/amber-700/);
  });

  it("renders inline variant for unknown when alwaysShow is implicit (inline always shows)", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={null}
        thresholdDays={60}
        variant="inline"
      />,
    );
    // O aria-label rico inclui "não informada" para leitores de tela
    // (ex.: "Preço com data de atualização não informada pelo fornecedor.").
    expect(screen.getByRole("status")).toHaveAccessibleName(/não informada/i);
  });

  it("forces compact render when alwaysShow=true even for fresh status", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={60}
        variant="compact"
        alwaysShow
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders pdp variant with stale state showing 'defasado' and amber styling", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(72)}
        thresholdDays={60}
        variant="pdp"
      />,
    );
    const badge = screen.getByRole("status");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/defasado/i);
    expect(badge.className).toMatch(/amber-(100|300|500)/);
  });

  it("renders pdp variant with fresh state showing short relative copy and absolute date in tooltip", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(6)}
        thresholdDays={60}
        variant="pdp"
      />,
    );
    const badge = screen.getByRole("status");
    // Novo padrão: "Atualizado em DD/MM/AAAA · há N dias" (numérico pt-BR)
    expect(badge.textContent).toMatch(/atualizado em \d{2}\/\d{2}\/\d{4}/i);
    expect(badge.textContent).toMatch(/há \d+ dias?/i);
    // A data por extenso (formato longo) fica reservada ao tooltip
    expect(badge.textContent).not.toMatch(/\d{1,2} de [a-zçãéíúô]+ de \d{4}/i);
  });

  it("renders pdp variant with unknown state when priceUpdatedAt is null", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={null}
        thresholdDays={60}
        variant="pdp"
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(/não informada/i);
  });
});
