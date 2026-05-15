/**
 * Tests for src/lib/kit-builder/volume-calculator.ts
 */
import { describe, it, expect } from "vitest";
import {
  calculateVolume,
  calculateUsableVolume,
  calculateTotalItemsVolume,
  calculateVolumeUsagePercent,
  checkItemFits,
  isNearCapacity,
  isAtCapacity,
  formatVolume,
  formatDimensions,
  getVolumeStatusColor,
  getVolumeStatusLabel,
} from "@/lib/kit-builder/volume-calculator";
import type { KitBox, KitItem } from "@/lib/kit-builder/types";

const mockBox: KitBox = {
  id: "box-1", name: "Caixa", price: 10,
  internalWidth: 30, internalHeight: 20, internalDepth: 15,
  internalVolume: 9000, image: null,
};

const smallItem: KitItem = {
  id: "i1", name: "Caneta", price: 5, quantity: 1,
  volume: 50, width: 1, height: 1, depth: 15, image: null,
};

const bigItem: KitItem = {
  id: "i2", name: "Notebook", price: 50, quantity: 1,
  volume: 5000, width: 25, height: 18, depth: 10, image: null,
};

const oversizedItem: KitItem = {
  id: "i3", name: "Caixa Grande", price: 100, quantity: 1,
  volume: 100, width: 35, height: 10, depth: 10, image: null,
};

describe("kit-builder volume-calculator", () => {
  describe("calculateVolume", () => {
    it("returns w*h*d", () => {
      expect(calculateVolume(10, 20, 5)).toBe(1000);
    });
  });

  describe("calculateUsableVolume", () => {
    it("applies 75% packing efficiency", () => {
      expect(calculateUsableVolume(mockBox)).toBe(6750);
    });
  });

  describe("calculateTotalItemsVolume", () => {
    it("sums volume * quantity", () => {
      expect(calculateTotalItemsVolume([smallItem, bigItem])).toBe(5050);
    });

    it("returns 0 for empty", () => {
      expect(calculateTotalItemsVolume([])).toBe(0);
    });
  });

  describe("calculateVolumeUsagePercent", () => {
    it("calculates percent of usable volume", () => {
      // usable = 9000 * 0.75 = 6750
      const pct = calculateVolumeUsagePercent(3375, 9000);
      expect(pct).toBeCloseTo(50, 0);
    });

    it("returns 0 for zero box volume", () => {
      expect(calculateVolumeUsagePercent(100, 0)).toBe(0);
    });

    it("does NOT cap at 100 (allows overflow detection)", () => {
      expect(calculateVolumeUsagePercent(100000, 100)).toBeGreaterThan(100);
    });
  });

  describe("checkItemFits", () => {
    it("returns fits:true for small item", () => {
      const result = checkItemFits(smallItem, mockBox, []);
      expect(result.fits).toBe(true);
    });

    it("returns fits:false when dimensions exceed box in all orientations", () => {
      const result = checkItemFits(oversizedItem, mockBox, []);
      expect(result.fits).toBe(false);
      expect(result.reason).toContain("Dimensões");
    });

    it("returns fits:false when total volume exceeds capacity", () => {
      const manyItems: KitItem[] = [{ ...bigItem, quantity: 2 }];
      const result = checkItemFits(bigItem, mockBox, manyItems);
      expect(result.fits).toBe(false);
      expect(result.reason).toContain("Volume");
    });
  });

  describe("isNearCapacity / isAtCapacity", () => {
    it("nearCapacity true at 85%+", () => {
      expect(isNearCapacity(85)).toBe(true);
      expect(isNearCapacity(84)).toBe(false);
    });

    it("atCapacity true at 100%+", () => {
      expect(isAtCapacity(100)).toBe(true);
      expect(isAtCapacity(99)).toBe(false);
    });
  });

  describe("formatVolume", () => {
    it("shows cm³ for small volumes", () => {
      expect(formatVolume(500)).toBe("500cm³");
    });

    it("shows L for large volumes", () => {
      expect(formatVolume(2500)).toBe("2.5L");
    });
  });

  describe("formatDimensions", () => {
    it("formats as W × H × D cm", () => {
      expect(formatDimensions(10, 20, 5)).toBe("10 × 20 × 5 cm");
    });
  });

  describe("getVolumeStatusColor", () => {
    it("returns destructive at 100%+", () => {
      expect(getVolumeStatusColor(100)).toBe("destructive");
    });

    it("returns warning at 85-99%", () => {
      expect(getVolumeStatusColor(90)).toBe("warning");
    });

    it("returns success below 85%", () => {
      expect(getVolumeStatusColor(50)).toBe("success");
    });
  });

  describe("getVolumeStatusLabel", () => {
    it("returns appropriate labels", () => {
      expect(getVolumeStatusLabel(100)).toBe("Cheio");
      expect(getVolumeStatusLabel(90)).toBe("Quase cheio");
      expect(getVolumeStatusLabel(60)).toBe("Bom uso");
      expect(getVolumeStatusLabel(30)).toBe("Espaço disponível");
      expect(getVolumeStatusLabel(0)).toBe("Vazio");
    });
  });
});
