/**
 * Tests for src/utils/product-colors.ts
 */
import { describe, it, expect } from "vitest";
import { findKnownHex, detectColorGroup, normalizeColors } from "@/utils/product-colors";

describe("product-colors", () => {
  describe("findKnownHex", () => {
    it("returns exact match hex", () => {
      expect(findKnownHex("preto")).toBe("#000000");
      expect(findKnownHex("branco")).toBe("#FFFFFF");
    });

    it("is case-insensitive", () => {
      expect(findKnownHex("AZUL ROYAL")).toBe("#4169E1");
    });

    it("returns null for unknown color", () => {
      expect(findKnownHex("xadrez escocês")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(findKnownHex("")).toBeNull();
    });

    it("handles accented characters", () => {
      expect(findKnownHex("fúcsia")).toBe("#FF00FF");
    });

    it("finds partial matches", () => {
      // "azul" matches first in iteration order
      const result = findKnownHex("azul marinho extra");
      expect(result).not.toBeNull();
    });
  });

  describe("detectColorGroup", () => {
    it("detects primary color groups", () => {
      expect(detectColorGroup("azul royal")).toBe("Azul");
      expect(detectColorGroup("verde musgo")).toBe("Verde");
      expect(detectColorGroup("vermelho bordô")).toBe("Vermelho");
    });

    it("detects neutral colors", () => {
      expect(detectColorGroup("preto fosco")).toBe("Preto");
      expect(detectColorGroup("branco gelo")).toBe("Branco");
    });

    it("returns capitalized first word for unknown", () => {
      expect(detectColorGroup("xadrez")).toBe("Xadrez");
    });
  });

  describe("normalizeColors", () => {
    it("returns empty array for undefined", () => {
      expect(normalizeColors(undefined)).toEqual([]);
    });

    it("normalizes string colors", () => {
      const result = normalizeColors(["Azul", "Vermelho"]);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Azul");
      expect(result[0].group).toBe("Azul");
      expect(result[0].hex).not.toBe("#CCCCCC"); // should find known hex
    });

    it("normalizes object colors", () => {
      const result = normalizeColors([
        { name: "Preto", hex: "#000000", code: "BK01" },
      ]);
      expect(result[0].name).toBe("Preto");
      expect(result[0].hex).toBe("#000000");
      expect(result[0].code).toBe("BK01");
    });

    it("falls back to known hex when object hex is #CCCCCC", () => {
      const result = normalizeColors([{ name: "Azul", hex: "#CCCCCC" }]);
      expect(result[0].hex).not.toBe("#CCCCCC");
    });

    it("handles color_name property", () => {
      const result = normalizeColors([{ color_name: "Rosa" }]);
      expect(result[0].name).toBe("Rosa");
    });

    it("defaults name to 'Sem cor' when missing", () => {
      const result = normalizeColors([{}]);
      expect(result[0].name).toBe("Sem cor");
    });
  });
});
