/**
 * Tests for voice module utilities: retry, processTranscript, playTtsAudio, types
 */
import { describe, it, expect } from "vitest";
import { withRetry, friendlyErrorMessage } from "@/hooks/voice/retry";
import type { VoiceAgentAction, VoiceAgentPhase } from "@/hooks/voice/types";

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const result = await withRetry(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  it("retries on retryable error and succeeds", async () => {
    let attempts = 0;
    const result = await withRetry(
      () => {
        attempts++;
        if (attempts < 2) throw new Error("network error");
        return Promise.resolve("ok");
      },
      { baseDelay: 10 }
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("does not retry non-retryable errors", async () => {
    let attempts = 0;
    await expect(
      withRetry(
        () => {
          attempts++;
          throw new Error("validation failed");
        },
        { baseDelay: 10 }
      )
    ).rejects.toThrow("validation failed");
    expect(attempts).toBe(1);
  });

  it("respects maxRetries", async () => {
    let attempts = 0;
    await expect(
      withRetry(
        () => {
          attempts++;
          throw new Error("500 server error");
        },
        { maxRetries: 3, baseDelay: 10 }
      )
    ).rejects.toThrow("500 server error");
    expect(attempts).toBe(4); // 1 initial + 3 retries
  });
});

describe("friendlyErrorMessage", () => {
  it("translates microphone errors", () => {
    const msg = friendlyErrorMessage(new Error("microphone permission denied"));
    expect(msg).toContain("microfone");
  });

  it("translates rate limit errors", () => {
    const msg = friendlyErrorMessage(new Error("429 too many requests"));
    expect(msg).toContain("requisições");
  });

  it("translates network errors", () => {
    const msg = friendlyErrorMessage(new Error("fetch failed"));
    expect(msg).toContain("conexão");
  });

  it("translates credit errors", () => {
    const msg = friendlyErrorMessage(new Error("402 credits exhausted"));
    expect(msg).toContain("Créditos");
  });

  it("returns original message for unknown errors", () => {
    const msg = friendlyErrorMessage(new Error("some custom error"));
    expect(msg).toBe("some custom error");
  });

  it("handles non-Error values", () => {
    const msg = friendlyErrorMessage("string error");
    expect(msg).toContain("desconhecido");
  });
});

describe("VoiceAgentAction types", () => {
  it("supports all action types", () => {
    const actions: VoiceAgentAction["action"][] = ["search", "filter", "navigate", "sort", "clear", "answer"];
    expect(actions).toHaveLength(6);
  });

  it("supports filter data with all fields", () => {
    const action: VoiceAgentAction = {
      action: "filter",
      response: "Filtrado",
      data: {
        filters: {
          category: "Canetas",
          color: "azul",
          material: "metal",
          maxPrice: 100,
          minPrice: 10,
          inStock: true,
          isKit: false,
        },
      },
    };
    expect(action.data?.filters?.category).toBe("Canetas");
    expect(action.data?.filters?.inStock).toBe(true);
  });
});

describe("VoiceAgentPhase", () => {
  it("covers all phases", () => {
    const phases: VoiceAgentPhase[] = ["idle", "listening", "processing", "speaking", "error"];
    expect(phases).toHaveLength(5);
  });
});
