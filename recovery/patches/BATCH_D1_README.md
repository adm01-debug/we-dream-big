# BATCH D.1 — Patches P1 (Lovable Recovery) — ✅ COMPLETO

**Data execução:** 2026-05-11
**Status:** 5/5 aplicados com sucesso
**Sponsor:** Joaquim

## Patches aplicados

| Patch | Descrição | Status | Resultado |
|---|---|:-:|---|
| **D.1.1** | Storage Policies | ✅ | 6 buckets + 34 policies em storage.objects |
| **D.1.2** | Optimization Queue | ✅ | 3 tables + 5 policies + 6 funcs |
| **D.1.3** | Collection Items v2 (Lovable) | ✅ | 3 tables + 7 policies + 2 funcs (após Decision 004) |
| **D.1.4** | Kit Collaboration | ✅ | 4 tables + 13 policies + 2 funcs |
| **D.1.5** | Dashboard Widgets RPCs | ✅ | 1 table + 5 policies + 6 funcs |

## Métricas finais

- **13/13** tabelas Lovable resgatadas (incluindo 2 renomeadas B2B preservadas)
- **16/16** RPCs P1 críticas restauradas
- **30** policies em public.*
- **34** policies em storage.objects
- **0** dados perdidos (7 b2b_collections + 4433 b2b_collection_products preservados)

## Bugs encontrados e corrigidos

### 1. Extrator regex ganancioso (v2 → v3)
- **Sintoma:** patches D.1.2-5 inicialmente gerados com 60-303KB (corrompidos), incluíam policies/indexes de tabelas alheias
- **Causa:** regex `[\s\S]+?` em script v2
- **Fix:** v3 parsea por blocos pg_dump (`-- Name: X; Type: Y`); patches finais: 6-13KB

### 2. Colisão semântica de `collections` (Decision 004)
- **Sintoma:** D.1.3 falhou com `column c.share_token does not exist`
- **Causa:** destino tinha `collections` schema B2B (admin), Lovable espera schema B2C (user)
- **Fix:** Plano A' — RENAME B2B → `b2b_collections` + CREATE `collections` Lovable

### 3. Order-of-creation em D.1.4
- **Sintoma:** `is_kit_collaborator()` falhou com "relation public.kit_collaborators does not exist"
- **Causa:** SQL function valida `FROM` em compile-time
- **Fix:** Reordenar — TABLES → FUNCTIONS → POLICIES

## Pending para Fase D.2

- [ ] Adicionar FK `connection_test_history.connection_id → external_connections` (D.2 cria external_connections)
- [ ] Smoke test no app (Joaquim)
- [ ] Regenerar types.ts via Supabase CLI
- [ ] Verificar advisors security + performance
- [ ] Agendar cron diário para `cleanup_expired_collection_trash()` via pg_cron
