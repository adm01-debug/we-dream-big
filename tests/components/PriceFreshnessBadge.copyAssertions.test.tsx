/**
 * Asserts de cópia pt-BR EXATA do `PriceFreshnessBadge` em cada variant
 * do catálogo (icon-only, compact, inline, pdp).
 *
 * Trava o texto literal renderizado para vendedor brasileiro:
 *   - fresh:   "Atualizado há X dias · em DD/MM/AAAA (limite Nd)"
 *   - aging:   "Atualizado há X dias · em DD/MM/AAAA (limite Nd)"
 *   - stale:   "Preço pode estar defasado (há X dias) · em DD/MM/AAAA (limite Nd)"
 *   - unknown: "Data de atualização não informada"
 *
 * Mudanças de cópia (mesmo um caractere) quebram esta suíte com diff legível.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
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

const txt = (el: Element) => el.textContent!.replace(/\s+/g, " ").trim();

const SCENARIOS = {
  fresh: { date: daysAgo(5), threshold: 60 }, // 19/04/2026
  aging: { date: daysAgo(45), threshold: 60 }, // 10/03/2026
  stale: { date: daysAgo(90), threshold: 60 }, // 24/01/2026
  unknown: { date: null as string | null, threshold: 60 },
} as const;

describe("PriceFreshnessBadge — cópia pt-BR exata por variant", () => {
  // ════════════════════════════════════════════════════════════════════
  // VARIANT: inline (PDP / Quick View)
  // Formato: "<label> · em <data> (limite Nd)"
  // ════════════════════════════════════════════════════════════════════
  describe("variant=inline (PDP / Quick View)", () => {
    it("fresh: 'Atualizado há 5 dias · em 19/04/2026 (limite 60d)'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.fresh.date}
          thresholdDays={SCENARIOS.fresh.threshold}
          variant="inline"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "Atualizado há 5 dias · em 19/04/2026 (limite 60d)",
      );
    });

    it("aging: 'Atualizado há 45 dias · em 10/03/2026 (limite 60d)' + aria de alerta", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.aging.date}
          thresholdDays={SCENARIOS.aging.threshold}
          variant="inline"
        />,
      );
      const badge = screen.getByRole("status");
      expect(txt(badge)).toBe(
        "Atualizado há 45 dias · em 10/03/2026 (limite 60d)",
      );
      expect(badge.getAttribute("aria-label")).toMatch(
        /próximo do limite de validade/i,
      );
      expect(badge.getAttribute("aria-label")).toMatch(/há 45 dias/i);
    });

    it("stale: 'Preço pode estar defasado (há 90 dias) · em 24/01/2026 (limite 60d)'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.stale.date}
          thresholdDays={SCENARIOS.stale.threshold}
          variant="inline"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "Preço pode estar defasado (há 90 dias) · em 24/01/2026 (limite 60d)",
      );
    });

    it("unknown: 'Data de atualização não informada'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.unknown.date}
          variant="inline"
          alwaysShow
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "Data de atualização não informada",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // VARIANT: pdp (página de detalhe)
  // Formato fresh/aging: "Atualizado em <data> · há Nd (limite Nd)"
  // Formato stale: frase rica com chamada de ação.
  // ════════════════════════════════════════════════════════════════════
  describe("variant=pdp (página de detalhe)", () => {
    it("fresh: 'Atualizado em 19/04/2026 · há 5 dias (limite 60d)'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.fresh.date}
          thresholdDays={SCENARIOS.fresh.threshold}
          variant="pdp"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "Atualizado em 19/04/2026 · há 5 dias (limite 60d)",
      );
    });

    it("aging: 'Atualizado em 10/03/2026 · há 45 dias (limite 60d)'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.aging.date}
          thresholdDays={SCENARIOS.aging.threshold}
          variant="pdp"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "Atualizado em 10/03/2026 · há 45 dias (limite 60d)",
      );
    });

    it("stale: cópia rica com data por extenso e CTA ao vendedor", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.stale.date}
          thresholdDays={SCENARIOS.stale.threshold}
          variant="pdp"
        />,
      );
      const text = txt(screen.getByRole("status"));
      expect(text).toMatch(/^Preço pode estar defasado/);
      expect(text).toMatch(/Última atualização em 24\/01\/2026/);
      expect(text).toMatch(/\(há 90 dias\)/);
      expect(text).toMatch(
        /onfirme com o fornecedor antes de fechar o orçamento/,
      );
    });

    it("unknown: 'Data de atualização não informada'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.unknown.date}
          variant="pdp"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "Data de atualização não informada",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // VARIANT: compact (lista densa) — alias compacto + sufixo de data
  // Formato: "há Nd · em DD/MM/AAAA (limite Nd)"
  // ════════════════════════════════════════════════════════════════════
  describe("variant=compact (lista densa)", () => {
    it("aging (45d/threshold 60): 'há 1m · em 10/03/2026 (limite 60d)'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.aging.date}
          thresholdDays={SCENARIOS.aging.threshold}
          variant="compact"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "há 1m · em 10/03/2026 (limite 60d)",
      );
    });

    it("stale (90d/threshold 60): 'há 3m · em 24/01/2026 (limite 60d)'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.stale.date}
          thresholdDays={SCENARIOS.stale.threshold}
          variant="compact"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "há 3m · em 24/01/2026 (limite 60d)",
      );
    });

    it("aging dentro de 30 dias usa sufixo 'd': 'há 20d · em 04/04/2026 (limite 30d)'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={daysAgo(20)}
          thresholdDays={30}
          variant="compact"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "há 20d · em 04/04/2026 (limite 30d)",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // VARIANT: icon-only (cards / tabela densa) — texto rico vai no aria
  // ════════════════════════════════════════════════════════════════════
  describe("variant=icon-only (cards / tabela densa)", () => {
    it("aging: aria 'Preço próximo do limite de validade …' com data por extenso", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.aging.date}
          thresholdDays={SCENARIOS.aging.threshold}
          variant="icon-only"
        />,
      );
      const aria = screen.getByRole("status").getAttribute("aria-label")!;
      expect(aria).toBe(
        "Preço próximo do limite de validade. Última atualização do fornecedor em 10 de março de 2026, há 45 dias. Recomendamos confirmar antes de fechar o orçamento.",
      );
    });

    it("stale: aria 'Preço possivelmente defasado …' com CTA", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.stale.date}
          thresholdDays={SCENARIOS.stale.threshold}
          variant="icon-only"
        />,
      );
      const aria = screen.getByRole("status").getAttribute("aria-label")!;
      expect(aria).toBe(
        "Atenção: preço possivelmente defasado. Última atualização do fornecedor em 24 de janeiro de 2026, há 90 dias. Confirme o valor antes de enviar o orçamento ao cliente.",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // PARIDADE — copy do utilitário aparece literalmente em inline/pdp
  // ════════════════════════════════════════════════════════════════════
  describe("paridade entre util e UI (texto não é reescrito pelos hosts)", () => {
    it("fresh: relativo 'há 5 dias' presente em inline e pdp", () => {
      const { unmount } = render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.fresh.date}
          thresholdDays={SCENARIOS.fresh.threshold}
          variant="inline"
        />,
      );
      expect(txt(screen.getByRole("status"))).toContain("há 5 dias");
      unmount();

      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.fresh.date}
          thresholdDays={SCENARIOS.fresh.threshold}
          variant="pdp"
        />,
      );
      expect(txt(screen.getByRole("status"))).toContain("há 5 dias");
    });

    it("singular: 'há 1 dia' (sem 's') em inline com daysSince=1", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={daysAgo(1)}
          thresholdDays={60}
          variant="inline"
        />,
      );
      expect(txt(screen.getByRole("status"))).toMatch(/há 1 dia(?!s)/);
    });

    it("hoje: 'hoje' (sem 'há') em inline com daysSince=0", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={daysAgo(0)}
          thresholdDays={60}
          variant="inline"
        />,
      );
      expect(txt(screen.getByRole("status"))).toMatch(/hoje/i);
    });
  });
});
