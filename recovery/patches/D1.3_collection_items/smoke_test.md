# 🧪 Smoke Test — D1.3_collection_items

> Executar APÓS patch + validate. Testes manuais no app.

## ✅ Pré-flight
- [ ] `validate.sql` retornou `TRUE` em todas as colunas
- [ ] Advisors do Supabase (security + performance) sem novos alertas
- [ ] App está rodando localmente OU em produção acessível

## Tabelas a verificar no Dashboard
- [ ] `storage.collection_items` aparece com 0 ou + rows
- [ ] `storage.collection_items_trash` aparece com 0 ou + rows

## Functions a chamar como RPC
- [ ] `SELECT public.move_collection_item_to_trash(...)` retorna resultado válido (sem erro)
- [ ] `SELECT public.cleanup_expired_collection_trash(...)` retorna resultado válido (sem erro)

## Cenários do app
- [ ] **ALTO** — verificar: tabela `collection_items` pode colidir com `collection_products` existente (alias semântico)
- [ ] **MEDIO** — verificar: cron `cleanup_expired_collection_trash` precisa ser agendado
- [ ] **MEDIO** — verificar: trigger de soft-delete pode duplicar com trigger atual de `collection_products`

## ❌ Se falhar
Rodar `rollback.sql`. Verificar:
1. Logs do Postgres (Supabase Dashboard → Logs)
2. GlitchTip (https://erros.atomicabr.com.br) — buscar últimos 30 min
3. Console do navegador — buscar PGRST*, código 404/500
4. Reportar pra mim com screenshot/log

## ✅ Se passar
Próximo patch: seguir pra próximo D.1.X
