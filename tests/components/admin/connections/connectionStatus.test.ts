import { describe, it, expect } from "vitest";
import { resolveSupabaseConnectionStatus } from "@/components/admin/connections/connectionStatus";

/**
 * Garantia de não-regressão para o bug "Sem credenciais" exibido
 * indevidamente quando integration_credentials está preenchida.
 *
 * Cenário real: secrets-manager retorna has_value: true para URL e
 * service-role key → o card NÃO PODE mostrar "unconfigured".
 */
describe("resolveSupabaseConnectionStatus", () => {
  it("readOnly cards são sempre active (gerenciados)", () => {
    expect(resolveSupabaseConnectionStatus({ readOnly: true })).toBe("active");
    expect(
      resolveSupabaseConnectionStatus({
        readOnly: true,
        url: { has_value: false },
        service: { has_value: false },
      }),
    ).toBe("active");
  });

  it("retorna 'unconfigured' (Sem credenciais) quando URL ausente", () => {
    expect(
      resolveSupabaseConnectionStatus({
        readOnly: false,
        url: undefined,
        service: { has_value: true },
      }),
    ).toBe("unconfigured");
  });

  it("retorna 'unconfigured' quando URL existe mas tem has_value:false", () => {
    expect(
      resolveSupabaseConnectionStatus({
        readOnly: false,
        url: { has_value: false },
        service: { has_value: true },
      }),
    ).toBe("unconfigured");
  });

  it("retorna 'unconfigured' quando service-role key ausente", () => {
    expect(
      resolveSupabaseConnectionStatus({
        readOnly: false,
        url: { has_value: true },
        service: undefined,
      }),
    ).toBe("unconfigured");
  });

  it("NÃO retorna 'unconfigured' quando ambas credenciais estão preenchidas (regressão do bug)", () => {
    const status = resolveSupabaseConnectionStatus({
      readOnly: false,
      url: { has_value: true },
      service: { has_value: true },
      last: null,
    });
    expect(status).not.toBe("unconfigured");
    expect(status).toBe("active");
  });

  it("retorna 'error' quando credenciais OK mas último teste falhou", () => {
    expect(
      resolveSupabaseConnectionStatus({
        readOnly: false,
        url: { has_value: true },
        service: { has_value: true },
        last: { ok: false },
      }),
    ).toBe("error");
  });

  it("retorna 'active' quando credenciais OK e último teste passou", () => {
    expect(
      resolveSupabaseConnectionStatus({
        readOnly: false,
        url: { has_value: true },
        service: { has_value: true },
        last: { ok: true },
      }),
    ).toBe("active");
  });

  it("simulação real: payload do secrets-manager para Promobrind", () => {
    // Payload simplificado equivalente ao que useSecretsManager.list() retorna
    // após DataSourceDebugTab confirmar 6 linhas em integration_credentials.
    const promobrind = {
      readOnly: false,
      url: { has_value: true }, // EXTERNAL_PROMOBRIND_URL
      service: { has_value: true }, // EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY
      last: { ok: true },
    } as const;
    expect(resolveSupabaseConnectionStatus(promobrind)).toBe("active");
  });
});
