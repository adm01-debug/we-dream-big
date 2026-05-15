import { describe, it, expect } from "vitest";
import { inferErrorKind } from "@/lib/error-kind-inference";

describe("inferErrorKind", () => {
  it("retorna null para sucesso", () => {
    expect(inferErrorKind({ success: true })).toBeNull();
    expect(inferErrorKind({ success: true, errorMessage: "ignored" })).toBeNull();
  });

  it("respeita errorKind já gravado pelo backend (passa direto)", () => {
    expect(inferErrorKind({ errorKind: "timeout", errorMessage: "qualquer coisa" })).toBe("timeout");
    expect(inferErrorKind({ errorKind: "auth", statusCode: 500 })).toBe("auth");
  });

  it("classifica timeout via mensagem", () => {
    expect(inferErrorKind({ errorMessage: "fetch failed: timeout após 12000ms" })).toBe("timeout");
    expect(inferErrorKind({ errorMessage: "Request timed out" })).toBe("timeout");
    expect(inferErrorKind({ errorMessage: "AbortError: aborted" })).toBe("timeout");
  });

  it("classifica DNS via mensagem", () => {
    expect(inferErrorKind({ errorMessage: "getaddrinfo ENOTFOUND api.x.com" })).toBe("dns");
    expect(inferErrorKind({ errorMessage: "DNS lookup failed" })).toBe("dns");
    expect(inferErrorKind({ errorMessage: "name not resolved" })).toBe("dns");
  });

  it("classifica network via mensagem", () => {
    expect(inferErrorKind({ errorMessage: "TypeError: fetch failed", statusCode: null })).toBe("network");
    expect(inferErrorKind({ errorMessage: "ECONNREFUSED" })).toBe("network");
    expect(inferErrorKind({ errorMessage: "TLS handshake failed" })).toBe("network");
  });

  it("classifica auth por status 401/403", () => {
    expect(inferErrorKind({ statusCode: 401 })).toBe("auth");
    expect(inferErrorKind({ statusCode: 403, errorMessage: "Forbidden" })).toBe("auth");
  });

  it("classifica auth via mensagem", () => {
    expect(inferErrorKind({ errorMessage: "Invalid token" })).toBe("auth");
    expect(inferErrorKind({ errorMessage: "Unauthorized request" })).toBe("auth");
    expect(inferErrorKind({ errorMessage: "expired token" })).toBe("auth");
  });

  it("classifica http para 4xx/5xx genéricos", () => {
    expect(inferErrorKind({ statusCode: 504 })).toBe("http");
    expect(inferErrorKind({ statusCode: 500 })).toBe("http");
    expect(inferErrorKind({ statusCode: 422 })).toBe("http");
  });

  it("classifica config via mensagem", () => {
    expect(inferErrorKind({ errorMessage: "Missing SUPABASE_URL env" })).toBe("config");
    expect(inferErrorKind({ errorMessage: "missing secret BITRIX_TOKEN" })).toBe("config");
  });

  it("retorna unknown como fallback final", () => {
    expect(inferErrorKind({ errorMessage: "weird unknown thing" })).toBe("unknown");
    expect(inferErrorKind({})).toBe("unknown");
  });

  it("prioridade: timeout > dns > network > auth > http > config > unknown", () => {
    // mensagem tem timeout E network — timeout vence
    expect(inferErrorKind({ errorMessage: "fetch failed timeout" })).toBe("timeout");
    // status 401 vence sobre http genérico
    expect(inferErrorKind({ statusCode: 401, errorMessage: "server error" })).toBe("auth");
  });
});
