---
name: quote-system-master-spec
description: Sistema de orçamentos com 4 etapas, aprovação pública por token, lista /orcamentos com chips sticky de status (contadores), badge "Visualizado" via quote_approval_tokens, ações inline (duplicar/link/WhatsApp/aprovar), funil de vendas (Rascunho→Enviado→Visualizado→Aprovado→Convertido) com taxa por etapa e ciclo médio (created→approved), conversão para pedido (orders.quote_id) com banner read-only, badge clicável de pedido vinculado, follow-up automático diário (cron) para enviados ≥2d sem viewed.
type: feature
---

# Sistema de Orçamentos — Master Spec

## Lista `/orcamentos`
- **Header + KPIs**: total em aberto, aprovados, pendentes, conversão %.
- **Funil**: `QuotesFunnelChart` (5 etapas com barras + taxa entre etapas) + chip de ciclo médio.
- **Filtros**: chips sticky por status (com contadores) + busca Fuse.js + ordenação.
- **Lista configurável**: colunas reordenáveis (DnD), bulk actions (status, exportar, excluir).
- **Por linha**: badge "Visualizado pelo cliente" (quote_approval_tokens.viewed_at) + `QuoteOrderBadge` (pedido vinculado, navega para /pedidos/:id) + ações rápidas (duplicar / link / WhatsApp / aprovar com confetti).
- **Empty state**: "Limpar filtros" quando há filtros ativos.

## Detalhe `/orcamentos/:id`
- Header com `QuoteOrderBadge` + status + botão "Converter em Pedido" (`QuoteConvertToOrder`, só ativo quando approved).
- Banner verde **read-only** com `Lock` quando `status === "converted"`.
- Tabs: histórico, comentários, versões.

## Conversão orçamento → pedido
- `convertQuoteToOrder` (orderService): copia cliente/itens/condições, cria `orders` com `quote_id`, status `confirmed`, e seta `quotes.status = "converted"`.
- Bloqueio de duplicidade: erro se já existe pedido com aquele `quote_id`.
- Numeração `orders.order_number` por trigger `PED-YY-XXXX`.

## Funil & Analytics
- `useQuoteFunnel(quotes, viewedMap)` calcula:
  - Counts cumulativos por etapa.
  - `rateFromPrev` (verde ≥50%, warning ≥20%, destructive <20%).
  - `avgCycleDays` (média de dias entre `created_at` e `updated_at` para approved/converted).
- `useQuoteViewedMap(ids)` faz lookup por lote em `quote_approval_tokens`.

## Follow-up automático
- Edge function `quote-followup-reminders` (cron diário 11:00 UTC):
  - Busca quotes `sent`/`pending` com `updated_at` ≥ 2 dias atrás.
  - Filtra os que NÃO têm `viewed_at` em `quote_approval_tokens`.
  - Idempotente: ignora se já existe `follow_up_reminders` do mesmo `quote_id` no dia.
  - Insere registro com `reminder_type = "no_view"` + título + nota.
- Job: `cron.schedule('quote-followup-reminders-daily', '0 11 * * *', ...)`.

## URL params (Quote Builder)
- `/orcamentos/novo?productId=&qty=&color=&technique=` — payload com 4 casas decimais.
- Sync com Bitrix/SalesPro mantém precisão (`crm-quote-sync-unified-spec`).

## Tabelas relevantes
- `quotes` (status: draft|pending|sent|approved|rejected|expired|converted)
- `quote_items`, `quote_approval_tokens` (viewed_at), `quote_history`, `discount_approval_requests`
- `orders.quote_id` → vínculo 1:1 com orçamento convertido
- `follow_up_reminders` (reminder_type: no_view | expiring)
