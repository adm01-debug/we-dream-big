import { describe, it, expect } from "vitest";
import {
  normalizeMaskedSuffix,
  formatMaskedSuffix,
  diagnoseMaskedSuffix,
  resolveDisplaySuffix,
  formatDisplaySuffix,
} from "@/lib/masked-suffix";

describe("normalizeMaskedSuffix — paridade de comprimento", () => {
  it("0 chars (null) → '????'", () => {
    expect(normalizeMaskedSuffix(null)).toBe("????");
    expect(normalizeMaskedSuffix(undefined)).toBe("????");
    expect(normalizeMaskedSuffix("")).toBe("????");
  });

  it("1 char 'a' → '•••a' (padding à esquerda)", () => {
    expect(normalizeMaskedSuffix("a")).toBe("•••a");
  });

  it("2 chars 'ab' → '••ab'", () => {
    expect(normalizeMaskedSuffix("ab")).toBe("••ab");
  });

  it("3 chars 'abc' → '•abc'", () => {
    expect(normalizeMaskedSuffix("abc")).toBe("•abc");
  });

  it("4 chars 'abcd' → 'abcd' (passa direto)", () => {
    expect(normalizeMaskedSuffix("abcd")).toBe("abcd");
  });

  it(">4 chars 'abcdefgh' → 'efgh' (últimos 4)", () => {
    expect(normalizeMaskedSuffix("abcdefgh")).toBe("efgh");
  });

  it("sempre retorna exatamente 4 chars", () => {
    for (const v of [null, "", "a", "ab", "abc", "abcd", "abcdef", "x".repeat(50)]) {
      expect(normalizeMaskedSuffix(v).length).toBe(4);
    }
  });
});

describe("formatMaskedSuffix — prefixo ••••", () => {
  it("sempre devolve 8 chars (••••XXXX)", () => {
    expect(formatMaskedSuffix(null)).toBe("••••????");
    expect(formatMaskedSuffix("a")).toBe("••••••••a".slice(-8)); // ••••••a → na verdade ••••+•••a = "••••" + "•••a"
    expect(formatMaskedSuffix("ab")).toBe("••••••ab");
    expect(formatMaskedSuffix("abcd")).toBe("••••abcd");
    expect(formatMaskedSuffix("xxxxxabcd")).toBe("••••abcd");
  });
});

describe("diagnoseMaskedSuffix — status + mensagem", () => {
  it("0 chars → status 'missing' + label e mensagem orientando re-salvar", () => {
    const d = diagnoseMaskedSuffix(null);
    expect(d.status).toBe("missing");
    expect(d.realLength).toBe(0);
    expect(d.label).toBe("Sufixo ausente");
    expect(d.message).toContain("Atualizar credencial");
    expect(d.message).toContain(".env");
  });

  it("0 chars com secretName → mensagem personalizada", () => {
    const d = diagnoseMaskedSuffix("", { secretName: "BITRIX24_TOKEN" });
    expect(d.message).toContain('"BITRIX24_TOKEN"');
  });

  it("1 char → status 'short' + label '(1/4)'", () => {
    const d = diagnoseMaskedSuffix("a");
    expect(d.status).toBe("short");
    expect(d.realLength).toBe(1);
    expect(d.label).toBe("Sufixo curto (1/4)");
    expect(d.message).toContain("1 caractere ");
    expect(d.message).not.toContain("1 caracteres");
    expect(d.message).toContain("Re-salve");
  });

  it("2 chars → status 'short' + label '(2/4)'", () => {
    const d = diagnoseMaskedSuffix("ab");
    expect(d.status).toBe("short");
    expect(d.realLength).toBe(2);
    expect(d.label).toBe("Sufixo curto (2/4)");
    expect(d.message).toContain("2 caracteres");
  });

  it("3 chars → status 'short' + label '(3/4)'", () => {
    const d = diagnoseMaskedSuffix("abc");
    expect(d.status).toBe("short");
    expect(d.realLength).toBe(3);
    expect(d.label).toBe("Sufixo curto (3/4)");
  });

  it("4 chars → status 'valid'", () => {
    const d = diagnoseMaskedSuffix("abcd");
    expect(d.status).toBe("valid");
    expect(d.realLength).toBe(4);
    expect(d.label).toBe("Sufixo OK");
  });

  it(">4 chars → status 'valid' (realLength reflete o comprimento real)", () => {
    const d = diagnoseMaskedSuffix("abcdefgh");
    expect(d.status).toBe("valid");
    expect(d.realLength).toBe(8);
  });
});

describe("resolveDisplaySuffix — fallback derivado", () => {
  it("sufixo válido (4+) vence sobre length", () => {
    expect(resolveDisplaySuffix("abcd", { length: 50 })).toBe("abcd");
    expect(resolveDisplaySuffix("xxxxabcd", { length: 50 })).toBe("abcd");
  });

  it("sufixo curto (1-3) usa padding com •", () => {
    expect(resolveDisplaySuffix("a")).toBe("•••a");
    expect(resolveDisplaySuffix("ab")).toBe("••ab");
    expect(resolveDisplaySuffix("abc")).toBe("•abc");
  });

  it("sufixo ausente + length<10 → 'L=0N'", () => {
    expect(resolveDisplaySuffix(null, { length: 5 })).toBe("L=05");
    expect(resolveDisplaySuffix("", { length: 9 })).toBe("L=09");
  });

  it("sufixo ausente + length 10-99 → 'L=NN'", () => {
    expect(resolveDisplaySuffix(null, { length: 12 })).toBe("L=12");
    expect(resolveDisplaySuffix(null, { length: 99 })).toBe("L=99");
  });

  it("sufixo ausente + length>=100 → 'L99+'", () => {
    expect(resolveDisplaySuffix(null, { length: 100 })).toBe("L99+");
    expect(resolveDisplaySuffix(null, { length: 9999 })).toBe("L99+");
  });

  it("sufixo ausente + length null/0 → '????'", () => {
    expect(resolveDisplaySuffix(null)).toBe("????");
    expect(resolveDisplaySuffix(null, { length: 0 })).toBe("????");
    expect(resolveDisplaySuffix(null, { length: null })).toBe("????");
  });

  it("sempre retorna exatamente 4 chars (todos os caminhos)", () => {
    const cases = [
      [null, undefined],
      [null, { length: 1 }],
      [null, { length: 50 }],
      [null, { length: 500 }],
      ["a", undefined],
      ["abc", undefined],
      ["abcd", undefined],
      ["xxxxabcd", undefined],
    ] as const;
    for (const [raw, opts] of cases) {
      expect(resolveDisplaySuffix(raw, opts as any).length).toBe(4);
    }
  });
});

describe("formatDisplaySuffix — sempre 8 chars", () => {
  it("preserva layout •••• + 4 chars em todos os cenários", () => {
    expect(formatDisplaySuffix("abcd")).toBe("••••abcd");
    expect(formatDisplaySuffix("ab")).toBe("••••••ab");
    expect(formatDisplaySuffix(null, { length: 12 })).toBe("••••L=12");
    expect(formatDisplaySuffix(null, { length: 5 })).toBe("••••L=05");
    expect(formatDisplaySuffix(null, { length: 200 })).toBe("••••L99+");
    expect(formatDisplaySuffix(null)).toBe("••••????");
  });

  it("comprimento total sempre 8", () => {
    for (const raw of [null, "", "a", "ab", "abc", "abcd", "abcdefgh"]) {
      for (const len of [undefined, 0, 5, 50, 500]) {
        expect(formatDisplaySuffix(raw, { length: len }).length).toBe(8);
      }
    }
  });
});
