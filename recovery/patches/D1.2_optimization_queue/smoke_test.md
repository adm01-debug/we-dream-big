# 🧪 Smoke Test — D1.2_optimization_queue

> Executar APÓS patch + validate. Testes manuais no app.

## ✅ Pré-flight
- [ ] `validate.sql` retornou `TRUE` em todas as colunas
- [ ] Advisors do Supabase (security + performance) sem novos alertas
- [ ] App está rodando localmente OU em produção acessível

## Tabelas a verificar no Dashboard
- [ ] `storage.optimization_queue` aparece com 0 ou + rows

## Functions a chamar como RPC
- [ ] `SELECT public.claim_next_optimization(...)` retorna resultado válido (sem erro)
- [ ] `SELECT public.complete_optimization(...)` retorna resultado válido (sem erro)
- [ ] `SELECT public.enqueue_optimization(...)` retorna resultado válido (sem erro)
- [ ] `SELECT public.reset_optimization_queue(...)` retorna resultado válido (sem erro)
- [ ] `SELECT public.get_auto_test_job_status(...)` retorna resultado válido (sem erro)
- [ ] `SELECT public.set_optimization_queue_updated_at(...)` retorna resultado válido (sem erro)

## Cenários do app
- [ ] **BAIXO** — verificar: tabela `optimization_queue` recriada vazia (não existe no destino)
- [ ] **BAIXO** — verificar: funções de claim/complete usam row-locking (skip locked) — comportamento ok em pg 17
- [ ] **MEDIO** — verificar: rpcs podem precisar de role granting (revoke/grant pra anon/authenticated)

## ❌ Se falhar
Rodar `rollback.sql`. Verificar:
1. Logs do Postgres (Supabase Dashboard → Logs)
2. GlitchTip (https://erros.atomicabr.com.br) — buscar últimos 30 min
3. Console do navegador — buscar PGRST*, código 404/500
4. Reportar pra mim com screenshot/log

## ✅ Se passar
Próximo patch: seguir pra próximo D.1.X
