# Onda 6 — checkAiQuota / acquireAiQuota fail-closed

**Data:** 14 de maio de 2026  
**PR alvo:** cleanup/onda-6-ai-quota-fail-closed  
**Bloqueador resolvido:** B-7 da auditoria de 10/mai/2026  
**Tempo de execução:** ~30 minutos  
**Risco:** baixo  
**Impacto financeiro:** alto (evita explosão de custos de IA em caso de falha de infra)

## Contexto

A auditoria identificou `checkAiQuota` em `supabase/functions/_shared/ai-usage.ts` retornando `allowed: true` quando a RPC `check_ai_quota` falhava — comportamento **fail-open**.

Cenário concreto descrito na auditoria:
> Num cenário de bug + uso noturno automatizado: Gemini 2.5 Pro custa $1.25 input / $10 output por 1M tokens. 1.000 chamadas de 5k tokens = 5M tokens = ~$50/hora. 8h não monitorado = US$ 400. Final de semana = US$ 2.000.

## Descoberta: 2 fail-opens, não 1

Inspeção do arquivo revelou que **`acquireAiQuota` também era fail-open** (linha ~80) — e este é o crítico, porque é chamado por `callAiWithTracking`, que é o ponto de entrada de TODAS as edge functions de IA:

| Caller indireto via callAiWithTracking |
|---|
| `generate-ad-prompt`, `voice-agent`, `visual-search`, `analyze-logo-colors`, |
| `ai-recommendations`, `generate-product-seo`, `magic-up-score`, |
| `semantic-search`, `generate-ad-image`, `expert-chat`, `generate-mockup` |

`checkAiQuota` (linha 62) era exportado mas **não tinha callers reais em produção** — exemplo clássico de função morta exportada. Foi consertado por completude / defesa em profundidade.

## Mudanças aplicadas

### `supabase/functions/_shared/ai-usage.ts`

**`checkAiQuota` (linhas 62-67):**
```diff
   if (error) {
-    console.error("[ai-usage] Quota check failed:", error.message);
-    return { allowed: true, used: 0, limit: -1, remaining: -1, reason: "quota_check_failed" };
+    // Onda 6 (B-7): fail-CLOSED. Antes era fail-open ("allowed: true") — risco de gasto
+    // descontrolado de IA se a RPC check_ai_quota falhar (banco lento, função recriada, etc).
+    // Agora bloqueia. Erro é logado via console.error → capturado pelo GlitchTip (Onda 5).
+    console.error("[ai-usage] Quota check failed (fail-closed):", error.message);
+    return {
+      allowed: false,
+      used: 0,
+      limit: 0,
+      remaining: 0,
+      reason: "quota_check_failed_security_lock",
+    };
   }
```

**`acquireAiQuota` (linhas 77-82):**
```diff
   if (error) {
-    console.error("[ai-usage] Atomic quota acquire failed:", error.message);
-    // Fallback: allow but without log_id (will create new log later)
-    return { allowed: true, used: 0, limit: -1, remaining: -1, reason: "acquire_failed" };
+    // Onda 6 (B-7): fail-CLOSED. Antes era "allow but without log_id" — risco de gasto
+    // descontrolado de IA se a RPC acquire_ai_quota falhar. Callers (callAiWithTracking,
+    // ai-router) tratam allowed=false via QuotaExceededError → resposta 429 ao cliente.
+    // Erro é logado via console.error → capturado pelo GlitchTip (Onda 5).
+    console.error("[ai-usage] Atomic quota acquire failed (fail-closed):", error.message);
+    return {
+      allowed: false,
+      used: 0,
+      limit: 0,
+      remaining: 0,
+      reason: "acquire_failed_security_lock",
+    };
   }
```

## Validação de impacto nos callers

Todos os 11 callers indiretos de `acquireAiQuota` (via `callAiWithTracking`) já tratam `QuotaExceededError`:

```typescript
} catch (error: unknown) {
  if (error instanceof QuotaExceededError) {
    return new Response(
      JSON.stringify({ error: "Limite mensal de IA atingido. Contate o administrador." }),
      { status: 429, headers: ... }
    );
  }
  // ... outros erros
}
```

Quando o fix dispara `allowed: false`, `callAiWithTracking` lança `QuotaExceededError`, e o cliente recebe **HTTP 429** com mensagem clara. **Comportamento idêntico ao bloqueio normal de quota.**

`_shared/ai-router/index.ts` (caller direto de `acquireAiQuota`) também trata:
```typescript
const quota = await acquireAiQuota(...);
if (!quota.allowed) {
  await logDecision({ ... outcome: "quota_blocked" });
  // dispara QuotaExceededError
}
```

## Comportamento antes vs depois

| Cenário | Antes (fail-open) | Depois (fail-closed) |
|---|---|---|
| RPC quota funciona, quota OK | ✅ Permite chamada | ✅ Permite chamada (igual) |
| RPC quota funciona, quota excedida | ❌ Bloqueia (429) | ❌ Bloqueia (429) (igual) |
| **RPC quota FALHA (banco off, etc)** | ⚠️ **Permite chamada infinita** | ✅ **Bloqueia (429)** |

Em produção real, se o sistema de quota cair (raro, mas possível), vendedores veem mensagem "Limite mensal de IA atingido" temporariamente. Isso é incomparavelmente melhor que perder R$ centenas/milhares em chamadas de Gemini/GPT-5.

## Observabilidade

O `console.error` quando a RPC falha agora é capturado automaticamente pelo GlitchTip (Onda 5 — `captureConsoleIntegration`). Cada falha vira issue rastreável em https://erros.atomicabr.com.br.

Os `reason` strings (`quota_check_failed_security_lock`, `acquire_failed_security_lock`) permitem filtrar dashboards de quota pra distinguir bloqueios "normais" de bloqueios por falha de infra.

## Validação empírica feita

- ✅ Sintaxe TS validada via `esbuild` standalone (transpila sem erros)
- ✅ Confirmado via grep que NÃO restam mais `allowed: true` nos fallbacks de erro
- ✅ Confirmado via grep que existem 2 `allowed: false` (as 2 inserções)
- ✅ RPCs `check_ai_quota` e `acquire_ai_quota` confirmadas existir no banco production (`information_schema.routines`)

## Riscos / rollback

- **Falso positivo:** se a RPC quota tiver flakiness intermitente, vendedores podem ver 429 inesperado. Mitigação: monitoring no GlitchTip + ajuste de timeout / retry no Postgres se necessário.
- **Rollback simples:** reverter o PR (1 arquivo, 16 linhas).

## Próximos passos sugeridos

A auditoria também recomenda **alerta proativo** quando a branch fail-closed dispara N vezes em M minutos (sintoma de problema infra). Isso vai num PR separado (Onda futura — `alert-quota-failures`), provavelmente como webhook → Slack ou edge function de telemetria.

Por agora, o monitoramento pelo GlitchTip já cobre o caso. Issues nessa rota vão receber tag `quota_check_failed_security_lock` ou `acquire_failed_security_lock` pra filtrar.
