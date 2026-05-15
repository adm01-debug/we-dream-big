/**
 * P0 — Auth: recovery de sessão, MFA, logout global, password reset.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSupabaseClientMock, resetExternalMocks } from "./_mocks";

describe("P0 — Auth recovery", () => {
  beforeEach(() => {
    createSupabaseClientMock();
  });
  afterEach(() => resetExternalMocks());

  it.skip("login: erro 503 do auth NÃO trava UI — botão volta ao estado idle", async () => {
    expect(true).toBe(true);
  });

  it.skip("session expired: redireciona para /login preservando returnTo", async () => {
    expect(true).toBe(true);
  });

  it.skip("force-global-logout: invalida refresh token de TODAS as sessões do usuário", async () => {
    expect(true).toBe(true);
  });

  it.skip("password reset: fluxo de 3 fases (mem://security/password-recovery-flow) não pula etapas", async () => {
    expect(true).toBe(true);
  });

  it.skip("MFA: totp inválido NÃO conta como tentativa de senha errada", async () => {
    expect(true).toBe(true);
  });

  it.skip("signup público: bloqueado (closed-platform-policy)", async () => {
    // TODO(P0): mem://auth/closed-platform-policy.
    expect(true).toBe(true);
  });

  it.skip("detect-new-device: dispara notificação no primeiro login de novo IP", async () => {
    expect(true).toBe(true);
  });
});
