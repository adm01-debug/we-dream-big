# 🧪 SMOKE TEST — D.2.4 External Connections

Importante: este patch FECHA o bug de 18 dias documentado em Decision 007
(`get_connection_failure_window_minutes` apontava para coluna inexistente).

## Pré-requisitos
- patch.sql aplicado (D.2.4 + Decision 007 que renomeia system_settings)
- validate.sql passou em 7/7

## Teste 1 — RPCs de configuração (o bug histórico)
```sql
-- ANTES do recovery, esses chamados causavam erro de "coluna value não existe"
SELECT public.get_connection_failure_window_minutes();
-- Esperado: integer (default ou valor configurado)

SELECT public.set_connection_failure_window_minutes(15);
-- Esperado: sem erro, valor 15 salvo em system_settings

SELECT public.get_connection_failure_window_minutes();
-- Esperado: 15

SELECT public.get_connections_auto_test_interval();
-- Esperado: integer

SELECT public.set_connections_auto_test_interval(300);
-- Esperado: sem erro
```

## Teste 2 — Inserir external_connection manualmente
```sql
INSERT INTO public.external_connections (
  name, provider, config, is_active
) VALUES (
  'smoke_test_conn', 'cloudflare', '{"endpoint":"test"}'::jsonb, false
) RETURNING id, name, provider;
-- Esperado: 1 row inserido
```

## Teste 3 — FK CASCADE com connection_test_history
```sql
-- Adicionar test history
INSERT INTO public.connection_test_history (
  connection_id, status, response_time_ms
) VALUES (
  (SELECT id FROM public.external_connections WHERE name='smoke_test_conn'),
  'success', 42
) RETURNING id;

-- Deletar a connection
DELETE FROM public.external_connections WHERE name='smoke_test_conn';

-- Verificar CASCADE
SELECT count(*) FROM public.connection_test_history
WHERE connection_id IS NOT NULL
  AND connection_id NOT IN (SELECT id FROM public.external_connections);
-- Esperado: 0 (CASCADE removeu)
```

## Teste 4 — sync_external_connections_from_credentials
```sql
SELECT public.sync_external_connections_from_credentials();
-- Esperado: jsonb com resumo da sync, sem erro
-- Esta RPC sincroniza credentials da Cloudflare/XBZ migradas na Fase 2
```

## ✅ Critério de aprovação
- TODOS os 5 RPCs executam sem erro (CRÍTICO: corrige bug de 18 dias)
- FK CASCADE funciona
- sync executa e retorna info
