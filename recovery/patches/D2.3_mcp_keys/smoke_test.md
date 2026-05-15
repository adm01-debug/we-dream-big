# 🧪 SMOKE TEST — D.2.3 MCP API Keys System

## Pré-requisitos
- patch.sql aplicado
- validate.sql passou (especialmente FORCE RLS)

## Teste 1 — RPC can_grant_mcp_full
```sql
SELECT public.can_grant_mcp_full(auth.uid());
-- Esperado: boolean (true se admin/owner, false caso contrário)
-- Não deve causar erro mesmo se user não for elegível
```

## Teste 2 — FORCE RLS funcionando
```sql
-- Mesmo como superuser, sem permissão explícita, não pode bypassar:
SET ROLE authenticated;
SELECT * FROM public.mcp_api_keys LIMIT 1;
-- Esperado: 0 rows (ninguém consegue, exceto via policy explícita)
RESET ROLE;
```

## Teste 3 — Registrar violação de acesso
```sql
INSERT INTO public.mcp_access_violations (
  user_id, attempted_resource, reason, severity
) VALUES (
  auth.uid(), 'mcp_full', 'smoke_test', 'low'
) RETURNING id, created_at;
-- Esperado: 1 row
```

## Teste 4 — Cleanup
```sql
DELETE FROM public.mcp_access_violations WHERE reason='smoke_test';
```

## ✅ Critério de aprovação
- can_grant_mcp_full retorna boolean
- FORCE RLS impede bypass
- mcp_access_violations aceita insert + RLS funciona
