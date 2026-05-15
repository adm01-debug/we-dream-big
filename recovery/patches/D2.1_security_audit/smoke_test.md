# 🧪 SMOKE TEST — D.2.1 Security & Audit Logs

Conjunto de testes manuais para validar que o patch funcionou em PROD.

## Pré-requisitos
- patch.sql aplicado
- validate.sql passou em 7/7

## Teste 1 — Inserção em audit_logs
```sql
INSERT INTO public.audit_logs (event_type, user_id, payload)
VALUES ('test_event', auth.uid(), '{"smoke":"test"}'::jsonb)
RETURNING id, event_type, created_at;

-- Esperado: 1 row, id UUID, created_at = now()
```

## Teste 2 — RPC log_access_denied
```sql
SELECT public.log_access_denied(
  'test_resource',
  'unauthorized_attempt',
  '{"ip":"127.0.0.1","reason":"smoke_test"}'::jsonb
);

-- Esperado: retorna uuid do registro inserido, sem erro
-- Verificar: SELECT count(*) FROM public.audit_logs WHERE event_type LIKE '%access_denied%';
```

## Teste 3 — RPC check_hardening_status
```sql
SELECT public.check_hardening_status();

-- Esperado: jsonb com status do hardening atual
-- Deve retornar mesmo se hardening_health_snapshots estiver vazia
```

## Teste 4 — Enum step_up_action funcionando
```sql
INSERT INTO public.step_up_audit_log (user_id, action, status)
VALUES (auth.uid(), 'reauth'::public.step_up_action, 'success');

-- Esperado: insert ok, valor 'reauth' válido no enum
-- Erro esperado se passar valor inválido:
INSERT INTO public.step_up_audit_log (user_id, action) VALUES (auth.uid(), 'invalid_value');
-- → ERRO: invalid input value for enum
```

## Teste 5 — Coluna nova em admin_audit_log
```sql
INSERT INTO public.admin_audit_log (action, source, duration_ms, request_id)
VALUES ('smoke_test', 'mcp', 42, gen_random_uuid()::text)
RETURNING id, status, source, duration_ms, request_id;

-- Esperado: 1 row com novas colunas preenchidas
```

## Teste 6 — RLS está protegendo dados
```sql
-- Como user normal (não admin), tentar SELECT em audit_logs:
SET ROLE authenticated;
SET request.jwt.claim.sub TO '<user_id_normal>';
SELECT * FROM public.audit_logs LIMIT 1;
-- Esperado: 0 rows (RLS bloqueia)

RESET ROLE;
```

## Teste 7 — Cleanup pós-smoke
```sql
DELETE FROM public.audit_logs WHERE payload->>'smoke' = 'test';
DELETE FROM public.step_up_audit_log WHERE action = 'reauth'::public.step_up_action AND status = 'success';
DELETE FROM public.admin_audit_log WHERE action = 'smoke_test';
```

## ✅ Critério de aprovação
- Todos os 7 testes passam sem erro
- Cleanup remove dados de teste sem afetar dados reais
- validate.sql continua passando em 7/7 após smoke test
