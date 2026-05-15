/**
 * Matriz consolidada (status × variant) — `PriceFreshnessBadge`.
 *
 * Snapshot de assertion travando, em UM lugar, para cada combinação de
 * `status (fresh | aging | stale | unknown)` × `variant (icon-only |
 * compact | inline | pdp)`:
 *   1. Família de cor da paleta correta (emerald → fresh, amber → aging/stale,
 *      muted/gray → unknown).
 *   2. Conteúdo pt-BR característico ("Atualizado em DD/MM/AAAA",
 *      "Preço pode estar defasado", "Data de atualização não informada").
 *   3. Variantes compactas (icon-only / compact) NÃO renderizam quando o
 *      status é fresh/unknown — só destacam aging/stale (regra do catálogo).
 *
 * Esta suíte complementa as suítes específicas (a11y, catalog-visibility,
 * labels-parity, limit-suffix) servindo como o **gate de regressão
 * cromática + textual** unificado: se o design system mudar amber-700 →
 * orange-600 ou trocar o copy de stale, ESTA suíte falha primeiro com
 * uma asserção legível "fresh × inline deve usar emerald-700".
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

/** Cenários por status — threshold default de 60 dias do catálogo. */
const SCENARIOS = {
  fresh: { date: daysAgo(5), threshold: 60 }, // 5d → fresh
  aging: { date: daysAgo(45), threshold: 60 }, // 45d (≥ 50% de 60) → aging
  stale: { date: daysAgo(90), threshold: 60 }, // 90d (> 60) → stale
  unknown: { date: null as string | null, threshold: 60 }, // sem data → unknown
} as const;

/**
 * Famílias de cor esperadas por status, em formato regex tolerante ao
 * shade light/dark (`amber-700`, `dark:amber-300`, etc.). Inclui apenas
 * tokens da paleta — qualquer mudança para `orange-*`, `red-*` ou
 * `yellow-*` quebra estes asserts.
 */
const COLOR_PALETTE = {
  fresh: /emerald-(50|200|400|500|700)/, // bg/border/text esperados
  aging: /amber-(50|200|300|500|700)/,
  stale: /amber-(100|200|300|500|700|800|900)/,
  unknown: /(muted-foreground|border-border|bg-muted)/,
};

/** Cores que NÃO podem aparecer em nenhum status (proxy de regressão). */
const FORBIDDEN_COLORS = /(text|bg|border)-(orange|red|yellow)-/;

describe("PriceFreshnessBadge — matriz cromática + conteúdo pt-BR (status × variant)", () => {
  // ════════════════════════════════════════════════════════════════════
  // VARIANT: inline (PDP / Quick View) — sempre renderiza
  // ════════════════════════════════════════════════════════════════════
  describe("variant=inline (PDP / Quick View)", () => {
    it("fresh: emerald-700 + 'Atualizado em DD/MM/AAAA · há Nd'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.fresh.date}
          thresholdDays={SCENARIOS.fresh.threshold}
          variant="inline"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.className).toMatch(COLOR_PALETTE.fresh);
      expect(badge.className).not.toMatch(FORBIDDEN_COLORS);
      // Texto pt-BR: util retorna "Atualizado há 5 dias", inline anexa
      // "· em DD/MM/AAAA" como sufixo de data numérica.
      expect(badge.textContent).toMatch(/atualizado/i);
      expect(badge.textContent).toMatch(/há 5 dias/);
      expect(badge.textContent).toMatch(/em \d{2}\/\d{2}\/\d{4}/);
    });

    it("aging: amber-700 + ainda usa label 'Atualizado há Nd' (util não distingue aging visualmente no inline)", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.aging.date}
          thresholdDays={SCENARIOS.aging.threshold}
          variant="inline"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.className).toMatch(COLOR_PALETTE.aging);
      expect(badge.className).not.toMatch(FORBIDDEN_COLORS);
      expect(badge.textContent).toMatch(/atualizado há 45 dias/i);
      // Aria-label rico distingue aging para leitor de tela.
      expect(badge.getAttribute("aria-label")).toMatch(/próximo do limite/i);
    });

    it("stale: amber-700 + 'Preço pode estar defasado (há 90 dias)'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.stale.date}
          thresholdDays={SCENARIOS.stale.threshold}
          variant="inline"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.className).toMatch(COLOR_PALETTE.stale);
      expect(badge.className).not.toMatch(FORBIDDEN_COLORS);
      expect(badge.textContent).toMatch(/preço pode estar defasado/i);
      expect(badge.textContent).toMatch(/há 90 dias/);
    });

    it("unknown: muted-foreground + 'Data de atualização não informada'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.unknown.date}
          variant="inline"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.className).toMatch(COLOR_PALETTE.unknown);
      expect(badge.className).not.toMatch(FORBIDDEN_COLORS);
      expect(badge.textContent).toMatch(/data de atualização não informada/i);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // VARIANT: pdp (página de detalhe — pílulas grandes coloridas)
  // ════════════════════════════════════════════════════════════════════
  describe("variant=pdp (página de detalhe)", () => {
    it("fresh: bg-emerald-50 + border-emerald-200 + text-emerald-700 + 'Atualizado em DD/MM/AAAA'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.fresh.date}
          thresholdDays={SCENARIOS.fresh.threshold}
          variant="pdp"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.className).toMatch(/bg-emerald-50/);
      expect(badge.className).toMatch(/border-emerald-200/);
      expect(badge.className).toMatch(/text-emerald-700/);
      expect(badge.className).not.toMatch(FORBIDDEN_COLORS);
      expect(badge.textContent).toMatch(/atualizado em \d{2}\/\d{2}\/\d{4}/i);
      expect(badge.textContent).toMatch(/há 5 dias/);
    });

    it("aging: bg-amber-50 + border-amber-200 + text-amber-700 (pílula leve)", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.aging.date}
          thresholdDays={SCENARIOS.aging.threshold}
          variant="pdp"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.className).toMatch(/bg-amber-50/);
      expect(badge.className).toMatch(/border-amber-200/);
      expect(badge.className).toMatch(/text-amber-700/);
      expect(badge.className).not.toMatch(FORBIDDEN_COLORS);
      expect(badge.textContent).toMatch(/atualizado em \d{2}\/\d{2}\/\d{4}/i);
    });

    it("stale: bg-amber-100 + border-amber-300 + text-amber-900 (pílula intensa de alerta)", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.stale.date}
          thresholdDays={SCENARIOS.stale.threshold}
          variant="pdp"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.className).toMatch(/bg-amber-100/);
      expect(badge.className).toMatch(/border-amber-300/);
      expect(badge.className).toMatch(/text-amber-900/);
      expect(badge.className).not.toMatch(FORBIDDEN_COLORS);
      expect(badge.textContent).toMatch(/preço pode estar defasado/i);
      expect(badge.textContent).toMatch(
        /confirme com o fornecedor antes de fechar o orçamento/i,
      );
    });

    it("unknown: bg-muted + border-border + text-muted-foreground", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.unknown.date}
          variant="pdp"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.className).toMatch(/bg-muted/);
      expect(badge.className).toMatch(/border-border/);
      expect(badge.className).toMatch(/text-muted-foreground/);
      expect(badge.className).not.toMatch(FORBIDDEN_COLORS);
      expect(badge.textContent).toMatch(/data de atualização não informada/i);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // VARIANT: icon-only (cards / tabela densa) — só renderiza se aging/stale
  // ════════════════════════════════════════════════════════════════════
  describe("variant=icon-only (cards / tabela densa) — visibilidade restrita", () => {
    it("fresh: NÃO renderiza (regra do catálogo: só destacar quando há alerta)", () => {
      const { container } = render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.fresh.date}
          thresholdDays={SCENARIOS.fresh.threshold}
          variant="icon-only"
        />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("unknown: NÃO renderiza", () => {
      const { container } = render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.unknown.date}
          variant="icon-only"
        />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("aging: renderiza com text-amber-700 (WCAG AA)", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.aging.date}
          thresholdDays={SCENARIOS.aging.threshold}
          variant="icon-only"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.className).toMatch(/text-amber-700/);
      expect(badge.className).not.toMatch(/text-amber-600(?!\d)/); // não regredir
      expect(badge.className).not.toMatch(FORBIDDEN_COLORS);
    });

    it("stale: renderiza com text-amber-700 + ícone AlertTriangle", () => {
      const { container } = render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.stale.date}
          thresholdDays={SCENARIOS.stale.threshold}
          variant="icon-only"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.className).toMatch(/text-amber-700/);
      expect(badge.className).not.toMatch(FORBIDDEN_COLORS);
      // Ícone AlertTriangle (lucide-react renderiza svg com classe lucide-*).
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      // O aria-label rico carrega o status para o leitor de tela.
      expect(badge.getAttribute("aria-label")).toMatch(/possivelmente defasado/i);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // VARIANT: compact (lista densa / sticky header) — só renderiza aging/stale
  // ════════════════════════════════════════════════════════════════════
  describe("variant=compact (lista densa / sticky header) — visibilidade restrita", () => {
    it("fresh: NÃO renderiza", () => {
      const { container } = render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.fresh.date}
          thresholdDays={SCENARIOS.fresh.threshold}
          variant="compact"
        />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("aging: text-amber-700 + texto compacto 'há Nd'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.aging.date}
          thresholdDays={SCENARIOS.aging.threshold}
          variant="compact"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.className).toMatch(/text-amber-700/);
      expect(badge.className).not.toMatch(FORBIDDEN_COLORS);
      // Compact usa "há Nd" / "há Nm" — não a frase completa do util.
      expect(badge.textContent).toMatch(/há \d+[dma]/);
    });

    it("stale: text-amber-700 + texto compacto", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.stale.date}
          thresholdDays={SCENARIOS.stale.threshold}
          variant="compact"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.className).toMatch(/text-amber-700/);
      expect(badge.className).not.toMatch(FORBIDDEN_COLORS);
      expect(badge.textContent).toMatch(/há \d+[dma]/);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // INVARIANTES CROMÁTICOS GLOBAIS
  // ════════════════════════════════════════════════════════════════════
  describe("invariantes globais", () => {
    it("nenhum variant introduz cores fora da paleta (orange/red/yellow proibidos)", () => {
      const variants = ["inline", "pdp", "icon-only", "compact"] as const;
      const statuses = ["fresh", "aging", "stale", "unknown"] as const;

      for (const v of variants) {
        for (const s of statuses) {
          const { container, unmount } = render(
            <PriceFreshnessBadge
              priceUpdatedAt={SCENARIOS[s].date}
              thresholdDays={SCENARIOS[s].threshold}
              variant={v}
            />,
          );
          // Verifica todo o markup renderizado, não só o badge raiz.
          const html = container.innerHTML;
          expect(
            FORBIDDEN_COLORS.test(html),
            `${v}/${s} introduziu cor fora da paleta`,
          ).toBe(false);
          unmount();
        }
      }
    });
  });
});
