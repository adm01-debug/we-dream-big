import { describe, it, expect } from 'vitest';
import { getPriceFreshness, DEFAULT_PRICE_FRESHNESS_THRESHOLD_DAYS } from './price-freshness';

describe('Price Freshness Integration', () => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const seventyDaysAgo = new Date(today.getTime() - 70 * 24 * 60 * 60 * 1000);

  it('should use default threshold (60) when not provided', () => {
    const freshness = getPriceFreshness(thirtyDaysAgo.toISOString(), null);
    expect(freshness.thresholdDays).toBe(DEFAULT_PRICE_FRESHNESS_THRESHOLD_DAYS);
    expect(freshness.status).toBe('fresh'); // 30 < 60/2 (30) is false, so it's fresh? wait.
    // 30 > Math.floor(60 / 2) (30) is false. So 30 is fresh. 31 is aging.
  });

  it('should correctly classify 30 days as stale if threshold is 20', () => {
    const freshness = getPriceFreshness(thirtyDaysAgo.toISOString(), 20);
    expect(freshness.thresholdDays).toBe(20);
    expect(freshness.status).toBe('stale');
  });

  it('should correctly classify 70 days as aging if threshold is 90', () => {
    // 90/2 = 45. 70 > 45, so status should be 'aging'
    const freshness = getPriceFreshness(seventyDaysAgo.toISOString(), 90);
    expect(freshness.thresholdDays).toBe(90);
    expect(freshness.status).toBe('aging');
  });

  it('should correctly classify aging status (between threshold/2 and threshold)', () => {
    // Threshold 60, days 45 -> 45 > 30 and 45 < 60 => aging
    const fortyFiveDaysAgo = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000);
    const freshness = getPriceFreshness(fortyFiveDaysAgo.toISOString(), 60);
    expect(freshness.status).toBe('aging');
  });
});
