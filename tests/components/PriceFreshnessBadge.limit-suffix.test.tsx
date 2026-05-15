/**
 * Quando o produto começar a expor `price_freshness_threshold_days` (campo
 * ainda inexistente em ~100% do catálogo hoje), o badge deve sufixar a copy
 * com "(limite Yd)" — sem alterar nada para os produtos sem threshold.
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

describe("PriceFreshnessBadge — sufixo (limite Yd)", () => {
  it("inline: mostra 'Atualizado há 5 dias (limite 30d)' quando threshold explícito", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={30}
        variant="inline"
      />,
    );
    const text = screen.getByRole("status").textContent ?? "";
    expect(text).toMatch(/atualizado há 5 dias/i);
    expect(text).toMatch(/\(limite 30d\)/);
    expect(text).toMatch(/em \d{2}\/\d{2}\/\d{4}/);
  });

  it("inline: NÃO mostra '(limite ...)' quando threshold é null (default global 60d)", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={null}
        variant="inline"
      />,
    );
    expect(screen.getByRole("status").textContent).not.toMatch(/limite/i);
  });

  it("inline: NÃO mostra '(limite ...)' quando threshold é 0 (inválido → cai no default)", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={0}
        variant="inline"
      />,
    );
    expect(screen.getByRole("status").textContent).not.toMatch(/limite/i);
  });

  it("compact: sufixa '(limite Yd)' apenas quando threshold explícito (aging)", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(20)}
        thresholdDays={30}
        variant="compact"
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(/\(limite 30d\)/);
  });

  it("pdp aging: sufixa '(limite Yd)' inline na pílula âmbar", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(20)}
        thresholdDays={30}
        variant="pdp"
      />,
    );
    const text = screen.getByRole("status").textContent ?? "";
    expect(text).toMatch(/atualizado em \d{2}\/\d{2}\/\d{4}/i);
    expect(text).toMatch(/há 20 dias/);
    expect(text).toMatch(/\(limite 30d\)/);
  });

  it("pdp fresh: sufixa '(limite Yd)' na pílula verde", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={90}
        variant="pdp"
      />,
    );
    const text = screen.getByRole("status").textContent ?? "";
    expect(text).toMatch(/atualizado em \d{2}\/\d{2}\/\d{4}/i);
    expect(text).toMatch(/há 5 dias/);
    expect(text).toMatch(/\(limite 90d\)/);
  });

  it("pdp fresh: SEM '(limite ...)' quando threshold ausente (cenário atual do BD)", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={null}
        variant="pdp"
      />,
    );
    expect(screen.getByRole("status").textContent).not.toMatch(/limite/i);
  });
});
