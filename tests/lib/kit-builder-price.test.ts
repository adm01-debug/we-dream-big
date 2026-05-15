/**
 * Tests for src/lib/kit-builder/price-calculator.ts
 */
import { describe, it, expect } from "vitest";
import {
  calculateBoxPrice,
  calculateItemsPrice,
  calculatePersonalizationPrice,
  calculateTotalKitPrice,
  calculateSavings,
  formatCurrency,
  formatUnitPrice,
  generatePriceBreakdown,
} from "@/lib/kit-builder/price-calculator";
import type { KitBox, KitItem, KitPersonalization } from "@/lib/kit-builder/types";

// ── Fixtures ──

const mockBox: KitBox = {
  id: "box-1", name: "Caixa Kraft", price: 15,
  internalWidth: 30, internalHeight: 20, internalDepth: 15, internalVolume: 9000,
  image: null,
};

const mockItems: KitItem[] = [
  { id: "item-1", name: "Caneta", price: 5, quantity: 2, volume: 50, width: 1, height: 1, depth: 15, image: null },
  { id: "item-2", name: "Caderno", price: 20, quantity: 1, volume: 500, width: 15, height: 20, depth: 2, image: null },
];

const emptyPersonalization: KitPersonalization = {
  box: { enabled: false },
  items: {},
};

const fullPersonalization: KitPersonalization = {
  box: { enabled: true, estimatedPrice: 3, techniqueName: "Serigrafia" },
  items: {
    "item-1": { enabled: true, estimatedPrice: 1.5, techniqueName: "Laser" },
    "item-2": { enabled: false },
  },
};

// ── Tests ──

describe("kit-builder price-calculator", () => {
  describe("calculateBoxPrice", () => {
    it("returns 0 for null box", () => {
      expect(calculateBoxPrice(null)).toBe(0);
    });

    it("multiplies box price by quantity", () => {
      expect(calculateBoxPrice(mockBox, 10)).toBe(150);
    });

    it("defaults quantity to 1", () => {
      expect(calculateBoxPrice(mockBox)).toBe(15);
    });
  });

  describe("calculateItemsPrice", () => {
    it("sums price * quantity for all items", () => {
      expect(calculateItemsPrice(mockItems)).toBe(30); // 5*2 + 20*1
    });

    it("returns 0 for empty array", () => {
      expect(calculateItemsPrice([])).toBe(0);
    });
  });

  describe("calculatePersonalizationPrice", () => {
    it("returns 0 when no personalization enabled", () => {
      expect(calculatePersonalizationPrice(emptyPersonalization, mockItems, 5)).toBe(0);
    });

    it("sums box and item personalization prices (multiplied by kitQuantity)", () => {
      // box: 3 * 5 = 15, item-1: 1.5 * item.quantity(2) * kitQuantity(5) = 15
      // Total = 15 + 15 = 30
      expect(calculatePersonalizationPrice(fullPersonalization, mockItems, 5)).toBe(30);
    });
  });

  describe("calculateTotalKitPrice", () => {
    it("returns all price components", () => {
      const result = calculateTotalKitPrice(mockBox, mockItems, emptyPersonalization, 10);
      expect(result.boxPrice).toBe(150);
      expect(result.itemsPrice).toBe(300); // 30 * 10
      expect(result.personalizationPrice).toBe(0);
      expect(result.subtotal).toBe(450);
      expect(result.total).toBe(450);
      expect(result.unitPrice).toBe(45);
    });

    it("handles null box", () => {
      const result = calculateTotalKitPrice(null, mockItems, emptyPersonalization, 1);
      expect(result.boxPrice).toBe(0);
      expect(result.itemsPrice).toBe(30);
    });

    it("handles zero quantity", () => {
      const result = calculateTotalKitPrice(mockBox, mockItems, emptyPersonalization, 0);
      expect(result.unitPrice).toBe(0);
    });
  });

  describe("calculateSavings", () => {
    it("calculates savings amount and percent", () => {
      const result = calculateSavings(80, 100);
      expect(result.amount).toBe(20);
      expect(result.percent).toBe(20);
    });

    it("returns 0 when kit is more expensive", () => {
      const result = calculateSavings(120, 100);
      expect(result.amount).toBe(0);
      expect(result.percent).toBe(0);
    });

    it("handles zero individual price", () => {
      const result = calculateSavings(0, 0);
      expect(result.percent).toBe(0);
    });
  });

  describe("formatCurrency", () => {
    it("formats as BRL", () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain("1.234,56");
    });
  });

  describe("formatUnitPrice", () => {
    it("divides total by quantity and appends /un", () => {
      const result = formatUnitPrice(100, 4);
      expect(result).toContain("25,00");
      expect(result).toContain("/un");
    });

    it("handles zero quantity", () => {
      const result = formatUnitPrice(100, 0);
      expect(result).toContain("0,00");
    });
  });

  describe("generatePriceBreakdown", () => {
    it("includes box and items in breakdown", () => {
      const breakdown = generatePriceBreakdown(mockBox, mockItems, emptyPersonalization, 1);
      expect(breakdown.length).toBe(3); // box + 2 items
      expect(breakdown[0].label).toContain("Caixa");
    });

    it("includes personalization lines when enabled", () => {
      const breakdown = generatePriceBreakdown(mockBox, mockItems, fullPersonalization, 1);
      const persLines = breakdown.filter(b => b.isPersonalization);
      expect(persLines.length).toBe(2); // box + item-1
    });

    it("handles null box", () => {
      const breakdown = generatePriceBreakdown(null, mockItems, emptyPersonalization, 1);
      expect(breakdown.length).toBe(2); // just items
    });
  });
});
