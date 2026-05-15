# 🧪 Smoke Test — D1.4_kit_collaboration

> Executar APÓS patch + validate. Testes manuais no app.

## ✅ Pré-flight
- [ ] `validate.sql` retornou `TRUE` em todas as colunas
- [ ] Advisors do Supabase (security + performance) sem novos alertas
- [ ] App está rodando localmente OU em produção acessível

## Tabelas a verificar no Dashboard
- [ ] `storage.kit_collaborators` aparece com 0 ou + rows
- [ ] `storage.kit_comments` aparece com 0 ou + rows
- [ ] `storage.kit_share_tokens` aparece com 0 ou + rows
- [ ] `storage.kit_variants` aparece com 0 ou + rows

## Functions a chamar como RPC
- [ ] `SELECT public.is_kit_collaborator(...)` retorna resultado válido (sem erro)
- [ ] `SELECT public.is_kit_owner(...)` retorna resultado válido (sem erro)

## Cenários do app
- [ ] **MEDIO** — verificar: 4 tabelas com fk provavelmente entre si (kit_id, collaborator_id)
- [ ] **MEDIO** — verificar: tokens públicos: precisam ser únicos e gerados por trigger?
- [ ] **ALTO** — verificar: coexistência com `custom_kits` (já no destino)

## ❌ Se falhar
Rodar `rollback.sql`. Verificar:
1. Logs do Postgres (Supabase Dashboard → Logs)
2. GlitchTip (https://erros.atomicabr.com.br) — buscar últimos 30 min
3. Console do navegador — buscar PGRST*, código 404/500
4. Reportar pra mim com screenshot/log

## ✅ Se passar
Próximo patch: seguir pra próximo D.1.X
