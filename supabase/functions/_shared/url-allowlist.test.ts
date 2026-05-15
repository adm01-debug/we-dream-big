/**
 * Testes para `_shared/url-allowlist.ts`.
 *
 * Cobre:
 *  1. URLs permitidas (CDN principal, fornecedores, Supabase Storage)
 *  2. URLs rejeitadas por hostname desconhecido
 *  3. URLs rejeitadas por IP privado/loopback
 *  4. URLs rejeitadas por protocolo proibido
 *  5. URLs malformadas
 *  6. `assertAllowedExternalUrl` lança `ExternalUrlError` com campos corretos
 */

import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  validateExternalUrl,
  assertAllowedExternalUrl,
  ExternalUrlError,
} from "./url-allowlist.ts";

Deno.test("validateExternalUrl — permite hosts allowlist exato", () => {
  for (const url of [
    "https://imagedelivery.net/abc/123/public",
    "https://cdn.xbzbrindes.com.br/img/x.jpg",
    "https://www.xbzbrindes.com.br/img/x.jpg",
    "https://xbzbrindes.com.br/img/x.jpg",
    "https://www.spotgifts.com.br/x.jpg",
    "https://spotgifts.com.br/x.jpg",
    "https://cdndeprodutos.azureedge.net/x.jpg",
    "https://s.asiaimport.com.br/x.jpg",
    "https://asiaimport.com.br/x.jpg",
    "https://www.88brindes.com.br/x.jpg",
    "https://88brindes.com.br/x.jpg",
  ]) {
    const r = validateExternalUrl(url);
    assert(r.ok, `Esperava OK para ${url}, mas: ${r.ok ? "" : r.reason}`);
  }
});

Deno.test("validateExternalUrl — permite sufixos *.supabase.co e *.supabase.in", () => {
  for (const url of [
    "https://abc123.supabase.co/storage/v1/object/public/logos/x.png",
    "https://bucket.supabase.in/logo.png",
    "https://supabase.co/foo",
    "https://supabase.in/bar",
  ]) {
    const r = validateExternalUrl(url);
    assert(r.ok, `Esperava OK para ${url}, mas: ${r.ok ? "" : r.reason}`);
  }
});

Deno.test("validateExternalUrl — rejeita hostnames desconhecidos", () => {
  for (const url of [
    "https://attacker.com/heavy.png",
    "https://malicious.example.org/x.jpg",
    "https://google.com/x.jpg",
    "https://supabase.co.evil.com/x.jpg", // não é sufixo legítimo
  ]) {
    const r = validateExternalUrl(url);
    assertEquals(r.ok, false, `Esperava reject para ${url}`);
  }
});

Deno.test("validateExternalUrl — rejeita IPv4 privados e loopback", () => {
  for (const url of [
    "http://127.0.0.1/",
    "http://10.0.0.1/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/", // AWS metadata
    "http://0.0.0.0/",
    "http://224.0.0.1/", // multicast
    "http://255.255.255.255/",
  ]) {
    const r = validateExternalUrl(url);
    assertEquals(r.ok, false, `Esperava reject para ${url}`);
  }
});

Deno.test("validateExternalUrl — rejeita IPv6 loopback/link-local", () => {
  for (const url of [
    "http://[::1]/",
    "http://[fe80::1]/",
    "http://[fc00::1]/",
    "http://[fd00::1]/",
  ]) {
    const r = validateExternalUrl(url);
    assertEquals(r.ok, false, `Esperava reject para ${url}`);
  }
});

Deno.test("validateExternalUrl — rejeita localhost", () => {
  const r = validateExternalUrl("http://localhost:3000/");
  assertEquals(r.ok, false);
});

Deno.test("validateExternalUrl — rejeita protocolos não-http(s)", () => {
  for (const url of [
    "ftp://imagedelivery.net/x",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "data:image/png;base64,abc",
  ]) {
    const r = validateExternalUrl(url);
    assertEquals(r.ok, false, `Esperava reject para ${url}`);
  }
});

Deno.test("validateExternalUrl — rejeita URLs malformadas e vazias", () => {
  const cases = ["", "not-a-url", "://", "http://"];
  for (const url of cases) {
    const r = validateExternalUrl(url as string);
    assertEquals(r.ok, false, `Esperava reject para "${url}"`);
  }
  // Casos com tipos errados
  // deno-lint-ignore no-explicit-any
  assertEquals((validateExternalUrl(null as any)).ok, false);
  // deno-lint-ignore no-explicit-any
  assertEquals((validateExternalUrl(undefined as any)).ok, false);
});

Deno.test("assertAllowedExternalUrl — lança ExternalUrlError com fieldName e reason", () => {
  const err = assertThrows(
    () => assertAllowedExternalUrl("https://attacker.com/x", "logoUrl"),
    ExternalUrlError,
    "logoUrl",
  );
  assertEquals((err as ExternalUrlError).fieldName, "logoUrl");
  assert((err as ExternalUrlError).reason.length > 0);
});

Deno.test("assertAllowedExternalUrl — não lança para URL permitida", () => {
  // Não deve lançar
  assertAllowedExternalUrl("https://imagedelivery.net/abc", "productImageUrl");
  assertAllowedExternalUrl("https://abc.supabase.co/logo.png", "logoUrl");
});

Deno.test("validateExternalUrl — case insensitive em hostname", () => {
  const r = validateExternalUrl("https://IMAGEDELIVERY.NET/abc");
  assert(r.ok);
});
