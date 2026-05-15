/**
 * Resiliência a datas inválidas/ausentes — `PriceFreshnessBadge`.
 *
 * `getPriceFreshness` já cobre o status `unknown` na camada de utilidade
 * (ver `tests/utils/price-freshness-coverage.test.ts`). Aqui validamos o
 * comportamento de UI: o badge precisa renderizar uma mensagem amigável
 * em **todas** as variantes que sempre exibem (`inline`, `pdp`) e
 * **suprimir** o badge nas variantes silenciosas (`compact`, `icon-only`)
 * a menos que `alwaysShow` seja passado — sem quebrar layout, sem lançar
 * exceções e sem produzir DOM com strings tipo "NaN" ou "Invalid Date".
 *
 * Cenários cobertos:
 *   1. `priceUpdatedAt = null` → label "Data de atualização não informada"
 *   2. `priceUpdatedAt = undefined` → mesmo comportamento do null
 *   3. `priceUpdatedAt = ""` (string vazia) → tratado como ausente
 *   4. `priceUpdatedAt = "not-a-date"` → label "Data de atualização inválida"
 *   5. `priceUpdatedAt = "2025-13-45T99:99:99Z"` (ISO sintaticamente quebrado)
 *   6. Variantes silenciosas (`compact`, `icon-only`) não renderizam nada
 *      para `unknown`, evitando alarme falso no catálogo.
 *   7. Confirmação individual (`onConfirm`) NÃO é oferecida quando o
 *      status é `unknown` — não faz sentido confirmar algo sem data.
 *   8. Nenhum copy contém "NaN", "Invalid", "undefined" ou "null".
 */
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

/** Inputs equivalentes a "data ausente" no SSOT. */
const ABSENT_INPUTS: { label: string; value: string | null | undefined }[] = [
  { label: "null explícito", value: null },
  { label: "undefined", value: undefined },
  { label: "string vazia", value: "" },
];

/**
 * Inputs equivalentes a "data inválida" (string presente mas não-parseável
 * pelo `Date` constructor). Cuidado: strings como "12345" ou "2025-06"
 * são parseadas com sucesso (ano 12345 / junho de 2025) — não são
 * "inválidas" sob a ótica do JS, então não entram aqui. Cobrimos apenas
 * o que `Number.isNaN(d.getTime())` realmente captura.
 */
const INVALID_INPUTS: { label: string; value: string }[] = [
  { label: "lixo textual", value: "not-a-date" },
  { label: "ISO com mês/dia/hora fora do range", value: "2025-13-45T99:99:99Z" },
  { label: "string só com letras", value: "abcdefg" },
  { label: "objeto serializado por engano", value: "[object Object]" },
];

/**
 * Captura o texto efetivamente exposto ao usuário (text content + aria-label),
 * que é o que importa para garantir ausência de strings degeneradas.
 */
function readableText(el: HTMLElement): string {
  const aria = el.getAttribute("aria-label") ?? "";
  return `${el.textContent ?? ""} ${aria}`.toLowerCase();
}

const FORBIDDEN_TOKENS = ["nan", "invalid date", "undefined", "null"];

describe("PriceFreshnessBadge — datas ausentes/inválidas", () => {
  describe("variant inline (PDP, sempre renderiza)", () => {
    it.each(ABSENT_INPUTS)(
      "mostra 'Data de atualização não informada' quando priceUpdatedAt é $label",
      ({ value }) => {
        render(<PriceFreshnessBadge priceUpdatedAt={value} variant="inline" />);
        const badge = screen.getByRole("status");
        expect(badge).toHaveAccessibleName(/não informada/i);
        expect(badge.textContent).toMatch(/não informada/i);
      },
    );

    it.each(INVALID_INPUTS)(
      "mostra 'Data de atualização inválida' quando priceUpdatedAt é $label",
      ({ value }) => {
        render(<PriceFreshnessBadge priceUpdatedAt={value} variant="inline" />);
        const badge = screen.getByRole("status");
        expect(badge).toHaveAccessibleName(/inválida/i);
        expect(badge.textContent).toMatch(/inválida/i);
      },
    );
  });

  describe("variant pdp (PDP rico, sempre renderiza)", () => {
    it.each([...ABSENT_INPUTS, ...INVALID_INPUTS])(
      "renderiza copy de fallback amigável para $label sem quebrar o layout",
      ({ value }) => {
        const { container } = render(
          <PriceFreshnessBadge priceUpdatedAt={value} variant="pdp" />,
        );
        const badge = screen.getByRole("status");
        // Existe e é visível (no DOM, com texto).
        expect(badge).toBeInTheDocument();
        expect(badge.textContent?.trim().length ?? 0).toBeGreaterThan(0);
        // O copy do PDP usa "Data de atualização não informada" tanto para
        // ausente quanto para inválida (mesma mensagem amigável ao
        // vendedor — diferença de causa fica no aria-label/tooltip).
        expect(badge.textContent).toMatch(/não informada/i);
        // Layout intacto: nenhum nó com "Invalid Date" / "NaN" exposto.
        expect(readableText(container as unknown as HTMLElement)).not.toMatch(
          /invalid date|\bnan\b/i,
        );
      },
    );
  });

  describe("variantes silenciosas (compact, icon-only) — não poluem catálogo", () => {
    it.each(ABSENT_INPUTS)(
      "compact NÃO renderiza nada quando data é $label (sem alwaysShow)",
      ({ value }) => {
        const { container } = render(
          <PriceFreshnessBadge priceUpdatedAt={value} variant="compact" />,
        );
        expect(container).toBeEmptyDOMElement();
      },
    );

    it.each(ABSENT_INPUTS)(
      "icon-only NÃO renderiza nada quando data é $label (sem alwaysShow)",
      ({ value }) => {
        const { container } = render(
          <PriceFreshnessBadge priceUpdatedAt={value} variant="icon-only" />,
        );
        expect(container).toBeEmptyDOMElement();
      },
    );

    it.each(ABSENT_INPUTS)(
      "compact com alwaysShow renderiza fallback amigável para $label",
      ({ value }) => {
        render(
          <PriceFreshnessBadge
            priceUpdatedAt={value}
            variant="compact"
            alwaysShow
          />,
        );
        const badge = screen.getByRole("status");
        expect(badge).toBeInTheDocument();
        // Compact tem aria-label completo e texto curto — ambos devem
        // refletir o estado "sem data".
        expect(badge).toHaveAccessibleName(/não informada/i);
      },
    );
  });

  describe("ação individual de confirmação", () => {
    it("não oferece botão 'Confirmei' quando status é unknown (data ausente)", () => {
      const onConfirm = vi.fn();
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={null}
          variant="inline"
          onConfirm={onConfirm}
        />,
      );
      // A ação só faz sentido para aging/stale. Sem data, não há nada a
      // confirmar — o botão NÃO deve aparecer.
      expect(
        screen.queryByRole("button", {
          name: /confirmar que validei este preço/i,
        }),
      ).not.toBeInTheDocument();
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("não oferece botão 'Confirmei' quando status é unknown (data inválida)", () => {
      const onConfirm = vi.fn();
      render(
        <PriceFreshnessBadge
          priceUpdatedAt="not-a-date"
          variant="inline"
          onConfirm={onConfirm}
        />,
      );
      expect(
        screen.queryByRole("button", {
          name: /confirmar que validei este preço/i,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe("higiene de DOM — nenhuma string degenerada vaza para o usuário", () => {
    it.each([...ABSENT_INPUTS, ...INVALID_INPUTS])(
      "input $label não produz 'NaN', 'Invalid Date', 'undefined' ou 'null' no DOM",
      ({ value }) => {
        const { container } = render(
          <PriceFreshnessBadge priceUpdatedAt={value} variant="inline" />,
        );
        const text = readableText(container as unknown as HTMLElement);
        for (const token of FORBIDDEN_TOKENS) {
          expect(
            text,
            `input "${String(value)}" expôs token proibido "${token}"`,
          ).not.toContain(token);
        }
      },
    );
  });

  describe("estabilidade — não lança ao montar com inputs degenerados", () => {
    it.each([...ABSENT_INPUTS, ...INVALID_INPUTS])(
      "monta sem exceções para $label em todas as variantes",
      ({ value }) => {
        for (const variant of ["inline", "compact", "icon-only", "pdp"] as const) {
          expect(() => {
            render(
              <PriceFreshnessBadge
                priceUpdatedAt={value}
                variant={variant}
                alwaysShow
              />,
            );
          }).not.toThrow();
        }
      },
    );
  });
});
