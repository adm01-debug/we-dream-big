# 🧪 SMOKE TEST — D.2.2 Outbound Webhooks

## Pré-requisitos
- patch.sql aplicado
- validate.sql passou

## Teste 1 — Criar webhook outbound
```sql
INSERT INTO public.outbound_webhooks (name, url, event_types, is_active)
VALUES ('smoke_test_webhook', 'https://webhook.site/test', ARRAY['order.created'], true)
RETURNING id, name, url, is_active;
-- Esperado: 1 row, is_active=true
```

## Teste 2 — Registrar entrega
```sql
INSERT INTO public.webhook_deliveries (webhook_id, event_type, payload, status)
VALUES (
  (SELECT id FROM public.outbound_webhooks WHERE name='smoke_test_webhook'),
  'order.created',
  '{"order_id":"test"}'::jsonb,
  'success'
)
RETURNING id, status, created_at;
-- Esperado: 1 row, FK respeitado
```

## Teste 3 — FK CASCADE
```sql
DELETE FROM public.outbound_webhooks WHERE name='smoke_test_webhook';
-- Esperado: deliveries também são deletadas (CASCADE) ou erro de FK protege
SELECT count(*) FROM public.webhook_deliveries WHERE event_type='order.created' AND payload->>'order_id'='test';
-- Esperado: 0 (cascade) ou erro acima (proteção)
```

## ✅ Critério de aprovação
- 3 testes passam
- FK funciona (CASCADE ou proteção)
