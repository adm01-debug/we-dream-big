/**
 * Tests for src/lib/date-utils.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatDateRelative,
  formatDateCompact,
  formatDateLong,
  formatWeekday,
  formatMonthYear,
  isToday,
  isYesterday,
  isTomorrow,
  formatDateSmart,
} from "@/lib/date-utils";

describe("date-utils", () => {
  // Use a fixed "now" for deterministic tests
  const FIXED_NOW = new Date(2026, 2, 18, 14, 30, 0); // 2026-03-18 14:30

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── formatDate ──────────────────────────────────────────

  describe("formatDate", () => {
    it("formats ISO string with default pattern", () => {
      expect(formatDate("2026-03-18T10:00:00Z")).toBe("18/03/2026");
    });

    it("formats Date object", () => {
      expect(formatDate(new Date(2026, 0, 5))).toBe("05/01/2026");
    });

    it("formats timestamp number", () => {
      const ts = new Date(2025, 11, 25).getTime();
      expect(formatDate(ts)).toBe("25/12/2025");
    });

    it("accepts custom pattern", () => {
      expect(formatDate("2026-03-18", "yyyy-MM-dd")).toBe("2026-03-18");
    });
  });

  // ── formatDateTime ─────────────────────────────────────

  describe("formatDateTime", () => {
    it("returns date and time in pt-BR format", () => {
      const result = formatDateTime("2026-03-18T14:30:00");
      expect(result).toMatch(/18\/03\/2026 14:30/);
    });
  });

  // ── formatTime ─────────────────────────────────────────

  describe("formatTime", () => {
    it("extracts only hours and minutes", () => {
      expect(formatTime("2026-03-18T09:05:00")).toBe("09:05");
    });
  });

  // ── formatDateRelative ─────────────────────────────────

  describe("formatDateRelative", () => {
    it("returns relative string with suffix", () => {
      const twoDaysAgo = new Date(2026, 2, 16, 14, 30);
      const result = formatDateRelative(twoDaysAgo, FIXED_NOW);
      expect(result).toContain("2");
    });
  });

  // ── formatDateCompact ──────────────────────────────────

  describe("formatDateCompact", () => {
    it("returns compact format", () => {
      const result = formatDateCompact("2026-12-25T10:30:00");
      expect(result).toMatch(/25.*dez.*2026.*10:30/i);
    });
  });

  // ── formatDateLong ─────────────────────────────────────

  describe("formatDateLong", () => {
    it("returns full date in Portuguese", () => {
      const result = formatDateLong("2026-12-25");
      expect(result).toMatch(/25 de dezembro de 2026/i);
    });
  });

  // ── formatWeekday ──────────────────────────────────────

  describe("formatWeekday", () => {
    it("returns weekday in Portuguese", () => {
      // 2026-03-18 is a Wednesday
      const result = formatWeekday("2026-03-18");
      expect(result.toLowerCase()).toContain("quarta");
    });
  });

  // ── formatMonthYear ────────────────────────────────────

  describe("formatMonthYear", () => {
    it("returns month and year in Portuguese", () => {
      const result = formatMonthYear("2026-03-18");
      expect(result.toLowerCase()).toContain("março");
      expect(result).toContain("2026");
    });
  });

  // ── isToday / isYesterday / isTomorrow ─────────────────

  describe("isToday", () => {
    it("returns true for today", () => {
      expect(isToday(FIXED_NOW)).toBe(true);
    });

    it("returns false for yesterday", () => {
      const yesterday = new Date(2026, 2, 17);
      expect(isToday(yesterday)).toBe(false);
    });

    it("handles ISO string", () => {
      expect(isToday("2026-03-18T23:59:59")).toBe(true);
    });
  });

  describe("isYesterday", () => {
    it("returns true for yesterday", () => {
      expect(isYesterday(new Date(2026, 2, 17))).toBe(true);
    });

    it("returns false for today", () => {
      expect(isYesterday(FIXED_NOW)).toBe(false);
    });
  });

  describe("isTomorrow", () => {
    it("returns true for tomorrow", () => {
      expect(isTomorrow(new Date(2026, 2, 19))).toBe(true);
    });

    it("returns false for today", () => {
      expect(isTomorrow(FIXED_NOW)).toBe(false);
    });
  });

  // ── formatDateSmart ────────────────────────────────────

  describe("formatDateSmart", () => {
    it("returns 'Hoje' for today", () => {
      expect(formatDateSmart(FIXED_NOW)).toBe("Hoje");
    });

    it("returns 'Ontem' for yesterday", () => {
      expect(formatDateSmart(new Date(2026, 2, 17))).toBe("Ontem");
    });

    it("returns 'Amanhã' for tomorrow", () => {
      expect(formatDateSmart(new Date(2026, 2, 19))).toBe("Amanhã");
    });

    it("returns formatted date for other days", () => {
      expect(formatDateSmart(new Date(2026, 0, 1))).toBe("01/01/2026");
    });
  });
});
