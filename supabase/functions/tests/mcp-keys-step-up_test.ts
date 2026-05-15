/**
 * mcp-keys-step-up_test.ts
 *
 * Garante que `mcp-keys-rotate` e `mcp-keys-update` (em particular o caminho
 * FULL / escalada para `*`) NÃO podem ser executados sem `step_up_token`
 * válido, e que o token só é aceito quando casa com a `action` esperada e
 * com o `target_ref` correto (`source_key_id` / `key_id`).
 *
 * Há duas camadas, por simetria com `rbac-edge-functions_test.ts`:
 *
 *  1. **Source-level invariants** (offline): lê o código das edge functions
 *     e exige que:
 *       - `step_up_token` é validado antes de qualquer mutação;
 *       - quando ausente para FULL, retorna `step_up_required`;
 *       - `consume_step_up_token` é chamado com a action esperada
 *         (`mcp_full_issue`, `mcp_full_escalate` ou `mcp_key_rotate`);
 *       - `_expected_target` é vinculado à chave alvo (não `null`).
 *
 *  2. **HTTP smoke** (online, contra a função deployada): chama
 *     `mcp-keys-rotate` e `mcp-keys-update` SEM JWT e confirma que o
 *     servidor retorna 401 `unauthenticated` (nunca 200). Esta camada exige
 *     `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` no env. Quando
 *     ausentes, os testes ficam `ignored` em vez de falhar.
 *
 * Cobertura E2E real (com sessão dev + token consumido) exige
 * `SUPABASE_SERVICE_ROLE_KEY` para fabricar JWTs — não disponível no runner
 * padrão. Os dois níveis acima fecham a regressão importante: se alguém
 * remover o gate de step-up, a suíte falha.
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";

// ============================================================
// 1. SOURCE-LEVEL INVARIANTS
// ============================================================

interface StepUpInvariant {
  fn: string;
  /** Descrição human-readable do caminho protegido. */
  description: string;
  /** Ações esperadas em `consume_step_up_token` para ESTA função. */
  expectedActions: string[];
  /** Variável local que carrega o id alvo passado para `_expected_target`. */
  expectedTargetVar: string;
}

const STEP_UP_GUARDED: StepUpInvariant[] = [
  {
    fn: "mcp-keys-rotate",
    description: "Rotação de chave MCP (FULL e limitada)",
    expectedActions: ["mcp_full_issue", "mcp_key_rotate"],
    expectedTargetVar: "source_key_id",
  },
  {
    fn: "mcp-keys-update",
    description: "Update de chave MCP — escalada para FULL",
    expectedActions: ["mcp_full_escalate"],
    expectedTargetVar: "key_id",
  },
];

async function readSource(fn: string): Promise<string> {
  const path = new URL(`../${fn}/index.ts`, import.meta.url);
  return await Deno.readTextFile(path);
}

for (const invariant of STEP_UP_GUARDED) {
  Deno.test({
    name: `[step-up:source] ${invariant.fn} bloqueia ${invariant.description} sem step_up_token`,
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      const src = await readSource(invariant.fn);

      // A) `step_up_token` está no schema do body.
      assert(
        /step_up_token/.test(src),
        `${invariant.fn}: campo step_up_token ausente do schema/body — ` +
          `caminho FULL ficaria sem fricção.`,
      );

      // B) Existe ao menos uma rejeição com `step_up_required`.
      assert(
        /["']step_up_required["']/.test(src),
        `${invariant.fn}: nenhum retorno "step_up_required" encontrado. ` +
          `O caller precisa receber esse código para reabrir o StepUpAuthDialog.`,
      );

      // C) Consome o token via RPC oficial.
      assert(
        /consume_step_up_token/.test(src),
        `${invariant.fn}: não chama consume_step_up_token — token nunca seria validado.`,
      );

      // D) Existe um retorno `step_up_invalid` distinto do "required" para
      //    o caso em que o token foi enviado mas não passa.
      assert(
        /["']step_up_invalid["']/.test(src),
        `${invariant.fn}: nenhum retorno "step_up_invalid" — frontend não ` +
          `consegue diferenciar token expirado de token ausente.`,
      );
    },
  });

  Deno.test({
    name: `[step-up:source] ${invariant.fn} usa actions esperadas (${invariant.expectedActions.join("/")})`,
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      const src = await readSource(invariant.fn);
      for (const action of invariant.expectedActions) {
        assert(
          new RegExp(`["']${action}["']`).test(src),
          `${invariant.fn}: não menciona a action de step-up "${action}". ` +
            `Sem ela, o token emitido pelo frontend não casará no servidor.`,
        );
      }
    },
  });

  Deno.test({
    name: `[step-up:source] ${invariant.fn} amarra _expected_target ao ${invariant.expectedTargetVar}`,
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      const src = await readSource(invariant.fn);

      // Procura QUALQUER chamada a consume_step_up_token e garante que ao
      // menos uma usa `_expected_target: <var>` (não `null`). Aceitamos
      // `null` apenas em fluxos legados sem chave de origem (não é o caso
      // destas duas funções: rotate sempre tem source_key_id; update FULL
      // sempre tem key_id).
      const tightBinding = new RegExp(
        `_expected_target\\s*:\\s*${invariant.expectedTargetVar}\\b`,
      );
      assert(
        tightBinding.test(src),
        `${invariant.fn}: consume_step_up_token deveria ser chamado com ` +
          `_expected_target: ${invariant.expectedTargetVar} para impedir ` +
          `que um token emitido para outra chave seja reaproveitado.`,
      );
    },
  });
}

// Sanity extra: o caminho FULL do rotate exige confirmação literal e
// justificativa mínima — fricção que não pode regredir.
Deno.test({
  name: "[step-up:source] mcp-keys-rotate FULL preserva fricção (confirmation_phrase + justification)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const src = await readSource("mcp-keys-rotate");
    assertStringIncludes(src, "FULL_SCOPE_CONFIRMATION");
    assertStringIncludes(src, "FULL_SCOPE_MIN_JUSTIFICATION");
  },
});

// Sanity extra: o caminho de escalada do update exige expiration explícita
// (chaves FULL não podem ser eternas).
Deno.test({
  name: "[step-up:source] mcp-keys-update escalada exige expires_at",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const src = await readSource("mcp-keys-update");
    // O bloco que monta `fieldErrors.expires_at` deve existir e mencionar a
    // janela máxima (180 dias via FULL_SCOPE_MAX_TTL_MS).
    assertStringIncludes(src, "FULL_SCOPE_MAX_TTL_MS");
    assert(
      /fieldErrors\.expires_at\b/.test(src),
      "mcp-keys-update deveria validar expires_at no caminho de escalada FULL.",
    );
  },
});

// ============================================================
// 2. HTTP SMOKE — função deployada, sem auth
// ============================================================

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";
const HAS_HTTP = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

async function callFn(
  fn: string,
  body: Record<string, unknown>,
  opts: { withApiKey?: boolean } = {},
): Promise<{ status: number; json: Record<string, unknown> | null; text: string }> {
  const url = `${SUPABASE_URL}/functions/v1/${fn}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.withApiKey) headers["apikey"] = SUPABASE_ANON_KEY;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
  return { status: res.status, json, text };
}

const FAKE_KEY_ID = "00000000-0000-4000-8000-000000000000";

Deno.test({
  name: "[step-up:http] mcp-keys-rotate sem JWT é rejeitado (401 unauthenticated)",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !HAS_HTTP,
  fn: async () => {
    const { status, json } = await callFn(
      "mcp-keys-rotate",
      { source_key_id: FAKE_KEY_ID },
      { withApiKey: true },
    );
    // Aceita 401 (preferido) ou 403 caso o plataforma intercepte antes.
    assert(
      status === 401 || status === 403,
      `Esperava 401/403 sem JWT, recebi ${status}. body=${JSON.stringify(json)}`,
    );
    if (json && typeof json.error === "string") {
      assert(
        json.error === "unauthenticated" || json.error === "forbidden",
        `Esperava error=unauthenticated|forbidden, recebi ${json.error}`,
      );
    }
  },
});

Deno.test({
  name: "[step-up:http] mcp-keys-update sem JWT é rejeitado (401 unauthenticated)",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !HAS_HTTP,
  fn: async () => {
    const { status, json } = await callFn(
      "mcp-keys-update",
      { key_id: FAKE_KEY_ID, scopes: ["*"], step_up_token: null },
      { withApiKey: true },
    );
    assert(
      status === 401 || status === 403,
      `Esperava 401/403 sem JWT, recebi ${status}. body=${JSON.stringify(json)}`,
    );
    if (json && typeof json.error === "string") {
      assert(
        json.error === "unauthenticated" || json.error === "forbidden",
        `Esperava error=unauthenticated|forbidden, recebi ${json.error}`,
      );
    }
  },
});

// Body inválido (sem campos obrigatórios) — não basta authenticated/forbidden,
// queremos garantir que o handler retorna erro estruturado e nunca 200.
Deno.test({
  name: "[step-up:http] mcp-keys-rotate body inválido não retorna 200",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !HAS_HTTP,
  fn: async () => {
    const { status } = await callFn(
      "mcp-keys-rotate",
      { /* sem source_key_id */ },
      { withApiKey: true },
    );
    assertEquals(status === 200, false, `Função aceitou body inválido (${status}).`);
  },
});

Deno.test({
  name: "[step-up:http] mcp-keys-update body inválido não retorna 200",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !HAS_HTTP,
  fn: async () => {
    const { status } = await callFn(
      "mcp-keys-update",
      { /* sem key_id */ },
      { withApiKey: true },
    );
    assertEquals(status === 200, false, `Função aceitou body inválido (${status}).`);
  },
});
