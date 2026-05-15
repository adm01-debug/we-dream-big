/**
 * Transição de props em sequência: `priceUpdatedAt` mudando entre
 * null/undefined ↔ data válida, validando que o badge alterna entre
 * **hidden** e **visível** corretamente em cada host do catálogo,
 * com e sem `alwaysShow`.
 *
 * Hosts cobertos:
 *  - card    → variant="icon-only"  (silencioso quando fresh/unknown)
 *  - lista   → variant="compact"    (silencioso quando fresh/unknown)
 *  - tabela  → variant="icon-only"
 *  - quick   → variant="inline"     (variante "rica", sempre renderiza)
 *
 * Matriz validada por host:
 *   1. null  →  válido(stale)  · alwaysShow=false  → hidden → visível
 *   2. válido(stale)  →  null  · alwaysShow=false  → visível → hidden
 *   3. null  →  válido(fresh)  · alwaysShow=false  → hidden → hidden  (silencioso)
 *   4. válido(fresh)  →  null  · alwaysShow=true   → visível → visível (unknown)
 *   5. undefined ↔ válido(aging) · alwaysShow=false → hidden ↔ visível
 *   6. válido(stale) → válido(fresh) · alwaysShow=false → visível → hidden
 *
 * O componente `inline` é coberto à parte como referência: ele sempre
 * renderiza (rico) — qualquer transição mantém o badge no DOM.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";

const FIXED_NOW = new Date("2026-04-24T12:00:00.000Z").getTime();
const THRESHOLD = 60;

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});
afterAll(() => {
  vi.useRealTimers();
});

const daysAgo = (n: number) => new Date(FIXED_NOW - n * 86400000).toISOString();

type CompactHost = {
  name: "card" | "lista" | "tabela";
  variant: "icon-only" | "compact";
};

const COMPACT_HOSTS: CompactHost[] = [
  { name: "card", variant: "icon-only" },
  { name: "lista", variant: "compact" },
  { name: "tabela", variant: "icon-only" },
];

describe("PriceFreshnessBadge — transição de props (hosts compactos)", () => {
  for (const host of COMPACT_HOSTS) {
    describe(`${host.name} (variant="${host.variant}")`, () => {
      it("null → stale (alwaysShow=false): hidden → visível com cor âmbar", () => {
        const { container, rerender } = render(
          <PriceFreshnessBadge
            priceUpdatedAt={null}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(container).toBeEmptyDOMElement();

        rerender(
          <PriceFreshnessBadge
            priceUpdatedAt={daysAgo(90)}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        const badge = screen.getByRole("status");
        expect(badge).toBeInTheDocument();
        expect(badge.className).toMatch(/amber-/);
      });

      it("stale → null (alwaysShow=false): visível → hidden", () => {
        const { container, rerender } = render(
          <PriceFreshnessBadge
            priceUpdatedAt={daysAgo(90)}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(screen.getByRole("status")).toBeInTheDocument();

        rerender(
          <PriceFreshnessBadge
            priceUpdatedAt={null}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
      });

      it("null → fresh (alwaysShow=false): permanece hidden em ambos (silencioso)", () => {
        const { container, rerender } = render(
          <PriceFreshnessBadge
            priceUpdatedAt={null}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(container).toBeEmptyDOMElement();

        rerender(
          <PriceFreshnessBadge
            priceUpdatedAt={daysAgo(5)}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
      });

      it("fresh → null (alwaysShow=true): visível(emerald) → visível(unknown/cinza)", () => {
        const { rerender } = render(
          <PriceFreshnessBadge
            priceUpdatedAt={daysAgo(5)}
            thresholdDays={THRESHOLD}
            variant={host.variant}
            alwaysShow
          />,
        );
        const fresh = screen.getByRole("status");
        expect(fresh.className).toMatch(/emerald-/);

        rerender(
          <PriceFreshnessBadge
            priceUpdatedAt={null}
            thresholdDays={THRESHOLD}
            variant={host.variant}
            alwaysShow
          />,
        );
        const unknown = screen.getByRole("status");
        expect(unknown).toBeInTheDocument();
        expect(unknown.className).toMatch(/text-muted-foreground/);
        expect(unknown.className).not.toMatch(/emerald-|amber-/);
      });

      it("undefined ↔ aging (alwaysShow=false): hidden ↔ visível em ciclo", () => {
        const { container, rerender } = render(
          <PriceFreshnessBadge
            priceUpdatedAt={undefined}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(container).toBeEmptyDOMElement();

        rerender(
          <PriceFreshnessBadge
            priceUpdatedAt={daysAgo(45)}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(screen.getByRole("status").className).toMatch(/amber-/);

        rerender(
          <PriceFreshnessBadge
            priceUpdatedAt={undefined}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(container).toBeEmptyDOMElement();

        rerender(
          <PriceFreshnessBadge
            priceUpdatedAt={daysAgo(45)}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(screen.getByRole("status")).toBeInTheDocument();
      });

      it("stale → fresh (alwaysShow=false): visível(âmbar) → hidden (silencia ao normalizar)", () => {
        const { container, rerender } = render(
          <PriceFreshnessBadge
            priceUpdatedAt={daysAgo(90)}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(screen.getByRole("status").className).toMatch(/amber-/);

        rerender(
          <PriceFreshnessBadge
            priceUpdatedAt={daysAgo(5)}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
      });

      it("alterna alwaysShow com data null: hidden → visível(unknown) → hidden", () => {
        const { container, rerender } = render(
          <PriceFreshnessBadge
            priceUpdatedAt={null}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(container).toBeEmptyDOMElement();

        rerender(
          <PriceFreshnessBadge
            priceUpdatedAt={null}
            thresholdDays={THRESHOLD}
            variant={host.variant}
            alwaysShow
          />,
        );
        expect(screen.getByRole("status").className).toMatch(
          /text-muted-foreground/,
        );

        rerender(
          <PriceFreshnessBadge
            priceUpdatedAt={null}
            thresholdDays={THRESHOLD}
            variant={host.variant}
          />,
        );
        expect(container).toBeEmptyDOMElement();
      });
    });
  }
});

describe("PriceFreshnessBadge — transição de props (quick view inline)", () => {
  // Referência explícita: variant="inline" é a variante "rica" que
  // sempre renderiza, então qualquer transição preserva o badge no DOM.
  // O que muda é apenas o conteúdo (cor + aria-label).

  it("null → stale: badge permanece visível, alterna para cor âmbar", () => {
    const { rerender } = render(
      <PriceFreshnessBadge
        priceUpdatedAt={null}
        thresholdDays={THRESHOLD}
        variant="inline"
      />,
    );
    const initial = screen.getByRole("status");
    expect(initial).toHaveAccessibleName(/não informada/i);
    expect(initial.className).toMatch(/text-muted-foreground/);

    rerender(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(90)}
        thresholdDays={THRESHOLD}
        variant="inline"
      />,
    );
    const after = screen.getByRole("status");
    expect(after).toBeInTheDocument();
    expect(after.className).toMatch(/amber-/);
  });

  it("fresh → null: badge permanece visível, alterna para estado unknown", () => {
    const { rerender } = render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={THRESHOLD}
        variant="inline"
      />,
    );
    expect(screen.getByRole("status").className).toMatch(/emerald-/);

    rerender(
      <PriceFreshnessBadge
        priceUpdatedAt={null}
        thresholdDays={THRESHOLD}
        variant="inline"
      />,
    );
    const unknown = screen.getByRole("status");
    expect(unknown).toHaveAccessibleName(/não informada/i);
    expect(unknown.className).toMatch(/text-muted-foreground/);
  });
});
