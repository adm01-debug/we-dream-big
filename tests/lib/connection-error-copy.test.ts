import { describe, it, expect } from "vitest";
import { getErrorCopy, getKindBadgeClass, getKindLabel } from "@/lib/connection-error-copy";

describe("getErrorCopy", () => {
  it("timeout sem timeout_ms — hint genérica", () => {
    const c = getErrorCopy("timeout");
    expect(c.title).toBe("Tempo esgotado");
    expect(c.tone).toBe("timeout");
    expect(c.hint).toMatch(/em tempo/);
  });

  it("timeout com timeout_ms — hint contém o valor", () => {
    const c = getErrorCopy("timeout", null, null, 12000);
    expect(c.hint).toContain("12000ms");
  });

  it("network", () => {
    const c = getErrorCopy("network");
    expect(c.title).toBe("Sem conexão com o serviço");
    expect(c.tone).toBe("network");
  });

  it("dns", () => {
    const c = getErrorCopy("dns");
    expect(c.title).toBe("URL não encontrada");
    expect(c.tone).toBe("dns");
  });

  it("auth", () => {
    const c = getErrorCopy("auth");
    expect(c.title).toBe("Credenciais rejeitadas");
    expect(c.tone).toBe("auth");
  });

  it("http 4xx — hint específica de cliente", () => {
    const c = getErrorCopy("http", 422);
    expect(c.title).toContain("422");
    expect(c.hint).toMatch(/payload|permiss|escopos/i);
  });

  it("http 5xx — hint específica de servidor", () => {
    const c = getErrorCopy("http", 504);
    expect(c.title).toContain("504");
    expect(c.hint).toMatch(/instabilid|tente novamente/i);
  });

  it("config", () => {
    const c = getErrorCopy("config");
    expect(c.title).toBe("Configuração incompleta");
    expect(c.tone).toBe("config");
  });

  it("unknown com fallbackMessage usa o fallback", () => {
    const c = getErrorCopy("unknown", null, "Erro X específico do servidor");
    expect(c.hint).toBe("Erro X específico do servidor");
    expect(c.tone).toBe("unknown");
  });

  it("kind null/undefined cai em unknown", () => {
    expect(getErrorCopy(null).tone).toBe("unknown");
    expect(getErrorCopy(undefined).tone).toBe("unknown");
  });
});

describe("getKindBadgeClass", () => {
  it("retorna classe distinta por tone", () => {
    const tones = ["timeout", "network", "dns", "auth", "http", "config", "unknown"] as const;
    const classes = tones.map((t) => getKindBadgeClass(t));
    const unique = new Set(classes);
    expect(unique.size).toBe(tones.length);
  });
});

describe("getKindLabel", () => {
  it("rótulos PT-BR", () => {
    expect(getKindLabel("timeout")).toBe("Timeout");
    expect(getKindLabel("network")).toBe("Rede");
    expect(getKindLabel("dns")).toBe("DNS");
    expect(getKindLabel("auth")).toBe("Auth");
    expect(getKindLabel("http")).toBe("HTTP");
    expect(getKindLabel("config")).toBe("Config");
    expect(getKindLabel("unknown")).toBe("Desconhecido");
  });
});
