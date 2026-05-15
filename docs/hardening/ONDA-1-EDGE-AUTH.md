# Onda 1 — Hardening de Auth em Edge Functions

**Data:** 2026-05-14
**Branch:** `cleanup/edge-functions-auth-hardening`
**Auditoria base:** `AUDITORIA_REDEPLOY_PROMO_GIFTS_2026-05-13_15-32 (1).md` — Bloqueadores 3.1 e 3.2

## Problema

Duas edge functions estavam expostas publicamente (`verify_jwt = false`) sem nenhuma validação custom de origem, permitindo abuso por qualquer pessoa com a URL:

- **`webhook-dispatcher`**: chamável anonimamente para disparar webhooks, replay de entregas falhas, ou testar webhooks arbitrários. Atacante poderia poluir endpoints externos cadastrados em `outbound_webhooks`.
- **`connections-auto-test`**: chamável anonimamente para forçar testes de conexões com sistemas externos (CRM, Bitrix). Atacante poderia consumir quota de Edge Function, gerar logs falsos, e indiretamente sondar quais credenciais existem.

## Solução implementada

### `webhook-dispatcher` — auth multi-modo

Três contextos de uso, três modos de auth aceitos:

| Caller | Mecanismo | Modo |
|---|---|---|
| Trigger DB `dispatch_quote_webhook_event` | Lê secret do vault, envia `x-dispatcher-secret` | A |
| RPC `retry_failed_webhook_deliveries` | Mesmo | A |
| Frontend admin (`WebhookPlaygroundPanel`, `FailedDeliveriesPanel`) | `Authorization: Bearer <user JWT>` + role ≥ supervisor | B |
| Servidor com service role | `Authorization: Bearer <SERVICE_ROLE_KEY>` (detectado e tratado como Modo A) | A |

**Operações sensíveis** (`test_mode`, `replay_delivery_id`) exigem Modo B obrigatoriamente — Modo A é rejeitado com 403 para evitar abuso por server-side caller que vazasse o secret.

### `connections-auto-test` — auth single-mode

Um caller único (cron `connections-auto-test`), um modo:

- **Modo C**: cron lê secret do vault, envia `x-cron-secret`

### Retrocompat

Se a env var do secret não estiver configurada na edge function (deploy parcial, ambiente de dev), o helper **aceita anônimo com warning log estruturado**. Isto:
- Permite rollback seguro: reverter a env não quebra a função
- Permite ambiente de dev sem dependência de vault
- Loga claramente em produção pra alertar se algo der errado

## Como rotacionar os secrets

1. Gerar novo secret: `SELECT encode(gen_random_bytes(32), 'base64');`
2. Atualizar no painel: Supabase Dashboard → Edge Functions → Secrets (`WEBHOOK_DISPATCHER_SECRET` e/ou `CONNECTIONS_AUTO_TEST_SECRET`)
3. Atualizar no vault: `SELECT vault.update_secret((SELECT id FROM vault.secrets WHERE name = 'WEBHOOK_DISPATCHER_SECRET'), '<NOVO_VALOR>');`
4. Validar: chamar manualmente com novo secret e ver `auto-test-summary` em logs

**Ordem importa**: setar PRIMEIRO no painel (Deno.env) → DEPOIS no vault. Caso contrário há janela onde triggers DB enviam um valor que a edge ainda não conhece.

## Checklist pós-deploy

- [ ] **(automatic)** Cron `connections-auto-test` rodando a cada 15min com 200 OK nos logs
- [ ] **(manual)** Criar/atualizar uma quote via UI, validar que `webhook_deliveries` ganha 1 linha success=true para cada webhook ativo
- [ ] **(manual)** Frontend admin: testar webhook via Playground → deve funcionar (Modo B)
- [ ] **(manual)** Frontend admin: replay de delivery falhada → deve funcionar (Modo B)
- [ ] **(curl)** Chamada anônima sem headers → deve retornar 401:
      ```bash
      curl -i -X POST https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/webhook-dispatcher \
        -H "Content-Type: application/json" -d '{"event":"test","payload":{}}'
      ```
- [ ] **(curl)** Chamada com secret errado → deve retornar 401
- [ ] **(curl)** Chamada `test_mode: true` com x-dispatcher-secret → deve retornar 403 (exige Modo B)
- [ ] **(logs)** Logs Supabase contêm eventos `dispatcher_auth` com `outcome` correto

## Validação automatizada

- `supabase/functions/_shared/dispatcher-auth.test.ts` — 12 testes unitários cobrindo:
  - `constantTimeEqual`: igual, diferente, tamanhos diferentes, vazio, não-string, base64 real
  - `authorizeCron`: env não setada (legacy), sem header (401), header correto (ok), header errado (401), tamanho diferente, chars especiais
- `deno check` em todas as 78 edge functions: passou

## Rollback de emergência

Se algo der errado:

1. **Edge function**: re-deploy do commit anterior. A funcionalidade continua porque os triggers/cron/RPCs continuam enviando o header (que será ignorado pela função antiga).
2. **Banco**: as alterações nas funções SQL podem ser revertidas via MCP `apply_migration` com a versão anterior das funções (ver `git log` para diff).
3. **Vault**: secrets podem ser desabilitados via `UPDATE vault.secrets SET ... WHERE name = ...` — mas a edge function entra em modo retrocompat e aceita anônimo, então não há quebra.
