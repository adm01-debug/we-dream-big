import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  getPriceFreshness,
  DEFAULT_PRICE_FRESHNESS_THRESHOLD_DAYS,
} from "@/utils/price-freshness";

const FIXED_NOW = new Date("2025-06-15T12:00:00.000Z").getTime();

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

function daysAgo(days: number): string {
  return new Date(FIXED_NOW - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("getPriceFreshness", () => {
  it("returns 'unknown' when priceUpdatedAt is null/undefined", () => {
    const r1 = getPriceFreshness(null, 60);
    const r2 = getPriceFreshness(undefined, 60);
    expect(r1.status).toBe("unknown");
    expect(r2.status).toBe("unknown");
    expect(r1.daysSinceUpdate).toBeNull();
    expect(r1.shouldWarn).toBe(false);
  });

  it("returns 'unknown' for invalid date strings", () => {
    const r = getPriceFreshness("not-a-date", 60);
    expect(r.status).toBe("unknown");
  });

  it("returns 'fresh' when within 50% of threshold", () => {
    const r = getPriceFreshness(daysAgo(10), 60);
    expect(r.status).toBe("fresh");
    expect(r.daysSinceUpdate).toBe(10);
    expect(r.shouldWarn).toBe(false);
    expect(r.isStale).toBe(false);
  });

  it("returns 'aging' when between 50% and 100% of threshold", () => {
    const r = getPriceFreshness(daysAgo(45), 60);
    expect(r.status).toBe("aging");
    expect(r.shouldWarn).toBe(true);
    expect(r.isStale).toBe(false);
  });

  it("returns 'stale' when above threshold", () => {
    const r = getPriceFreshness(daysAgo(90), 60);
    expect(r.status).toBe("stale");
    expect(r.shouldWarn).toBe(true);
    expect(r.isStale).toBe(true);
    expect(r.label).toMatch(/defasado/i);
  });

  it("uses default threshold of 60 days when not provided", () => {
    const r = getPriceFreshness(daysAgo(10), null);
    expect(r.thresholdDays).toBe(DEFAULT_PRICE_FRESHNESS_THRESHOLD_DAYS);
  });

  it("respects custom thresholds (30/60/90)", () => {
    expect(getPriceFreshness(daysAgo(20), 30).status).toBe("aging");
    expect(getPriceFreshness(daysAgo(40), 30).status).toBe("stale");
    expect(getPriceFreshness(daysAgo(40), 90).status).toBe("fresh");
    expect(getPriceFreshness(daysAgo(70), 90).status).toBe("aging");
    expect(getPriceFreshness(daysAgo(120), 90).status).toBe("stale");
  });

  it("clamps negative days (future date) to 0", () => {
    const future = new Date(FIXED_NOW + 5 * 86400000).toISOString();
    const r = getPriceFreshness(future, 60);
    expect(r.daysSinceUpdate).toBe(0);
    expect(r.status).toBe("fresh");
  });

  it("includes absolute date (long PT-BR) and threshold context in tooltip", () => {
    const r = getPriceFreshness(daysAgo(10), 60);
    // Padrão por extenso: "DD de <mês> de AAAA"
    expect(r.tooltip).toMatch(/\d{1,2} de [a-zçãéíúô]+ de \d{4}/i);
    expect(r.tooltip).toMatch(/Validade configurada: 60 dias/);
  });
});
