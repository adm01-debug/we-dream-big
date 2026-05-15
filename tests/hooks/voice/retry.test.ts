import { describe, it, expect, vi } from "vitest";
import { withRetry, friendlyErrorMessage } from "@/hooks/voice/retry";

// ─── withRetry ───

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValue("recovered");

    const result = await withRetry(fn, { baseDelay: 1 });
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-retryable error", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("auth failed"));
    await expect(withRetry(fn, { baseDelay: 1 })).rejects.toThrow("auth failed");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("respects maxRetries limit", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("timeout"));
    await expect(withRetry(fn, { maxRetries: 3, baseDelay: 1 })).rejects.toThrow("timeout");
    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it("uses custom shouldRetry predicate", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("custom"));
    const shouldRetry = vi.fn().mockReturnValue(false);

    await expect(withRetry(fn, { shouldRetry, baseDelay: 1 })).rejects.toThrow("custom");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });

  it("retries on 500 server errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("500 Internal Server Error"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, { baseDelay: 1 });
    expect(result).toBe("ok");
  });

  it("retries on 503 errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("503 Service Unavailable"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, { baseDelay: 1 });
    expect(result).toBe("ok");
  });

  it("retries on 429 rate limit errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("429 Too Many Requests"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, { baseDelay: 1 });
    expect(result).toBe("ok");
  });

  it("retries on fetch errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, { baseDelay: 1 });
    expect(result).toBe("ok");
  });

  it("does not retry non-Error values", async () => {
    const fn = vi.fn().mockRejectedValue("string error");
    await expect(withRetry(fn, { baseDelay: 1 })).rejects.toBe("string error");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ─── friendlyErrorMessage ───

describe("friendlyErrorMessage", () => {
  it("returns generic message for non-Error values", () => {
    expect(friendlyErrorMessage("oops")).toBe("Erro desconhecido. Tente novamente.");
    expect(friendlyErrorMessage(null)).toBe("Erro desconhecido. Tente novamente.");
    expect(friendlyErrorMessage(42)).toBe("Erro desconhecido. Tente novamente.");
  });

  it("detects microphone permission errors", () => {
    const msg = friendlyErrorMessage(new Error("microphone permission denied"));
    expect(msg).toContain("microfone");
  });

  it("detects microfone (Portuguese) errors", () => {
    const msg = friendlyErrorMessage(new Error("Nenhum microfone encontrado"));
    expect(msg).toContain("microfone");
  });

  it("detects token errors", () => {
    const msg = friendlyErrorMessage(new Error("Failed to get token"));
    expect(msg).toContain("transcrição");
  });

  it("detects rate limit (429) errors", () => {
    const msg = friendlyErrorMessage(new Error("429 Too Many Requests"));
    expect(msg).toContain("Aguarde");
  });

  it("detects rate limit text errors", () => {
    const msg = friendlyErrorMessage(new Error("rate limit exceeded"));
    expect(msg).toContain("Aguarde");
  });

  it("detects credit exhaustion (402) errors", () => {
    const msg = friendlyErrorMessage(new Error("402 Payment Required"));
    expect(msg).toContain("Créditos");
  });

  it("detects credits text errors", () => {
    const msg = friendlyErrorMessage(new Error("AI credits exhausted"));
    expect(msg).toContain("Créditos");
  });

  it("detects network errors", () => {
    const msg = friendlyErrorMessage(new Error("network error"));
    expect(msg).toContain("conexão");
  });

  it("detects fetch errors", () => {
    const msg = friendlyErrorMessage(new Error("fetch failed"));
    expect(msg).toContain("conexão");
  });

  it("detects TTS/audio errors", () => {
    const msg = friendlyErrorMessage(new Error("TTS failed: 500"));
    expect(msg).toContain("áudio");
  });

  it("falls back to original message for unknown errors", () => {
    const msg = friendlyErrorMessage(new Error("something weird happened"));
    expect(msg).toBe("something weird happened");
  });

  it("falls back to generic message for empty error", () => {
    const msg = friendlyErrorMessage(new Error(""));
    expect(msg).toBe("Não foi possível conectar ao serviço de voz. Tente novamente.");
  });
});
