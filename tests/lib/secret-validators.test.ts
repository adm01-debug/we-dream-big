import { describe, it, expect } from "vitest";
import { validateSecret, MIN_SUFFIX_LENGTH } from "@/components/admin/connections/secretValidators";

describe("validateSecret — guarda de sufixo mínimo (4 chars)", () => {
  it("expõe MIN_SUFFIX_LENGTH = 4", () => {
    expect(MIN_SUFFIX_LENGTH).toBe(4);
  });

  it("rejeita valor vazio sem mensagem (apenas hint)", () => {
    const r = validateSecret("ANY_SECRET", "");
    expect(r.ok).toBe(false);
    expect(r.message).toBeUndefined();
  });

  it("rejeita 1 char com mensagem específica de sufixo (singular)", () => {
    const r = validateSecret("ANY_SECRET", "a");
    expect(r.ok).toBe(false);
    expect(r.message).toContain("1 caractere");
    expect(r.message).toContain("••••XXXX");
    expect(r.message).toContain("4 caracteres");
  });

  it("rejeita 3 chars com mensagem específica (plural)", () => {
    const r = validateSecret("ANY_SECRET", "abc");
    expect(r.ok).toBe(false);
    expect(r.message).toContain("3 caracteres");
    expect(r.message).toContain("••••XXXX");
  });

  it("aceita 4 chars genéricos via DEFAULT_RULE", () => {
    expect(validateSecret("RANDOM_GENERIC_NAME", "abcd").ok).toBe(true);
  });

  it("guarda de 4 chars vence sobre validador específico (BITRIX24_TOKEN exige 10+)", () => {
    // BITRIX24_TOKEN exige 10–60 alfanumérico — valor "ab" (2 chars) deve cair
    // primeiro na guarda inviolável de 4 chars, com mensagem de sufixo, e não
    // na mensagem do validador específico.
    const r = validateSecret("BITRIX24_TOKEN", "ab");
    expect(r.ok).toBe(false);
    expect(r.message).toContain("••••XXXX");
    expect(r.message).not.toContain("alfanumérico");
  });

  it("validador específico ainda funciona quando valor passa do mínimo de 4", () => {
    // 5 chars: passa da guarda mas ainda é inválido para BITRIX24_TOKEN (exige 10+)
    const r = validateSecret("BITRIX24_TOKEN", "abcde");
    expect(r.ok).toBe(false);
    expect(r.message).toContain("alfanumérico");
  });

  it("BITRIX24_USER_ID com '12' (2 chars) cai na guarda de sufixo", () => {
    const r = validateSecret("BITRIX24_USER_ID", "12");
    expect(r.ok).toBe(false);
    expect(r.message).toContain("••••XXXX");
  });
});
