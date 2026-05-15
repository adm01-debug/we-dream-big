# 🧪 Smoke Test — D1.5_dashboard_widgets

> Executar APÓS patch + validate. Testes manuais no app.

## ✅ Pré-flight
- [ ] `validate.sql` retornou `TRUE` em todas as colunas
- [ ] Advisors do Supabase (security + performance) sem novos alertas
- [ ] App está rodando localmente OU em produção acessível

## Tabelas a verificar no Dashboard
- [ ] `storage.user_comparisons` aparece com 0 ou + rows

## Functions a chamar como RPC
- [ ] `SELECT public.get_top_collected_products(...)` retorna resultado válido (sem erro)
- [ ] `SELECT public.get_top_compared_products(...)` retorna resultado válido (sem erro)
- [ ] `SELECT public.get_top_favorited_products(...)` retorna resultado válido (sem erro)
- [ ] `SELECT public.get_collections_weekly_count(...)` retorna resultado válido (sem erro)
- [ ] `SELECT public.get_favorites_weekly_count(...)` retorna resultado válido (sem erro)
- [ ] `SELECT public.get_user_recent_comparisons(...)` retorna resultado válido (sem erro)

## Cenários do app
- [ ] **BAIXO** — verificar: funções só leem dados (sem ddl) — risco mínimo
- [ ] **BAIXO** — verificar: performance: agregações sobre tabelas grandes podem ser lentas
- [ ] **MEDIO** — verificar: dependem das tables `collections`, `collection_products`, `favorites`, `product_comparisons` existirem

## ❌ Se falhar
Rodar `rollback.sql`. Verificar:
1. Logs do Postgres (Supabase Dashboard → Logs)
2. GlitchTip (https://erros.atomicabr.com.br) — buscar últimos 30 min
3. Console do navegador — buscar PGRST*, código 404/500
4. Reportar pra mim com screenshot/log

## ✅ Se passar
Próximo patch: 🎉 último P1 da Fase D.1!
