/**
 * Quick View — `PriceFreshnessBadge` com `alwaysShow=false`.
 *
 * Contexto do contrato (ver `PriceFreshnessBadge.tsx` linhas 293-299):
 *
 *   - `variant="inline"` e `variant="pdp"` SEMPRE renderizam, em todos
 *     os status. `alwaysShow` é irrelevante nessas duas variantes — elas
 *     são canais "ricos" (PDP, Quick View, sticky) que precisam mostrar
 *     o estado completo do preço, inclusive em fresh.
 *
 *   - `variant="icon-only"` e `variant="compact"` SÓ renderizam em
 *     aging|stale (regra do catálogo silencioso). `alwaysShow` é o
 *     único override: quando true, força o badge a aparecer mesmo em
 *     fresh|unknown.
 *
 * O Quick View atual usa `inline + alwaysShow` por convenção (mantém o
 * destaque visual mesmo que alwaysShow seja redundante para inline).
 * Esta suíte trava DOIS contratos:
 *
 *   1. Hosts compactos (cards/lista/tabela ou um futuro Quick View
 *      reduzido) com `alwaysShow=false` permanecem ocultos em
 *      fresh|unknown e respeitam aging|stale — sem regressão.
 *   2. `alwaysShow=true` sobrescreve a regra apenas para variantes
 *      compactas; em inline|pdp continua um no-op (mesma saída).
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

const SCENARIOS = {
  fresh: { date: daysAgo(5), threshold: 60 },
  aging: { date: daysAgo(45), threshold: 60 },
  stale: { date: daysAgo(90), threshold: 60 },
  unknown: { date: null as string | null, threshold: 60 },
} as const;

const COMPACT_VARIANTS = ["compact", "icon-only"] as const;
const FULL_VARIANTS = ["inline", "pdp"] as const;

describe("Quick View / hosts compactos — alwaysShow=false respeita aging|stale", () => {
  // ════════════════════════════════════════════════════════════════════
  // 1. Quando o Quick View (ou qualquer host) usa uma variante compacta
  //    com alwaysShow=false, segue a regra do catálogo: oculto em
  //    fresh|unknown, visível em aging|stale.
  // ════════════════════════════════════════════════════════════════════
  describe.each(COMPACT_VARIANTS)(
    "variant=%s sem alwaysShow",
    (variant) => {
      it("fresh: NÃO renderiza badge", () => {
        const { container } = render(
          <PriceFreshnessBadge
            priceUpdatedAt={SCENARIOS.fresh.date}
            thresholdDays={SCENARIOS.fresh.threshold}
            variant={variant}
            alwaysShow={false}
          />,
        );
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
      });

      it("unknown: NÃO renderiza badge", () => {
        const { container } = render(
          <PriceFreshnessBadge
            priceUpdatedAt={SCENARIOS.unknown.date}
            variant={variant}
            alwaysShow={false}
          />,
        );
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
      });

      it("aging: RENDERIZA badge (regra do catálogo se mantém)", () => {
        render(
          <PriceFreshnessBadge
            priceUpdatedAt={SCENARIOS.aging.date}
            thresholdDays={SCENARIOS.aging.threshold}
            variant={variant}
            alwaysShow={false}
          />,
        );
        const badge = screen.getByRole("status");
        expect(badge).toBeInTheDocument();
        expect(badge.className).toMatch(/text-amber-700/);
      });

      it("stale: RENDERIZA badge", () => {
        render(
          <PriceFreshnessBadge
            priceUpdatedAt={SCENARIOS.stale.date}
            thresholdDays={SCENARIOS.stale.threshold}
            variant={variant}
            alwaysShow={false}
          />,
        );
        const badge = screen.getByRole("status");
        expect(badge).toBeInTheDocument();
        expect(badge.className).toMatch(/text-amber-700/);
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // 2. alwaysShow=true é o único override — força fresh|unknown a
  //    aparecerem em variantes compactas.
  // ════════════════════════════════════════════════════════════════════
  describe.each(COMPACT_VARIANTS)(
    "variant=%s — alwaysShow=true força exibição em fresh|unknown",
    (variant) => {
      it("fresh: RENDERIZA quando alwaysShow=true", () => {
        render(
          <PriceFreshnessBadge
            priceUpdatedAt={SCENARIOS.fresh.date}
            thresholdDays={SCENARIOS.fresh.threshold}
            variant={variant}
            alwaysShow
          />,
        );
        expect(screen.getByRole("status")).toBeInTheDocument();
      });

      it("unknown: RENDERIZA quando alwaysShow=true", () => {
        render(
          <PriceFreshnessBadge
            priceUpdatedAt={SCENARIOS.unknown.date}
            variant={variant}
            alwaysShow
          />,
        );
        expect(screen.getByRole("status")).toBeInTheDocument();
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // 3. Variantes ricas (inline / pdp) — alwaysShow é no-op (sempre
  //    renderizam). Trava o contrato atual do Quick View para evitar
  //    que alguém adicione uma early-return ali e quebre o destaque.
  // ════════════════════════════════════════════════════════════════════
  describe.each(FULL_VARIANTS)(
    "variant=%s — alwaysShow é no-op (sempre renderiza)",
    (variant) => {
      it.each(["fresh", "aging", "stale", "unknown"] as const)(
        "%s: renderiza com alwaysShow=false e alwaysShow=true",
        (status) => {
          const off = render(
            <PriceFreshnessBadge
              priceUpdatedAt={SCENARIOS[status].date}
              thresholdDays={SCENARIOS[status].threshold}
              variant={variant}
              alwaysShow={false}
            />,
          );
          expect(
            off.container.querySelector('[role="status"]'),
            `${variant}/${status} alwaysShow=false deveria renderizar`,
          ).not.toBeNull();
          off.unmount();

          const on = render(
            <PriceFreshnessBadge
              priceUpdatedAt={SCENARIOS[status].date}
              thresholdDays={SCENARIOS[status].threshold}
              variant={variant}
              alwaysShow
            />,
          );
          expect(
            on.container.querySelector('[role="status"]'),
            `${variant}/${status} alwaysShow=true deveria renderizar`,
          ).not.toBeNull();
          on.unmount();
        },
      );
    },
  );

  // ════════════════════════════════════════════════════════════════════
  // 4. Aging/stale são INSENSÍVEIS a alwaysShow em qualquer variant —
  //    o badge de alerta nunca pode ser silenciado por engano.
  // ════════════════════════════════════════════════════════════════════
  describe("aging|stale aparecem em TODAS as variantes, com qualquer alwaysShow", () => {
    it.each([...COMPACT_VARIANTS, ...FULL_VARIANTS])(
      "variant=%s sempre alerta em aging e stale",
      (variant) => {
        for (const status of ["aging", "stale"] as const) {
          for (const flag of [false, true]) {
            const { container, unmount } = render(
              <PriceFreshnessBadge
                priceUpdatedAt={SCENARIOS[status].date}
                thresholdDays={SCENARIOS[status].threshold}
                variant={variant}
                alwaysShow={flag}
              />,
            );
            expect(
              container.querySelector('[role="status"]'),
              `${variant}/${status}/alwaysShow=${flag} deveria alertar`,
            ).not.toBeNull();
            unmount();
          }
        }
      },
    );
  });
});
