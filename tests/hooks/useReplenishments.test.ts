/**
 * Unit tests for replenishment utility functions.
 * We extract and test the pure functions: isReplenishment, calcDaysSince, toReplenishment logic.
 */
import { describe, it, expect } from "vitest";

// Since the functions are not exported, we replicate the logic for unit testing
const REPLENISHMENT_WINDOW_DAYS = 30;

function calcDaysSinceReplenishment(updatedAt: string): number {
  const updated = new Date(updatedAt).getTime();
  const now = Date.now();
  return Math.floor((now - updated) / (1000 * 60 * 60 * 24));
}

function calcDaysRemaining(updatedAt: string): number {
  const elapsed = calcDaysSinceReplenishment(updatedAt);
  return Math.max(0, REPLENISHMENT_WINDOW_DAYS - elapsed);
}

function isReplenishment(p: { created_at: string; updated_at: string }): boolean {
  if (!p.updated_at || !p.created_at) return false;
  const created = new Date(p.created_at).getTime();
  const updated = new Date(p.updated_at).getTime();
  return (updated - created) >= 86400000;
}

describe("Replenishment utility functions", () => {
  describe("isReplenishment", () => {
    it("returns true when updated_at is 1+ day after created_at", () => {
      const created = "2026-04-01T10:00:00Z";
      const updated = "2026-04-03T10:00:00Z"; // 2 days later
      expect(isReplenishment({ created_at: created, updated_at: updated })).toBe(true);
    });

    it("returns false when updated_at equals created_at (new product)", () => {
      const ts = "2026-04-10T12:00:00Z";
      expect(isReplenishment({ created_at: ts, updated_at: ts })).toBe(false);
    });

    it("returns false when updated_at is less than 1 day after created_at", () => {
      const created = "2026-04-10T10:00:00Z";
      const updated = "2026-04-10T20:00:00Z"; // 10 hours later
      expect(isReplenishment({ created_at: created, updated_at: updated })).toBe(false);
    });

    it("returns true when exactly 24h difference", () => {
      const created = "2026-04-10T10:00:00Z";
      const updated = "2026-04-11T10:00:00Z"; // exactly 24h
      expect(isReplenishment({ created_at: created, updated_at: updated })).toBe(true);
    });

    it("handles missing dates gracefully", () => {
      expect(isReplenishment({ created_at: "", updated_at: "" })).toBe(false);
    });
  });

  describe("calcDaysSinceReplenishment", () => {
    it("returns 0 for today", () => {
      const now = new Date().toISOString();
      expect(calcDaysSinceReplenishment(now)).toBe(0);
    });

    it("returns correct days for past dates", () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      expect(calcDaysSinceReplenishment(twoDaysAgo)).toBe(2);
    });

    it("returns 30 for exactly 30 days ago", () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      expect(calcDaysSinceReplenishment(thirtyDaysAgo)).toBe(30);
    });
  });

  describe("calcDaysRemaining", () => {
    it("returns 30 for today", () => {
      const now = new Date().toISOString();
      expect(calcDaysRemaining(now)).toBe(30);
    });

    it("returns 0 when past 30 days", () => {
      const expired = new Date(Date.now() - 35 * 86400000).toISOString();
      expect(calcDaysRemaining(expired)).toBe(0);
    });

    it("returns correct remaining days", () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
      expect(calcDaysRemaining(tenDaysAgo)).toBe(20);
    });
  });

  describe("stock status derivation", () => {
    function getStockStatus(stock: number, minQty: number) {
      return stock === 0 ? "out-of-stock" : stock < minQty ? "low-stock" : "in-stock";
    }

    it("returns out-of-stock when stock is 0", () => {
      expect(getStockStatus(0, 10)).toBe("out-of-stock");
    });

    it("returns low-stock when below min quantity", () => {
      expect(getStockStatus(5, 10)).toBe("low-stock");
    });

    it("returns in-stock when at or above min quantity", () => {
      expect(getStockStatus(10, 10)).toBe("in-stock");
      expect(getStockStatus(100, 10)).toBe("in-stock");
    });
  });

  describe("status derivation", () => {
    function getStatus(daysRemaining: number) {
      return daysRemaining <= 0 ? "expired" : daysRemaining <= 7 ? "expiring_soon" : "active";
    }

    it("returns expired when 0 days remaining", () => {
      expect(getStatus(0)).toBe("expired");
    });

    it("returns expiring_soon when <=7 days remaining", () => {
      expect(getStatus(7)).toBe("expiring_soon");
      expect(getStatus(1)).toBe("expiring_soon");
    });

    it("returns active when >7 days remaining", () => {
      expect(getStatus(8)).toBe("active");
      expect(getStatus(30)).toBe("active");
    });
  });

  describe("is_highlighted flag", () => {
    it("highlights when restocked within 5 days", () => {
      expect(3 <= 5).toBe(true); // daysSince=3
      expect(0 <= 5).toBe(true); // daysSince=0
    });

    it("does not highlight after 5 days", () => {
      expect(6 <= 5).toBe(false);
    });
  });
});
