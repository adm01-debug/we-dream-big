/**
 * Testes para `_shared/token-revocation.ts`.
 *
 * Cobre:
 *  1. decodeJwtPayload — JWT válido, malformado, sem payload
 *  2. getTokenIssuedAt — iat presente, ausente, tipo errado
 *  3. isTokenRevoked — token novo (não revogado), token velho (revogado),
 *     usuario sem entrada, fail-open em DB error, cache TTL
 *  4. clearRevocationCache — limpa entrada específica e tudo
 */

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  decodeJwtPayload,
  getTokenIssuedAt,
  isTokenRevoked,
  clearRevocationCache,
  getCacheStats,
} from "./token-revocation.ts";

// Helper: cria JWT minimo (header.payload.signature) com `iat` configurável.
function makeFakeJwt(iat?: number, extra: Record<string, unknown> = {}): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = iat !== undefined ? { iat, ...extra } : { ...extra };
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${b64url(header)}.${b64url(payload)}.fake-signature`;
}

// Helper: mock do SupabaseClient — apenas o caminho usado por isTokenRevoked.
// deno-lint-ignore no-explicit-any
function mockClient(scenario: "no_row" | "old_revocation" | "new_revocation" | "db_error"): any {
  return {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                maybeSingle() {
                  if (scenario === "db_error") {
                    return Promise.resolve({ data: null, error: { message: "simulated DB error" } });
                  }
                  if (scenario === "no_row") {
                    return Promise.resolve({ data: null, error: null });
                  }
                  // Revocations relativas ao 'now' do teste
                  const now = Date.now();
                  if (scenario === "old_revocation") {
                    // revogou ha 2h
                    return Promise.resolve({
                      data: { revoked_at: new Date(now - 2 * 3600 * 1000).toISOString() },
                      error: null,
                    });
                  }
                  if (scenario === "new_revocation") {
                    // revogou ha 1min
                    return Promise.resolve({
                      data: { revoked_at: new Date(now - 60 * 1000).toISOString() },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: null });
                },
              };
            },
          };
        },
      };
    },
  };
}

Deno.test("decodeJwtPayload — decodifica payload base64url", () => {
  const jwt = makeFakeJwt(1700000000, { sub: "user-1", role: "agente" });
  const payload = decodeJwtPayload(jwt);
  assertEquals(payload?.iat, 1700000000);
  assertEquals(payload?.sub, "user-1");
  assertEquals(payload?.role, "agente");
});

Deno.test("decodeJwtPayload — retorna null para malformado", () => {
  assertEquals(decodeJwtPayload(""), null);
  assertEquals(decodeJwtPayload("not.a.jwt"), null);
  assertEquals(decodeJwtPayload("only.two"), null);
  assertEquals(decodeJwtPayload("a.b.c.d"), null);
});

Deno.test("getTokenIssuedAt — extrai iat valido", () => {
  assertEquals(getTokenIssuedAt(makeFakeJwt(1700000000)), 1700000000);
});

Deno.test("getTokenIssuedAt — retorna null sem iat", () => {
  assertEquals(getTokenIssuedAt(makeFakeJwt(undefined, { sub: "x" })), null);
});

Deno.test("getTokenIssuedAt — retorna null com iat de tipo errado", () => {
  // iat como string
  const jwt = makeFakeJwt(undefined, { iat: "1700000000" });
  assertEquals(getTokenIssuedAt(jwt), null);
});

Deno.test("isTokenRevoked — false quando não há revogação", async () => {
  clearRevocationCache();
  const client = mockClient("no_row");
  const tokenNow = makeFakeJwt(Math.floor(Date.now() / 1000));
  const revoked = await isTokenRevoked(client, "user-no-row", tokenNow);
  assertEquals(revoked, false);
});

Deno.test("isTokenRevoked — true quando token foi emitido antes da revogação", async () => {
  clearRevocationCache();
  const client = mockClient("new_revocation"); // revogou ha 1min
  // Token emitido ha 1h (antes da revogacao)
  const tokenOld = makeFakeJwt(Math.floor((Date.now() - 3600 * 1000) / 1000));
  const revoked = await isTokenRevoked(client, "user-with-revocation", tokenOld);
  assertEquals(revoked, true);
});

Deno.test("isTokenRevoked — false quando token foi emitido após a revogação", async () => {
  clearRevocationCache();
  const client = mockClient("old_revocation"); // revogou ha 2h
  // Token emitido ha 30min (depois da revogacao)
  const tokenRecent = makeFakeJwt(Math.floor((Date.now() - 30 * 60 * 1000) / 1000));
  const revoked = await isTokenRevoked(client, "user-stale-revocation", tokenRecent);
  assertEquals(revoked, false);
});

Deno.test("isTokenRevoked — fail-open em DB error", async () => {
  clearRevocationCache();
  const client = mockClient("db_error");
  const token = makeFakeJwt(Math.floor(Date.now() / 1000));
  const revoked = await isTokenRevoked(client, "user-db-error", token);
  assertEquals(revoked, false, "Fail-open: DB error nao deve bloquear");
});

Deno.test("isTokenRevoked — fail-open quando JWT sem iat", async () => {
  clearRevocationCache();
  const client = mockClient("new_revocation");
  const tokenNoIat = makeFakeJwt(undefined, { sub: "x" });
  const revoked = await isTokenRevoked(client, "user-no-iat", tokenNoIat);
  assertEquals(revoked, false, "JWT sem iat nao deve bloquear (improvavel)");
});

Deno.test("isTokenRevoked — usa cache (segunda chamada não bate no DB)", async () => {
  clearRevocationCache();

  let dbHits = 0;
  // deno-lint-ignore no-explicit-any
  const client: any = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle() {
                  dbHits++;
                  return Promise.resolve({ data: null, error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  const token = makeFakeJwt(Math.floor(Date.now() / 1000));
  await isTokenRevoked(client, "user-cache", token);
  await isTokenRevoked(client, "user-cache", token);
  await isTokenRevoked(client, "user-cache", token);
  assertEquals(dbHits, 1, "Esperava 1 hit; cache deveria evitar os outros 2");
});

Deno.test("clearRevocationCache — limpa entrada especifica", async () => {
  clearRevocationCache();
  const client = mockClient("no_row");
  const token = makeFakeJwt(Math.floor(Date.now() / 1000));

  await isTokenRevoked(client, "user-a", token);
  await isTokenRevoked(client, "user-b", token);
  assertEquals(getCacheStats().size, 2);

  clearRevocationCache("user-a");
  assertEquals(getCacheStats().size, 1);

  clearRevocationCache(); // limpa tudo
  assertEquals(getCacheStats().size, 0);
});
