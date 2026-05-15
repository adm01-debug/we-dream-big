/**
 * Testes para `_shared/credentials.ts` — a SSOT (Single Source of Truth)
 * usada pelo secrets-manager (UI) e pelas bridges (catálogo).
 *
 * Estes testes **simulam** o estado de `integration_credentials` via
 * um `serviceClient` mockado e validam que:
 *
 *  1. Quando a linha existe → `value` correto + `source: "db"`
 *  2. Quando a linha NÃO existe mas há env → `value` da env + `source: "env"`
 *  3. Quando há alias legado em env (ex.: EXTERNAL_SUPABASE_URL) e nada
 *     em DB nem na env canônica → resolve via alias com `source: "env"`
 *  4. Quando nada existe → `value: null` + `source: "none"`
 *
 * O caso (1) é o regression-test do bug original: UI mostrando "Sem
 * credenciais" mesmo com `integration_credentials` preenchida. Se este
 * teste passa, o secrets-manager retornará `has_value: true` + `source: "db"`.
 */

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCredentialsHealth,
  invalidateCredentialCache,
  resolveCredential,
} from "../_shared/credentials.ts";

/** Mock mínimo de SupabaseClient — apenas o caminho usado por `resolveCredential`. */
function mockServiceClient(table: Record<string, string | null>) {
  // deno-lint-ignore no-explicit-any
  const builder: any = {
    _name: null as string | null,
    select() { return builder; },
    eq(_col: string, val: string) { builder._name = val; return builder; },
    async maybeSingle() {
      const v = table[builder._name ?? ""] ?? null;
      return v
        ? { data: { secret_value: v }, error: null }
        : { data: null, error: null };
    },
  };
  // deno-lint-ignore no-explicit-any
  return { from: (_t: string) => builder } as any;
}

function clearEnv(...names: string[]) {
  for (const n of names) Deno.env.delete(n);
}

Deno.test("resolveCredential: integration_credentials preenchida → has_value=true, source='db'", async () => {
  invalidateCredentialCache();
  clearEnv("EXTERNAL_PROMOBRIND_URL", "EXTERNAL_SUPABASE_URL");

  const client = mockServiceClient({
    EXTERNAL_PROMOBRIND_URL: "https://promobrind-real.supabase.co",
  });

  const result = await resolveCredential("EXTERNAL_PROMOBRIND_URL", client);

  assertEquals(result.value, "https://promobrind-real.supabase.co", "value do DB");
  assertEquals(result.source, "db", "deve marcar source=db (não env)");
  assertEquals(result.resolved_name, "EXTERNAL_PROMOBRIND_URL", "nome canônico");

  // Conversão para o contrato do secrets-manager: has_value = !!value
  const has_value = !!result.value;
  assertEquals(has_value, true, "secrets-manager retornaria has_value=true");
});

Deno.test("resolveCredential: linha ausente + env canônica presente → source='env'", async () => {
  invalidateCredentialCache();
  Deno.env.set("EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY", "key-from-env-canonical");

  const client = mockServiceClient({}); // DB vazio
  const result = await resolveCredential("EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY", client);

  assertEquals(result.value, "key-from-env-canonical");
  assertEquals(result.source, "env");
  assertEquals(result.resolved_name, "EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY");

  clearEnv("EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY");
});

Deno.test("resolveCredential: alias legado (EXTERNAL_SUPABASE_URL) → resolve com source='env'", async () => {
  invalidateCredentialCache();
  clearEnv("EXTERNAL_PROMOBRIND_URL");
  Deno.env.set("EXTERNAL_SUPABASE_URL", "https://legacy-env-alias.supabase.co");

  const client = mockServiceClient({}); // DB vazio
  const result = await resolveCredential("EXTERNAL_PROMOBRIND_URL", client);

  assertEquals(result.value, "https://legacy-env-alias.supabase.co", "valor do alias legado");
  assertEquals(result.source, "env");
  assertEquals(result.resolved_name, "EXTERNAL_SUPABASE_URL", "nome resolvido aponta para o alias");

  clearEnv("EXTERNAL_SUPABASE_URL");
});

Deno.test("resolveCredential: nada configurado → source='none', value=null", async () => {
  invalidateCredentialCache();
  clearEnv(
    "EXTERNAL_PROMOBRIND_ANON_KEY",
    "EXTERNAL_SUPABASE_ANON_KEY",
  );

  const client = mockServiceClient({}); // DB vazio
  const result = await resolveCredential("EXTERNAL_PROMOBRIND_ANON_KEY", client);

  assertEquals(result.value, null);
  assertEquals(result.source, "none");

  // Conversão para o contrato do secrets-manager
  const has_value = !!result.value;
  assertEquals(has_value, false, "secrets-manager retornaria has_value=false → card 'Sem credenciais' aparece (correto)");
});

Deno.test("resolveCredential: DB tem prioridade sobre env (regression do bug original)", async () => {
  invalidateCredentialCache();
  Deno.env.set("EXTERNAL_PROMOBRIND_URL", "https://from-env.example.co");

  const client = mockServiceClient({
    EXTERNAL_PROMOBRIND_URL: "https://from-db.supabase.co",
  });

  const result = await resolveCredential("EXTERNAL_PROMOBRIND_URL", client);

  assertEquals(result.value, "https://from-db.supabase.co", "DB ganha");
  assertEquals(result.source, "db", "source=db, não env");
  assert(
    result.value !== "https://from-env.example.co",
    "valor do DB sobrescreve o da env — comportamento DB-first",
  );

  clearEnv("EXTERNAL_PROMOBRIND_URL");
});

Deno.test("resolveCredential: cache de 60s evita re-leitura do DB", async () => {
  invalidateCredentialCache();
  clearEnv("BITRIX24_TOKEN");

  let dbReads = 0;
  // deno-lint-ignore no-explicit-any
  const builder: any = {
    select() { return builder; },
    eq() { return builder; },
    async maybeSingle() {
      dbReads++;
      return { data: { secret_value: "cached-token" }, error: null };
    },
  };
  // deno-lint-ignore no-explicit-any
  const client = { from: () => builder } as any;

  const r1 = await resolveCredential("BITRIX24_TOKEN", client);
  const r2 = await resolveCredential("BITRIX24_TOKEN", client);
  const r3 = await resolveCredential("BITRIX24_TOKEN", client);

  assertEquals(r1.value, "cached-token");
  assertEquals(r2.value, "cached-token");
  assertEquals(r3.value, "cached-token");
  assertEquals(dbReads, 1, "DB deve ser lido apenas 1x (cache hit nas demais)");
});

// =============================================================================
// Cobertura extra: aliases legados (todos) + prioridade DB-first adversarial
// =============================================================================

/**
 * Tabela do contrato de aliases — espelha ALIASES em credentials.ts.
 * Se este array divergir do source, os testes a seguir vão falhar e nos
 * forçar a atualizar ambos juntos.
 */
const ALIAS_CONTRACT: Array<{ canonical: string; aliases: string[] }> = [
  {
    canonical: "EXTERNAL_PROMOBRIND_URL",
    aliases: ["EXTERNAL_SUPABASE_URL"],
  },
  {
    canonical: "EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY",
    aliases: ["EXTERNAL_SUPABASE_SERVICE_ROLE_KEY", "EXTERNAL_SUPABASE_SERVICE_KEY"],
  },
  {
    canonical: "EXTERNAL_PROMOBRIND_ANON_KEY",
    aliases: ["EXTERNAL_SUPABASE_ANON_KEY"],
  },
  {
    canonical: "EXTERNAL_CRM_URL",
    aliases: ["CRM_SUPABASE_URL"],
  },
  {
    canonical: "EXTERNAL_CRM_SERVICE_ROLE_KEY",
    aliases: ["CRM_SUPABASE_SERVICE_KEY"],
  },
  {
    canonical: "EXTERNAL_CRM_ANON_KEY",
    aliases: ["CRM_SUPABASE_ANON_KEY"],
  },
];

function clearAll(canonical: string, aliases: string[]) {
  clearEnv(canonical, ...aliases);
}

// --- Cobertura tabular: cada alias resolve para o nome canônico --------------

for (const { canonical, aliases } of ALIAS_CONTRACT) {
  for (const alias of aliases) {
    Deno.test(
      `alias contract: ${alias} → ${canonical} (env-only, source='env', resolved_name=${alias})`,
      async () => {
        invalidateCredentialCache();
        clearAll(canonical, aliases);
        Deno.env.set(alias, `value-from-${alias}`);

        const client = mockServiceClient({}); // DB vazio
        const result = await resolveCredential(canonical, client);

        assertEquals(result.value, `value-from-${alias}`, `valor vem do alias ${alias}`);
        assertEquals(result.source, "env", "source=env quando resolvido por alias");
        assertEquals(
          result.resolved_name,
          alias,
          "resolved_name aponta para o alias real (auditável)",
        );

        clearAll(canonical, aliases);
      },
    );
  }
}

// --- Ordem entre múltiplos aliases (primeiro alias na lista ganha) -----------

Deno.test(
  "alias precedence: SERVICE_ROLE_KEY tem prioridade sobre SERVICE_KEY (ordem da lista)",
  async () => {
    invalidateCredentialCache();
    const canonical = "EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY";
    const aliases = ["EXTERNAL_SUPABASE_SERVICE_ROLE_KEY", "EXTERNAL_SUPABASE_SERVICE_KEY"];
    clearAll(canonical, aliases);

    Deno.env.set("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY", "from-first-alias");
    Deno.env.set("EXTERNAL_SUPABASE_SERVICE_KEY", "from-second-alias");

    const result = await resolveCredential(canonical, mockServiceClient({}));

    assertEquals(result.value, "from-first-alias", "primeiro alias da lista ganha");
    assertEquals(result.resolved_name, "EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    assertEquals(result.source, "env");

    clearAll(canonical, aliases);
  },
);

// --- Env canônica tem prioridade sobre alias legado --------------------------

Deno.test(
  "alias precedence: env canônica vence env de alias legado",
  async () => {
    invalidateCredentialCache();
    const canonical = "EXTERNAL_PROMOBRIND_URL";
    const aliases = ["EXTERNAL_SUPABASE_URL"];
    clearAll(canonical, aliases);

    Deno.env.set(canonical, "from-canonical-env");
    Deno.env.set("EXTERNAL_SUPABASE_URL", "from-legacy-alias");

    const result = await resolveCredential(canonical, mockServiceClient({}));

    assertEquals(result.value, "from-canonical-env");
    assertEquals(result.resolved_name, canonical, "resolved_name é o canônico, não o alias");
    assertEquals(result.source, "env");

    clearAll(canonical, aliases);
  },
);

// =============================================================================
// DB-first: cenários adversariais
// =============================================================================

Deno.test(
  "DB-first: DB ganha mesmo quando env canônica E todos os aliases estão setados",
  async () => {
    invalidateCredentialCache();
    const canonical = "EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY";
    const aliases = ["EXTERNAL_SUPABASE_SERVICE_ROLE_KEY", "EXTERNAL_SUPABASE_SERVICE_KEY"];
    clearAll(canonical, aliases);

    Deno.env.set(canonical, "env-canonical-value");
    Deno.env.set("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY", "env-alias1-value");
    Deno.env.set("EXTERNAL_SUPABASE_SERVICE_KEY", "env-alias2-value");

    const client = mockServiceClient({
      [canonical]: "db-wins-everything",
    });

    const result = await resolveCredential(canonical, client);

    assertEquals(result.value, "db-wins-everything", "DB derrota env canônica + 2 aliases");
    assertEquals(result.source, "db");
    assertEquals(result.resolved_name, canonical);
    assert(
      result.value !== "env-canonical-value" &&
        result.value !== "env-alias1-value" &&
        result.value !== "env-alias2-value",
      "valor do DB não pode coincidir com nenhuma das envs setadas",
    );

    clearAll(canonical, aliases);
  },
);

Deno.test(
  "DB-first: vale para todas as credenciais do contrato (sweep tabular)",
  async () => {
    for (const { canonical, aliases } of ALIAS_CONTRACT) {
      invalidateCredentialCache();
      clearAll(canonical, aliases);

      // Polui env com TODOS os aliases legados
      for (const a of aliases) Deno.env.set(a, `legacy-${a}`);
      Deno.env.set(canonical, `env-${canonical}`);

      const dbValue = `db-${canonical}`;
      const client = mockServiceClient({ [canonical]: dbValue });

      const result = await resolveCredential(canonical, client);
      assertEquals(result.source, "db", `${canonical}: source deve ser db`);
      assertEquals(result.value, dbValue, `${canonical}: valor deve vir do DB`);
      assertEquals(result.resolved_name, canonical, `${canonical}: resolved_name canônico`);

      clearAll(canonical, aliases);
    }
  },
);

Deno.test(
  "DB-first: linha vazia no DB (secret_value='') NÃO conta — caímos para env canônica",
  async () => {
    invalidateCredentialCache();
    const canonical = "EXTERNAL_PROMOBRIND_URL";
    const aliases = ["EXTERNAL_SUPABASE_URL"];
    clearAll(canonical, aliases);

    Deno.env.set(canonical, "env-fallback");

    // string vazia em secret_value (cenário borda) não deve ser tratada como hit
    const client = mockServiceClient({ [canonical]: "" });

    const result = await resolveCredential(canonical, client);

    assertEquals(result.value, "env-fallback", "string vazia no DB não bloqueia fallback");
    assertEquals(result.source, "env");

    clearAll(canonical, aliases);
  },
);

Deno.test(
  "DB-first: erro do DB não escala — fallback para env canônica funciona",
  async () => {
    invalidateCredentialCache();
    const canonical = "EXTERNAL_CRM_URL";
    const aliases = ["CRM_SUPABASE_URL"];
    clearAll(canonical, aliases);

    Deno.env.set(canonical, "env-after-db-error");

    // deno-lint-ignore no-explicit-any
    const builder: any = {
      select() { return builder; },
      eq() { return builder; },
      async maybeSingle() {
        throw new Error("simulated DB outage");
      },
    };
    // deno-lint-ignore no-explicit-any
    const client = { from: () => builder } as any;

    const result = await resolveCredential(canonical, client);

    assertEquals(result.value, "env-after-db-error", "fallback p/ env quando DB lança");
    assertEquals(result.source, "env");
    assertEquals(result.resolved_name, canonical);

    clearAll(canonical, aliases);
  },
);

Deno.test(
  "invalidateCredentialCache(name): após invalidar, próxima resolução re-lê o DB (DB-first re-aplicado)",
  async () => {
    invalidateCredentialCache();
    const canonical = "EXTERNAL_PROMOBRIND_URL";
    clearAll(canonical, ["EXTERNAL_SUPABASE_URL"]);

    let dbValue = "db-v1";
    let dbReads = 0;
    // deno-lint-ignore no-explicit-any
    const builder: any = {
      select() { return builder; },
      eq() { return builder; },
      async maybeSingle() {
        dbReads++;
        return { data: { secret_value: dbValue }, error: null };
      },
    };
    // deno-lint-ignore no-explicit-any
    const client = { from: () => builder } as any;

    const r1 = await resolveCredential(canonical, client);
    assertEquals(r1.value, "db-v1");
    assertEquals(dbReads, 1);

    // Cache hit — sem nova leitura
    const r2 = await resolveCredential(canonical, client);
    assertEquals(r2.value, "db-v1");
    assertEquals(dbReads, 1, "cache hit, DB não foi lido de novo");

    // Operação admin: rotaciona valor + invalida cache
    dbValue = "db-v2-rotated";
    invalidateCredentialCache(canonical);

    const r3 = await resolveCredential(canonical, client);
    assertEquals(r3.value, "db-v2-rotated", "após invalidação, DB-first volta a vencer");
    assertEquals(r3.source, "db");
    assertEquals(dbReads, 2, "DB foi re-lido exatamente 1x após invalidação");
  },
);

// ============================================================================
// buildCredentialsHealth — snapshot agregado para endpoints ?op=creds_health
// ============================================================================

Deno.test("buildCredentialsHealth: tudo presente em DB → health='healthy'", async () => {
  invalidateCredentialCache();
  clearAll("EXTERNAL_CRM_URL", ["CRM_SUPABASE_URL"]);
  clearAll("EXTERNAL_CRM_SERVICE_ROLE_KEY", ["CRM_SUPABASE_SERVICE_KEY"]);
  clearAll("EXTERNAL_CRM_ANON_KEY", ["CRM_SUPABASE_ANON_KEY"]);

  const client = mockServiceClient({
    EXTERNAL_CRM_URL: "https://crm.supabase.co",
    EXTERNAL_CRM_SERVICE_ROLE_KEY: "service-key-12345678",
    EXTERNAL_CRM_ANON_KEY: "anon-key-12345678",
  });

  const summary = await buildCredentialsHealth([
    "EXTERNAL_CRM_URL",
    "EXTERNAL_CRM_SERVICE_ROLE_KEY",
    "EXTERNAL_CRM_ANON_KEY",
  ], { serviceClient: client });

  assertEquals(summary.ok, true);
  assertEquals(summary.health, "healthy");
  assertEquals(summary.credentials.length, 3);

  const url = summary.credentials.find((c) => c.name === "EXTERNAL_CRM_URL")!;
  assertEquals(url.present, true);
  assertEquals(url.source, "db");
  assertEquals(url.via_alias, false);
  assertEquals(url.value_length, "https://crm.supabase.co".length);
  assertEquals(url.suffix4, "e.co");

  const svc = summary.credentials.find((c) => c.name === "EXTERNAL_CRM_SERVICE_ROLE_KEY")!;
  assertEquals(svc.present, true);
  assertEquals(svc.suffix4, "5678");
});

Deno.test("buildCredentialsHealth: URL ausente → health='missing' (independente das keys)", async () => {
  invalidateCredentialCache();
  clearAll("EXTERNAL_CRM_URL", ["CRM_SUPABASE_URL"]);
  clearAll("EXTERNAL_CRM_SERVICE_ROLE_KEY", ["CRM_SUPABASE_SERVICE_KEY"]);
  clearAll("EXTERNAL_CRM_ANON_KEY", ["CRM_SUPABASE_ANON_KEY"]);

  // Mesmo com SERVICE_ROLE presente, sem URL não tem como conectar.
  const client = mockServiceClient({
    EXTERNAL_CRM_SERVICE_ROLE_KEY: "service-key-only",
  });

  const summary = await buildCredentialsHealth([
    "EXTERNAL_CRM_URL",
    "EXTERNAL_CRM_SERVICE_ROLE_KEY",
    "EXTERNAL_CRM_ANON_KEY",
  ], { serviceClient: client });

  assertEquals(summary.health, "missing");
  const url = summary.credentials.find((c) => c.name === "EXTERNAL_CRM_URL")!;
  assertEquals(url.present, false);
  assertEquals(url.suffix4, null);
  assertEquals(url.value_length, 0);
});

Deno.test("buildCredentialsHealth: URL presente, todas keys ausentes → health='degraded'", async () => {
  invalidateCredentialCache();
  clearAll("EXTERNAL_CRM_URL", ["CRM_SUPABASE_URL"]);
  clearAll("EXTERNAL_CRM_SERVICE_ROLE_KEY", ["CRM_SUPABASE_SERVICE_KEY"]);
  clearAll("EXTERNAL_CRM_ANON_KEY", ["CRM_SUPABASE_ANON_KEY"]);

  const client = mockServiceClient({
    EXTERNAL_CRM_URL: "https://crm.supabase.co",
  });

  const summary = await buildCredentialsHealth([
    "EXTERNAL_CRM_URL",
    "EXTERNAL_CRM_SERVICE_ROLE_KEY",
    "EXTERNAL_CRM_ANON_KEY",
  ], { serviceClient: client });

  assertEquals(summary.health, "degraded");
});

Deno.test("buildCredentialsHealth: alias legado em env → via_alias=true e source='env'", async () => {
  invalidateCredentialCache();
  clearAll("EXTERNAL_CRM_URL", ["CRM_SUPABASE_URL"]);
  Deno.env.set("CRM_SUPABASE_URL", "https://legacy-alias-crm.supabase.co");

  const client = mockServiceClient({}); // DB vazio
  const summary = await buildCredentialsHealth(
    ["EXTERNAL_CRM_URL"],
    { serviceClient: client },
  );

  const url = summary.credentials[0];
  assertEquals(url.present, true);
  assertEquals(url.source, "env");
  assertEquals(url.via_alias, true);
  assertEquals(url.resolved_name, "CRM_SUPABASE_URL");

  Deno.env.delete("CRM_SUPABASE_URL");
});
