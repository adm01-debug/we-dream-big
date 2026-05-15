# Bloco 17 — Database Webhooks

Auditoria executada diretamente contra o BD. **TL;DR:** o projeto **não usa
Database Webhooks nativos do Supabase Dashboard** (UI "Database → Webhooks").
Em vez disso, possui um **sistema de webhooks próprio** com tabela
`public.outbound_webhooks` + triggers `dispatch_quote_webhook_event()` que
chamam a edge function `webhook-dispatcher` via `extensions.http_post`.

---

## 1) Webhooks nativos do Supabase (UI Dashboard) — **0**

```sql
SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'supabase_functions');
-- → false
```

- Schema `supabase_functions` **não existe** → nenhum hook criado pela
  UI "Database → Webhooks".
- Extensão `pg_net` está instalada (usada por `retry_failed_webhook_deliveries`),
  mas não há triggers `supabase_functions.http_request` registrados.
- **Nada a exportar dessa fonte.**

Para auditar a qualquer momento:

```sql
SELECT n.nspname, c.relname, t.tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t
JOIN pg_class c     ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc  p     ON p.oid = t.tgfoid
JOIN pg_namespace pn ON pn.oid = p.pronamespace
WHERE NOT t.tgisinternal
  AND (pn.nspname = 'supabase_functions'
    OR p.proname IN ('http_request','http_post_request'));
-- → 0 linhas
```

---

## 2) Sistema de webhooks próprio do projeto

Arquitetura (ver `mem://integrations/connections-hub`):

```text
   trigger pg               edge function          subscriber
┌─────────────────┐    ┌──────────────────────┐   ┌───────────────┐
│ INSERT/UPDATE   │ → │ webhook-dispatcher    │ → │ HTTPS endpoint│
│ em quotes/      │   │ (HMAC-SHA256, retry,  │   │ do cliente    │
│ orders/...      │   │  webhook_deliveries)  │   │ (n8n, etc.)   │
└─────────────────┘   └──────────────────────┘   └───────────────┘
        │
        └─→ extensions.http_post(url=/functions/v1/webhook-dispatcher,
                                 body={event, payload})
```

### 2.1 Tabela registry — `public.outbound_webhooks`

| Coluna                 | Tipo          | Notas                                  |
|------------------------|---------------|----------------------------------------|
| `id`                   | uuid PK       | `gen_random_uuid()`                    |
| `name`                 | text NOT NULL | Nome amigável                          |
| `url`                  | text NOT NULL | Endpoint HTTPS do subscriber           |
| `secret_ref`           | text          | Nome do secret usado p/ HMAC           |
| `events`               | text[] NOT NULL | Eventos assinados (ver §3)           |
| `active`               | bool NOT NULL DEFAULT true | |
| `retry_policy`         | jsonb NOT NULL | `{max_attempts:int, ...}`             |
| `description`          | text          |                                        |
| `created_by`           | uuid NOT NULL |                                        |
| `last_triggered_at`    | timestamptz   |                                        |
| `total_success`        | int NOT NULL DEFAULT 0 | |
| `total_failure`        | int NOT NULL DEFAULT 0 | |
| `consecutive_failures` | int NOT NULL DEFAULT 0 | |
| `auto_disabled_at`     | timestamptz   | Setado pelo dispatcher após N falhas   |
| `auto_disabled_reason` | text          |                                        |
| `created_at`/`updated_at` | timestamptz NOT NULL DEFAULT now() | |

**Linhas atualmente cadastradas: 0** (snapshot do dump). Cliente cadastra via
`/admin/conexoes` (aba **Webhooks**) → edge `secrets-manager` armazena o
secret e a linha entra em `outbound_webhooks`.

### 2.2 Tabela de auditoria — `public.webhook_deliveries`

Histórico de cada disparo (status HTTP, body de resposta, attempt N, hash do
payload). Usada por `retry_failed_webhook_deliveries()` para reprocessar
falhas dentro de `retry_policy.max_attempts`.

### 2.3 Triggers que disparam webhooks

Função única: **`public.dispatch_quote_webhook_event()`** (SECURITY DEFINER,
`search_path = public, extensions`). Mapeia tabela + operação → evento +
payload, e só chama `extensions.http_post` se houver pelo menos uma
subscription ativa para o evento.

| Trigger                            | Tabela                              | Evento(s)                                                   | Payload (campos enviados)                                                                 |
|------------------------------------|-------------------------------------|-------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| `trg_dispatch_webhook_quotes`      | `public.quotes`                     | `quote.created` (INSERT) · `quote.<status>` (status diff)   | `id, quote_number, status, client_name, client_email, total, seller_id, updated_at`       |
| `trg_dispatch_webhook_orders`      | `public.orders`                     | `order.created` (INSERT)                                    | `id, order_number, status, client_name, total, seller_id`                                 |
| `trg_dispatch_webhook_discount`    | `public.discount_approval_requests` | `discount.requested` · `discount.approved` · `discount.rejected` | `id, quote_id, requested_discount_percent, status, seller_id`                       |
| `trg_dispatch_webhook_kit_share`   | `public.kit_share_tokens`           | `kit.shared` (INSERT)                                       | `id, kit_id, token, client_name, seller_id`                                               |

Características importantes:

- **Fail-safe:** `EXCEPTION WHEN OTHERS THEN RETURN NEW` — falha HTTP nunca
  derruba a transação principal.
- **Curto-circuito:** se `outbound_webhooks` não tem nenhuma linha ativa
  assinando o evento, **nem** chama `http_post`.
- **Status only on diff:** UPDATEs só disparam quando
  `OLD.status IS DISTINCT FROM NEW.status`.
- **Endpoint fixo:** `https://nmojwpihnslkssljowjh.supabase.co/functions/v1/webhook-dispatcher`
  (a edge function lê o evento e fan-out p/ cada subscriber em `outbound_webhooks`
  com HMAC-SHA256 do secret).

### 2.4 Triggers correlatos (notificações internas — **não** são webhooks externos)

Disparam apenas `pg_notify` ou inserem em `notifications`, sem HTTP — incluídos
para completude da auditoria:

| Trigger                                 | Tabela                          | Função                                  |
|-----------------------------------------|---------------------------------|-----------------------------------------|
| `notify_discount_approval_trigger`      | `discount_approval_requests`    | `notify_discount_approval_request()`    |
| `trg_notify_new_order`                  | `orders`                        | `notify_new_order()`                    |
| `trg_notify_quote_client_response`      | `quote_approval_tokens`         | `notify_quote_client_response()`        |
| `trg_notify_quote_status_change`        | `quotes`                        | `notify_quote_status_change()`          |

### 2.5 Função de retry — `public.retry_failed_webhook_deliveries()`

`SECURITY DEFINER`, lê `app.supabase_service_role_key`, varre
`webhook_deliveries` da última 1 hora pegando a **última tentativa por
`(webhook_id, event, payload_hash)`** e re-dispara via `net.http_post` para
`webhook-dispatcher` se ainda há margem em `retry_policy.max_attempts`.

Retorna `{ ok, retried, skipped_max_attempts, ran_at }`.

**Não está agendada** em `cron.job` no snapshot atual. Para ativar:

```sql
SELECT cron.schedule(
  'retry-failed-webhooks',
  '*/5 * * * *',
  'SELECT public.retry_failed_webhook_deliveries();'
);
```

---

## 3) Catálogo de eventos (consolidado)

| Evento                | Origem                                | Quando                                                  |
|-----------------------|---------------------------------------|---------------------------------------------------------|
| `quote.created`       | INSERT `quotes`                       | Novo orçamento gravado                                  |
| `quote.<status>`      | UPDATE `quotes` (status diff)         | `draft`→`sent`, `approved`, `rejected`, …               |
| `order.created`       | INSERT `orders`                       | Pedido criado (após trigger `PED-YY-XXXX`)              |
| `discount.requested`  | INSERT `discount_approval_requests`   | Vendedor pede alçada extra                              |
| `discount.approved`   | UPDATE status → `approved`            | Gerente aprova                                          |
| `discount.rejected`   | UPDATE status → `rejected`            | Gerente rejeita                                         |
| `kit.shared`          | INSERT `kit_share_tokens`             | Kit publicado externamente                              |

---

## 4) O que incluir no export

Já em `block01_tables_indexes_rls.sql`: `outbound_webhooks` + `webhook_deliveries`.
Garanta também:

1. **Função `dispatch_quote_webhook_event()`** → `block04_functions.sql`.
2. **Função `retry_failed_webhook_deliveries()`** → idem.
3. **4 triggers `trg_dispatch_webhook_*`** → `block05_triggers.sql`.
4. **4 triggers de notify interno** (§ 2.4) → idem.
5. **Edge function `webhook-dispatcher`** → no lote 4 das edge functions
   (`block12_edge_functions_batch4.md`, ainda a gerar).
6. **Setting `app.supabase_service_role_key`** → documentar como secret
   manual; **não** exportar valor.
7. **Cron `retry-failed-webhooks`** → opcional; documentar o `cron.schedule`
   acima, não cadastrar por padrão.

Ao restaurar em outro projeto, **substituir** o `_project_url` hardcoded em
`dispatch_quote_webhook_event()` pelo URL do novo projeto (ou refatorar
para `current_setting('app.project_url')` — recomendado).

---

## 5) Snapshot bruto (referência rápida)

```text
supabase_functions schema ........... NÃO EXISTE
pg_net extension .................... INSTALADA
pg_publication_tables (realtime) .... 0 tabelas (ver block10)
cron.job ............................ 0 jobs
outbound_webhooks (linhas) .......... 0
Triggers que chamam http_post ....... 4 (quotes, orders, discount, kit_share)
Funções com net.http_* .............. 1 (retry_failed_webhook_deliveries)
```

---

## Apêndice — Comandos de auditoria reusáveis

```sql
-- Listar TODOS os triggers que fazem chamadas HTTP (nativo + custom)
SELECT n.nspname AS schema, c.relname AS tabela, t.tgname AS trigger,
       p.proname AS funcao
FROM pg_trigger t
JOIN pg_class c     ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc  p     ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND pg_get_functiondef(p.oid) ~* '\m(net|extensions)\.http_(post|get|request)\M'
ORDER BY 1,2,3;

-- Webhooks ativos + último disparo
SELECT name, url, events, active, total_success, total_failure,
       consecutive_failures, last_triggered_at, auto_disabled_reason
FROM public.outbound_webhooks
ORDER BY active DESC, name;

-- Últimas 50 entregas
SELECT delivered_at, webhook_id, event, attempt, success, response_status
FROM public.webhook_deliveries
ORDER BY delivered_at DESC
LIMIT 50;
```
