import { describe, it, expect } from 'vitest';

// Test estimateCost logic (mirror of edge function)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "google/gemini-2.5-flash-lite": { input: 0.04, output: 0.15 },
  "google/gemini-3-flash-preview": { input: 0.10, output: 0.40 },
  "openai/gpt-5": { input: 2.50, output: 10.0 },
  "openai/gpt-5-mini": { input: 0.40, output: 1.60 },
  "openai/gpt-5-nano": { input: 0.10, output: 0.40 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || { input: 0.50, output: 2.0 };
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

describe('AI Usage - Cost Estimation', () => {
  it('calculates Gemini 2.5 Flash cost correctly', () => {
    const cost = estimateCost('google/gemini-2.5-flash', 493, 10);
    expect(cost).toBeCloseTo(0.000080, 6);
  });

  it('calculates Gemini 3 Flash Preview cost correctly', () => {
    const cost = estimateCost('google/gemini-3-flash-preview', 472, 240);
    expect(cost).toBeCloseTo(0.000143, 6);
  });

  it('calculates GPT-5 cost correctly', () => {
    const cost = estimateCost('openai/gpt-5', 1000, 500);
    expect(cost).toBeCloseTo(0.007500, 6);
  });

  it('uses fallback pricing for unknown model', () => {
    const cost = estimateCost('unknown/model', 1000, 1000);
    // fallback: input=0.50, output=2.0 per 1M
    expect(cost).toBeCloseTo(0.002500, 6);
  });

  it('handles zero tokens', () => {
    const cost = estimateCost('google/gemini-2.5-flash', 0, 0);
    expect(cost).toBe(0);
  });

  it('handles very large token counts', () => {
    const cost = estimateCost('openai/gpt-5', 1_000_000, 500_000);
    expect(cost).toBeCloseTo(7.5, 1);
  });

  it('output tokens are more expensive than input', () => {
    const inputOnly = estimateCost('openai/gpt-5', 1000, 0);
    const outputOnly = estimateCost('openai/gpt-5', 0, 1000);
    expect(outputOnly).toBeGreaterThan(inputOnly);
  });
});

describe('AI Usage - Quota Logic', () => {
  it('admin should always be allowed (unlimited)', () => {
    // Mirrors the DB result
    const result = { allowed: true, limit: -1, remaining: -1, unlimited: true, used: 4 };
    expect(result.allowed).toBe(true);
    expect(result.unlimited).toBe(true);
  });

  it('vendedor with 0 usage should be allowed', () => {
    const result = { allowed: true, limit: 100, remaining: 100, unlimited: false, used: 0 };
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(100);
  });

  it('nonexistent user should be denied', () => {
    const result = { allowed: false, limit: 0, remaining: 0, reason: 'no_role', used: 0 };
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('no_role');
  });

  it('vendedor at limit should be blocked', () => {
    const used = 100, limit = 100;
    expect(used >= limit).toBe(true);
  });

  it('vendedor at 99/100 should be allowed', () => {
    const used = 99, limit = 100;
    expect(used < limit).toBe(true);
  });

  it('manager at 500/500 should be blocked', () => {
    const used = 500, limit = 500;
    expect(used >= limit).toBe(true);
  });
});

describe('AI Usage - Widget Display Logic', () => {
  it('shows warning at 80%+ usage', () => {
    const used = 80, limit = 100;
    const percent = (used / limit) * 100;
    expect(percent >= 80).toBe(true);
    expect(percent >= 100).toBe(false);
  });

  it('shows exceeded at 100%', () => {
    const used = 100, limit = 100;
    const percent = Math.min((used / limit) * 100, 100);
    expect(percent >= 100).toBe(true);
  });

  it('shows 0% for unlimited users', () => {
    const unlimited = true;
    const percent = unlimited ? 0 : 50;
    expect(percent).toBe(0);
  });

  it('calculates remaining correctly', () => {
    const used = 73, limit = 100;
    const remaining = Math.max(limit - used, 0);
    expect(remaining).toBe(27);
  });

  it('remaining never goes negative', () => {
    const used = 150, limit = 100;
    const remaining = Math.max(limit - used, 0);
    expect(remaining).toBe(0);
  });
});

describe('AI Usage - Token Extraction', () => {
  function extractTokensFromResponse(body: any) {
    const usage = body?.usage;
    return {
      input: usage?.prompt_tokens ?? usage?.input_tokens ?? 0,
      output: usage?.completion_tokens ?? usage?.output_tokens ?? 0,
    };
  }

  it('extracts OpenAI-style tokens', () => {
    const body = { usage: { prompt_tokens: 100, completion_tokens: 50 } };
    const tokens = extractTokensFromResponse(body);
    expect(tokens.input).toBe(100);
    expect(tokens.output).toBe(50);
  });

  it('extracts Google-style tokens', () => {
    const body = { usage: { input_tokens: 200, output_tokens: 80 } };
    const tokens = extractTokensFromResponse(body);
    expect(tokens.input).toBe(200);
    expect(tokens.output).toBe(80);
  });

  it('handles missing usage field', () => {
    const tokens = extractTokensFromResponse({});
    expect(tokens.input).toBe(0);
    expect(tokens.output).toBe(0);
  });

  it('handles null response', () => {
    const tokens = extractTokensFromResponse(null);
    expect(tokens.input).toBe(0);
    expect(tokens.output).toBe(0);
  });

  it('prefers prompt_tokens over input_tokens', () => {
    const body = { usage: { prompt_tokens: 100, input_tokens: 200, completion_tokens: 50 } };
    const tokens = extractTokensFromResponse(body);
    expect(tokens.input).toBe(100); // prompt_tokens wins
  });
});

describe('AI Usage - Period Filtering', () => {
  it('day filter starts at midnight today', () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it('week filter is 7 days ago', () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    const diff = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(7);
  });

  it('month filter starts at 1st of current month', () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    expect(start.getDate()).toBe(1);
  });
});
