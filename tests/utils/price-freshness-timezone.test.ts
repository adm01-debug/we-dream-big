/**
 * Robustez de timezone — `getPriceFreshness`.
 *
 * `getPriceFreshness` calcula a diferença entre `Date.now()` e
 * `new Date(priceUpdatedAt).getTime()`. Como ambos os lados usam epoch ms
 * (UTC absoluto), o resultado deve ser **independente** do fuso em que a
 * string ISO foi escrita pelo fornecedor. Aqui travamos esse contrato:
 *
 *   1. A mesma "instante absoluto" expressa em fusos diferentes
 *      (ex.: "Z", "-03:00", "+09:00") produz exatamente o mesmo
 *      `daysSinceUpdate` e `label`.
 *   2. Formatos ISO equivalentes (com/sem ms, com/sem `T`, com offset
 *      explícito vs. UTC) são parseados de forma consistente.
 *   3. O cálculo de "hoje" não é sensível ao fuso local do servidor:
 *      um timestamp gravado às 23:59 em `-03:00` que cruza meia-noite
 *      UTC continua sendo "hoje" se ainda não passou 24h reais.
 *   4. "Há 1 dia" só dispara após 24h completas — não é baseado em
 *      virada de calendário civil.
 *
 * Esses cenários são reais: o catálogo Promobrind grava `updated_at`
 * em UTC, mas o vendedor pode estar em `America/Sao_Paulo` (-03:00) e
 * fornecedores parceiros podem reportar timestamps com offsets
 * diferentes. Qualquer divergência aqui significaria que o badge
 * mostraria "há 1 dia" para um vendedor e "hoje" para outro.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { getPriceFreshness } from "@/utils/price-freshness";

// 12:00 UTC — escolhido propositalmente para que ±12h não cruze a janela
// de 24h em nenhum fuso comum, evitando ruído nos cenários de "hoje".
const FIXED_NOW = new Date("2025-06-15T12:00:00.000Z").getTime();

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

/**
 * Constrói uma string ISO para um instante exato (offset em ms relativo a
 * `FIXED_NOW`) representado em vários formatos de fuso. Todas as variantes
 * apontam para o **mesmo** instante absoluto, apenas escritas de formas
 * diferentes — exatamente o que esperamos receber de fornecedores
 * heterogêneos.
 */
function isoVariantsFor(instantMs: number): { label: string; iso: string }[] {
  const d = new Date(instantMs);
  const utcIso = d.toISOString(); // "...Z"
  const utcNoMs = utcIso.replace(/\.\d{3}Z$/, "Z");

  // Helper: formata como "YYYY-MM-DDTHH:mm:ss±HH:MM" para um offset arbitrário.
  function withOffset(offsetMinutes: number): string {
    const shifted = new Date(instantMs + offsetMinutes * 60_000);
    const yyyy = shifted.getUTCFullYear();
    const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(shifted.getUTCDate()).padStart(2, "0");
    const hh = String(shifted.getUTCHours()).padStart(2, "0");
    const mi = String(shifted.getUTCMinutes()).padStart(2, "0");
    const ss = String(shifted.getUTCSeconds()).padStart(2, "0");
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absMin = Math.abs(offsetMinutes);
    const oh = String(Math.floor(absMin / 60)).padStart(2, "0");
    const om = String(absMin % 60).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${sign}${oh}:${om}`;
  }

  return [
    { label: "UTC com ms ('Z')", iso: utcIso },
    { label: "UTC sem ms ('Z')", iso: utcNoMs },
    { label: "America/Sao_Paulo (-03:00)", iso: withOffset(-180) },
    { label: "Europe/Lisbon (+01:00)", iso: withOffset(60) },
    { label: "Asia/Tokyo (+09:00)", iso: withOffset(540) },
    { label: "Pacific/Auckland (+12:00)", iso: withOffset(720) },
    { label: "America/Los_Angeles (-08:00)", iso: withOffset(-480) },
  ];
}

describe("getPriceFreshness — robustez de timezone", () => {
  describe("'hoje' (mesmo instante, fusos diferentes)", () => {
    // Instante = "agora" exato, em UTC. Todas as variantes apontam para o
    // mesmo ponto no tempo — devem todas reportar "hoje" / 0 dias.
    it.each(isoVariantsFor(FIXED_NOW))(
      "mesmo instante escrito como $label vira 'hoje'",
      ({ iso }) => {
        const r = getPriceFreshness(iso, 60);
        expect(r.daysSinceUpdate).toBe(0);
        expect(r.label.toLowerCase()).toBe("atualizado hoje");
        expect(r.status).toBe("fresh");
      },
    );

    it("instante 23h atrás escrito em qualquer fuso ainda é 'hoje'", () => {
      // 23h < 24h ⇒ 0 dias completos ⇒ "hoje". Cruza meia-noite UTC e
      // várias meias-noites locais, mas nada disso importa: o cálculo é
      // por delta absoluto.
      const target = FIXED_NOW - 23 * 3600_000;
      for (const v of isoVariantsFor(target)) {
        const r = getPriceFreshness(v.iso, 60);
        expect(
          r.daysSinceUpdate,
          `variante ${v.label} deveria reportar 0 dias`,
        ).toBe(0);
        expect(r.label.toLowerCase()).toBe("atualizado hoje");
      }
    });
  });

  describe("'há N dias' (paridade entre fusos para o mesmo instante)", () => {
    it.each([1, 2, 7, 30, 45, 60, 90])(
      "instante de %i dias atrás produz o mesmo label em todos os fusos",
      (days) => {
        const target = FIXED_NOW - days * 86400_000;
        const variants = isoVariantsFor(target);
        const labels = new Set(
          variants.map((v) => getPriceFreshness(v.iso, 60).label),
        );
        const counts = new Set(
          variants.map((v) => getPriceFreshness(v.iso, 60).daysSinceUpdate),
        );
        // Convergência total: 1 label e 1 contagem para todos os fusos.
        expect(labels.size, `labels divergiram: ${[...labels].join(" | ")}`).toBe(1);
        expect(counts.size, `contagens divergiram: ${[...counts].join(" | ")}`).toBe(1);
        expect([...counts][0]).toBe(days);
      },
    );

    it("singular 'há 1 dia' dispara apenas após 24h completas, independente do fuso", () => {
      // 23h59 atrás ⇒ ainda 0 dias.
      for (const v of isoVariantsFor(FIXED_NOW - (24 * 3600_000 - 60_000))) {
        expect(getPriceFreshness(v.iso, 60).daysSinceUpdate).toBe(0);
      }
      // Exatamente 24h atrás ⇒ 1 dia, label singular.
      for (const v of isoVariantsFor(FIXED_NOW - 24 * 3600_000)) {
        const r = getPriceFreshness(v.iso, 60);
        expect(r.daysSinceUpdate).toBe(1);
        expect(r.label).toBe("Atualizado há 1 dia");
      }
    });
  });

  describe("formatos ISO equivalentes parseados de forma consistente", () => {
    it("ISO com e sem milissegundos produz o mesmo resultado", () => {
      const target = FIXED_NOW - 5 * 86400_000;
      const withMs = new Date(target).toISOString(); // "...000Z"
      const withoutMs = withMs.replace(/\.\d{3}Z$/, "Z");
      const a = getPriceFreshness(withMs, 60);
      const b = getPriceFreshness(withoutMs, 60);
      expect(a.label).toBe(b.label);
      expect(a.daysSinceUpdate).toBe(b.daysSinceUpdate);
      expect(a.status).toBe(b.status);
    });

    it("aceita objeto Date diretamente com mesmo resultado da string ISO equivalente", () => {
      const target = FIXED_NOW - 10 * 86400_000;
      const fromString = getPriceFreshness(new Date(target).toISOString(), 60);
      const fromDate = getPriceFreshness(new Date(target), 60);
      expect(fromString.label).toBe(fromDate.label);
      expect(fromString.daysSinceUpdate).toBe(fromDate.daysSinceUpdate);
      expect(fromString.tooltip).toBe(fromDate.tooltip);
    });

    it("offsets exóticos (+05:30 India, +13:00 Samoa) também convergem", () => {
      // India Standard Time (+05:30) e Samoa (+13:00) são fusos com offsets
      // não-inteiros / extremos — ainda assim representam o mesmo instante
      // absoluto e devem produzir o mesmo label.
      const target = FIXED_NOW - 3 * 86400_000;
      const indiaShifted = new Date(target + 330 * 60_000);
      const samoaShifted = new Date(target + 780 * 60_000);
      const indiaIso = `${indiaShifted.toISOString().slice(0, 19)}+05:30`;
      const samoaIso = `${samoaShifted.toISOString().slice(0, 19)}+13:00`;
      const utcIso = new Date(target).toISOString();

      const a = getPriceFreshness(utcIso, 60);
      const b = getPriceFreshness(indiaIso, 60);
      const c = getPriceFreshness(samoaIso, 60);

      expect(b.daysSinceUpdate).toBe(a.daysSinceUpdate);
      expect(c.daysSinceUpdate).toBe(a.daysSinceUpdate);
      expect(b.label).toBe(a.label);
      expect(c.label).toBe(a.label);
      expect(a.daysSinceUpdate).toBe(3);
    });
  });

  describe("invariância em torno de meia-noite (caso real do catálogo Promobrind)", () => {
    it("timestamp gravado às 23:59 -03:00 não 'pula um dia' por estar quase em UTC+1", () => {
      // Cenário real: vendedor em São Paulo grava 23:59 do dia X local
      // (-03:00). Em UTC isso é 02:59 do dia X+1. Se o cálculo se basear
      // em "dia civil" em vez de delta absoluto, daria 1 dia a mais para
      // observadores em UTC. Aqui garantimos que isso NÃO acontece.
      // Instante = 1h atrás (em UTC).
      const target = FIXED_NOW - 3600_000;
      const localShifted = new Date(target - 180 * 60_000); // como se fosse local -03:00
      const yyyy = localShifted.getUTCFullYear();
      const mm = String(localShifted.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(localShifted.getUTCDate()).padStart(2, "0");
      const hh = String(localShifted.getUTCHours()).padStart(2, "0");
      const mi = String(localShifted.getUTCMinutes()).padStart(2, "0");
      const iso = `${yyyy}-${mm}-${dd}T${hh}:${mi}:00-03:00`;

      const r = getPriceFreshness(iso, 60);
      expect(r.daysSinceUpdate).toBe(0);
      expect(r.label.toLowerCase()).toBe("atualizado hoje");
    });
  });
});
