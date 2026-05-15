/**
 * Testes abrangentes para o sistema de mini-carrossel de variantes de cor.
 * Cobre: resolveAllMatchingColors em todos os cenários do dia a dia.
 */
import { describe, it, expect } from "vitest";
import { resolveAllMatchingColors, type MatchedColorVariant } from "@/utils/color-variant-carousel";
import { COLOR_GROUP_HEX } from "@/utils/color-group-hex";

// ─── Helpers ────────────────────────────────────────────────────────
const makeColor = (overrides: Record<string, unknown> = {}) => ({
  name: "Azul Royal",
  hex: "#1E40AF",
  group: "Azul",
  groupSlug: "azul",
  variationSlug: "azul-royal",
  image: "https://cdn.example.com/azul.jpg",
  images: ["https://cdn.example.com/azul-hd.jpg"],
  ...overrides,
});

// ─── 1. Retornos vazios ─────────────────────────────────────────────
describe("resolveAllMatchingColors — cenários sem match", () => {
  it("retorna [] quando activeColorFilter é null", () => {
    expect(resolveAllMatchingColors([makeColor()], null)).toEqual([]);
  });

  it("retorna [] quando activeColorFilter é undefined", () => {
    expect(resolveAllMatchingColors([makeColor()], undefined)).toEqual([]);
  });

  it("retorna [] quando groups e variations estão vazios", () => {
    expect(resolveAllMatchingColors([makeColor()], { groups: [], variations: [] })).toEqual([]);
  });

  it("retorna [] quando productColors é array vazio e não há fallback de grupo", () => {
    expect(resolveAllMatchingColors([], { groups: ["inexistente"], variations: [] })).toEqual([]);
  });
});

// ─── 2. Match por grupo único ────────────────────────────────────────
describe("resolveAllMatchingColors — match por grupo único", () => {
  it("faz match pelo groupSlug exato", () => {
    const colors = [makeColor({ groupSlug: "rosa", hex: "#E91E8C", name: "Rosa" })];
    const result = resolveAllMatchingColors(colors, { groups: ["rosa"], variations: [] });
    expect(result).toHaveLength(1);
    expect(result[0].hex).toBe("#E91E8C");
    expect(result[0].name).toBe("Rosa");
  });

  it("faz match pelo group name (fuzzy) quando groupSlug não bate", () => {
    const colors = [makeColor({ groupSlug: undefined, group: "Rosa", hex: "#E91E8C", name: "Rosa Bebê" })];
    const result = resolveAllMatchingColors(colors, { groups: ["rosa"], variations: [] });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Rosa Bebê");
  });

  it("usa fallback COLOR_GROUP_HEX quando produto não tem cor correspondente", () => {
    const colors = [makeColor({ groupSlug: "verde", group: "Verde" })];
    const result = resolveAllMatchingColors(colors, { groups: ["rosa"], variations: [] });
    expect(result).toHaveLength(1);
    expect(result[0].hex).toBe(COLOR_GROUP_HEX["rosa"]);
    expect(result[0].name).toBe("Rosa");
  });

  it("retorna imagem da variante (images[0] tem prioridade sobre image)", () => {
    const colors = [makeColor({ groupSlug: "azul", images: ["hd.jpg"], image: "thumb.jpg" })];
    const result = resolveAllMatchingColors(colors, { groups: ["azul"], variations: [] });
    expect(result[0].image).toBe("hd.jpg");
  });

  it("usa image como fallback quando images está vazio", () => {
    const colors = [makeColor({ groupSlug: "azul", images: [], image: "thumb.jpg" })];
    const result = resolveAllMatchingColors(colors, { groups: ["azul"], variations: [] });
    expect(result[0].image).toBe("thumb.jpg");
  });
});

// ─── 3. Match por múltiplos grupos (cenário Rosa + Azul) ─────────────
describe("resolveAllMatchingColors — múltiplos grupos", () => {
  const multiColors = [
    makeColor({ groupSlug: "rosa", group: "Rosa", hex: "#E91E8C", name: "Rosa Pink", image: "rosa.jpg", images: [] }),
    makeColor({ groupSlug: "azul", group: "Azul", hex: "#3B82F6", name: "Azul Celeste", image: "azul.jpg", images: [] }),
    makeColor({ groupSlug: "verde", group: "Verde", hex: "#22C55E", name: "Verde Limão", image: "verde.jpg", images: [] }),
  ];

  it("retorna 2 variantes quando 2 grupos estão filtrados (Rosa + Azul)", () => {
    const result = resolveAllMatchingColors(multiColors, { groups: ["rosa", "azul"], variations: [] });
    expect(result).toHaveLength(2);
    expect(result.map(r => r.groupSlug)).toEqual(["rosa", "azul"]);
  });

  it("retorna 3 variantes quando 3 grupos estão filtrados", () => {
    const result = resolveAllMatchingColors(multiColors, { groups: ["rosa", "azul", "verde"], variations: [] });
    expect(result).toHaveLength(3);
  });

  it("mantém a ordem dos grupos filtrados (não a do produto)", () => {
    const result = resolveAllMatchingColors(multiColors, { groups: ["azul", "rosa"], variations: [] });
    expect(result[0].groupSlug).toBe("azul");
    expect(result[1].groupSlug).toBe("rosa");
  });

  it("mistura match real + fallback quando produto só tem uma das cores", () => {
    const partialColors = [makeColor({ groupSlug: "rosa", group: "Rosa", hex: "#E91E8C", name: "Rosa" })];
    const result = resolveAllMatchingColors(partialColors, { groups: ["rosa", "azul"], variations: [] });
    expect(result).toHaveLength(2);
    expect(result[0].hex).toBe("#E91E8C"); // match real
    expect(result[1].hex).toBe(COLOR_GROUP_HEX["azul"]); // fallback
  });
});

// ─── 4. Match por variações (variation slugs) ────────────────────────
describe("resolveAllMatchingColors — match por variation slug", () => {
  it("faz match por variationSlug", () => {
    const colors = [makeColor({ variationSlug: "azul-marinho", name: "Azul Marinho", hex: "#1E3A5F" })];
    const result = resolveAllMatchingColors(colors, { groups: [], variations: ["azul-marinho"] });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Azul Marinho");
  });

  it("retorna múltiplas variations", () => {
    const colors = [
      makeColor({ variationSlug: "azul-marinho", name: "Azul Marinho", hex: "#1E3A5F" }),
      makeColor({ variationSlug: "azul-royal", name: "Azul Royal", hex: "#1E40AF" }),
    ];
    const result = resolveAllMatchingColors(colors, { groups: [], variations: ["azul-marinho", "azul-royal"] });
    expect(result).toHaveLength(2);
  });

  it("ignora variation que não existe no produto", () => {
    const colors = [makeColor({ variationSlug: "azul-marinho" })];
    const result = resolveAllMatchingColors(colors, { groups: [], variations: ["rosa-bebê"] });
    expect(result).toHaveLength(0);
  });
});

// ─── 5. Match misto: groups + variations ─────────────────────────────
describe("resolveAllMatchingColors — match misto groups + variations", () => {
  it("combina resultados de groups e variations sem duplicatas", () => {
    const colors = [
      makeColor({ groupSlug: "rosa", variationSlug: "rosa-pink", hex: "#E91E8C", name: "Rosa Pink" }),
      makeColor({ groupSlug: "azul", variationSlug: "azul-royal", hex: "#1E40AF", name: "Azul Royal" }),
    ];
    const result = resolveAllMatchingColors(colors, { groups: ["rosa"], variations: ["azul-royal"] });
    expect(result).toHaveLength(2);
    expect(result.map(r => r.name)).toContain("Rosa Pink");
    expect(result.map(r => r.name)).toContain("Azul Royal");
  });

  it("evita duplicata quando grupo e variação apontam para a mesma cor", () => {
    const colors = [
      makeColor({ groupSlug: "rosa", variationSlug: "rosa-pink", hex: "#E91E8C", name: "Rosa Pink" }),
    ];
    const result = resolveAllMatchingColors(colors, { groups: ["rosa"], variations: ["rosa-pink"] });
    // Deve retornar apenas 1 (não duplicar)
    expect(result).toHaveLength(1);
  });
});

// ─── 6. Fallback sem cores de produto ────────────────────────────────
describe("resolveAllMatchingColors — fallback sem cores de produto", () => {
  it("retorna fallback do COLOR_GROUP_HEX para cada grupo filtrado", () => {
    const result = resolveAllMatchingColors([], { groups: ["rosa", "azul"], variations: [] });
    expect(result).toHaveLength(2);
    expect(result[0].hex).toBe(COLOR_GROUP_HEX["rosa"]);
    expect(result[1].hex).toBe(COLOR_GROUP_HEX["azul"]);
  });

  it("retorna fallback com nome capitalizado", () => {
    const result = resolveAllMatchingColors([], { groups: ["verde"], variations: [] });
    expect(result[0].name).toBe("Verde");
  });

  it("ignora grupos desconhecidos no fallback", () => {
    const result = resolveAllMatchingColors([], { groups: ["neon-roxo-cósmico"], variations: [] });
    expect(result).toHaveLength(0);
  });

  it("não retorna fallback para variations sem produto", () => {
    const result = resolveAllMatchingColors([], { groups: [], variations: ["azul-royal"] });
    expect(result).toHaveLength(0);
  });
});

// ─── 7. Deduplicação e edge cases ────────────────────────────────────
describe("resolveAllMatchingColors — deduplicação e edge cases", () => {
  it("não duplica se produto tem 2 variantes do mesmo grupo", () => {
    const colors = [
      makeColor({ groupSlug: "azul", variationSlug: "azul-royal", hex: "#1E40AF", name: "Azul Royal" }),
      makeColor({ groupSlug: "azul", variationSlug: "azul-celeste", hex: "#87CEEB", name: "Azul Celeste" }),
    ];
    // Filtrando por grupo "azul" → deve pegar o primeiro representante
    const result = resolveAllMatchingColors(colors, { groups: ["azul"], variations: [] });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Azul Royal");
  });

  it("lida com productColors null/undefined graciosamente", () => {
    // @ts-expect-error testing null input
    const result = resolveAllMatchingColors(null, { groups: ["rosa"], variations: [] });
    expect(result).toHaveLength(1); // fallback
    expect(result[0].hex).toBe(COLOR_GROUP_HEX["rosa"]);
  });

  it("usa #888 como hex fallback quando cor não tem hex nem está no mapa", () => {
    const colors = [makeColor({ groupSlug: "custom-x", hex: undefined, group: "custom-x" })];
    const result = resolveAllMatchingColors(colors, { groups: ["custom-x"], variations: [] });
    expect(result[0].hex).toBe("#888");
  });

  it("preserva groupSlug e variationSlug no resultado", () => {
    const colors = [makeColor({ groupSlug: "rosa", variationSlug: "rosa-bebê" })];
    const result = resolveAllMatchingColors(colors, { groups: ["rosa"], variations: [] });
    expect(result[0].groupSlug).toBe("rosa");
    expect(result[0].variationSlug).toBe("rosa-bebê");
  });
});

// ─── 8. Cenários de produção reais ──────────────────────────────────
describe("resolveAllMatchingColors — cenários de produção", () => {
  const realProductColors = [
    { name: "Branco", hex: "#FFFFFF", group: "Branco", groupSlug: "branco", variationSlug: "branco", image: "branco.jpg", images: [] },
    { name: "Preto", hex: "#000000", group: "Preto", groupSlug: "preto", variationSlug: "preto", image: "preto.jpg", images: [] },
    { name: "Rosa Pink", hex: "#FF1493", group: "Rosa", groupSlug: "rosa", variationSlug: "rosa-pink", image: "rosa.jpg", images: [] },
    { name: "Azul Marinho", hex: "#000080", group: "Azul", groupSlug: "azul", variationSlug: "azul-marinho", image: "azul.jpg", images: [] },
    { name: "Verde Limão", hex: "#32CD32", group: "Verde", groupSlug: "verde", variationSlug: "verde-limao", image: "verde.jpg", images: [] },
  ];

  it("cenário: vendedor filtra Rosa + Azul → vê 2 variantes", () => {
    const result = resolveAllMatchingColors(realProductColors, { groups: ["rosa", "azul"], variations: [] });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Rosa Pink");
    expect(result[0].image).toBe("rosa.jpg");
    expect(result[1].name).toBe("Azul Marinho");
    expect(result[1].image).toBe("azul.jpg");
  });

  it("cenário: vendedor filtra Branco + Preto + Verde → vê 3 variantes", () => {
    const result = resolveAllMatchingColors(realProductColors, { groups: ["branco", "preto", "verde"], variations: [] });
    expect(result).toHaveLength(3);
  });

  it("cenário: vendedor filtra 1 cor só → carrossel NÃO aparece (length <= 1)", () => {
    const result = resolveAllMatchingColors(realProductColors, { groups: ["rosa"], variations: [] });
    expect(result).toHaveLength(1);
    // No componente: hasMultipleVariants = result.length > 1 → false → carousel hidden
  });

  it("cenário: vendedor filtra cor que produto NÃO tem → fallback com hex do mapa", () => {
    const result = resolveAllMatchingColors(realProductColors, { groups: ["rosa", "dourado"], variations: [] });
    expect(result).toHaveLength(2);
    expect(result[1].hex).toBe(COLOR_GROUP_HEX["dourado"]);
    expect(result[1].image).toBeUndefined();
  });

  it("cenário: filtro por variação específica 'azul-marinho'", () => {
    const result = resolveAllMatchingColors(realProductColors, { groups: [], variations: ["azul-marinho"] });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Azul Marinho");
    expect(result[0].hex).toBe("#000080");
  });

  it("cenário: filtro combinado grupo 'rosa' + variação 'azul-marinho'", () => {
    const result = resolveAllMatchingColors(realProductColors, { groups: ["rosa"], variations: ["azul-marinho"] });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Rosa Pink");
    expect(result[1].name).toBe("Azul Marinho");
  });

  it("cenário: todas as 5 cores filtradas → retorna 5 variantes", () => {
    const result = resolveAllMatchingColors(realProductColors, {
      groups: ["branco", "preto", "rosa", "azul", "verde"],
      variations: [],
    });
    expect(result).toHaveLength(5);
  });
});

// ─── 9. Lógica do componente: safeVariantIdx ─────────────────────────
describe("Lógica do componente — safeVariantIdx", () => {
  it("clamp do índice quando activeVariantIdx > length - 1", () => {
    const variants = resolveAllMatchingColors(
      [
        { name: "Rosa", hex: "#E91E8C", group: "Rosa", groupSlug: "rosa" },
        { name: "Azul", hex: "#3B82F6", group: "Azul", groupSlug: "azul" },
      ],
      { groups: ["rosa", "azul"], variations: [] },
    );
    expect(variants).toHaveLength(2);
    const activeVariantIdx = 99;
    const safeIdx = Math.min(activeVariantIdx, variants.length - 1);
    expect(safeIdx).toBe(1);
  });

  it("safeVariantIdx = 0 quando apenas 1 variante (carousel hidden)", () => {
    const variants = resolveAllMatchingColors(
      [makeColor({ groupSlug: "rosa" })],
      { groups: ["rosa"], variations: [] },
    );
    const hasMultiple = variants.length > 1;
    const safeIdx = hasMultiple ? Math.min(0, variants.length - 1) : 0;
    expect(safeIdx).toBe(0);
    expect(hasMultiple).toBe(false);
  });
});
