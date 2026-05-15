# 🧪 SMOKE TEST — D.2.5 Telemetry & Monitoring

Decision 006 mid-execução: as 3 tables base (app_vitals, query_telemetry,
webhook_delivery_metrics) foram criadas para suportar os RPCs de telemetry.

## Pré-requisitos
- patch.sql aplicado
- validate.sql passou (3/3 tables + 6/6 RPCs)

## Teste 1 — Inserção em app_vitals
```sql
INSERT INTO public.app_vitals (
  metric_name, metric_value, page_path, user_id
) VALUES (
  'LCP', 1234.5, '/test', auth.uid()
) RETURNING id, metric_name, metric_value;
-- Esperado: 1 row, métrica registrada
```

## Teste 2 — RPC record_platform_failure
```sql
SELECT public.record_platform_failure(
  'smoke_test_failure',
  'controlled_test',
  '{"context":"smoke"}'::jsonb
);
-- Esperado: uuid retornado, registro em query_telemetry/audit_logs
```

## Teste 3 — RPC get_app_health_summary
```sql
SELECT public.get_app_health_summary();
-- Esperado: jsonb com summary (mesmo se vazio)
-- Se chamado por non-admin: retorna {"status":"forbidden"} (esperado)
```

## Teste 4 — RPC lookup_request_id
```sql
SELECT public.lookup_request_id('00000000-0000-0000-0000-000000000000');
-- Esperado: jsonb (null ou registro), sem erro
```

## Teste 5 — Cleanup
```sql
DELETE FROM public.app_vitals WHERE metric_name='LCP' AND page_path='/test';
DELETE FROM public.query_telemetry WHERE event_name='smoke_test_failure';
```

## ✅ Critério de aprovação
- 6/6 RPCs executam sem erro
- 3 tabelas aceitam inserts conforme schema
- RPCs admin-protected retornam 'forbidden' para non-admin (esperado)
