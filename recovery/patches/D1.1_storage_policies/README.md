# 📦 D.1.1 — Storage Buckets + Policies

> **Patch:** D.1.1 · **Prioridade:** P1 · **Risco:** 🟡 BAIXO-MÉDIO
> **Status:** ⏳ aguardando aprovação do sponsor pra aplicar

## 🎯 Objetivo
Restaurar a infra de Storage do Lovable: **6 buckets** + **34 RLS policies**.

## 📋 Contexto

| Item | Origem | Destino atual |
|---|---|---|
| **Buckets** | 6 no dump (`block09_storage.sql`) | 1 (`scripts`) — 6 faltam ⚠️ |
| **Policies** | 34 no dump (`block09b_storage_policies_full.sql`) | 0 em `storage.objects` ⚠️ |
| **Funcs de role** | usa `is_supervisor_or_above()` | ✅ já existe no destino |

### Os 6 buckets a criar
| Bucket | Limit | Público? | Função |
|---|---|---|---|
| `component-media` | 5 MB | ❌ privado | mídia de componentes de kits |
| `mockup-art-files` | 5 MB | ❌ privado | artes/anexos de mockup AI |
| `personalization-images` | 5 MB | ❌ privado | imagens upadas pelo cliente p/ personalização |
| `product-videos` | 100 MB | ❌ privado | vídeos de produtos |
| `quarantine` | 5 MB | ❌ privado | arquivos suspeitos (clamav) |
| `supplier-logos` | 2 MB | ❌ privado | logos das marcas fornecedoras |

## 🔗 Dependências
- ✅ Function `public.is_supervisor_or_above(uuid)` (já existe)
- ✅ Function `public.is_admin(uuid)` (já existe)
- ✅ Function `auth.uid()` (built-in Supabase)
- ✅ RLS no `storage.objects` (já habilitado por default)

## 🚦 Workflow de execução

```
1. backup.sql     → snapshot do estado atual (buckets + policies storage)
2. patch.sql      → transação atômica: CREATE 6 buckets + 34 policies
3. validate.sql   → confirmar: 6+1=7 buckets, 34 policies em storage.objects
4. smoke test     → upload de teste em cada bucket via dashboard
5. commit         → tag patch-D1.1
```

## ⚠️ Riscos identificados

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Bucket já existe com config diferente | BAIXA | Patch usa `ON CONFLICT ... DO UPDATE` |
| Policy name colide | MÉDIA | Patch usa `DROP POLICY IF EXISTS` antes |
| Frontend tenta upload antes do patch | BAIXA | Storage estava sem policies = já tava bloqueado por default |
| Bucket `quarantine` é usado pelo clamav | MÉDIA | Verificar se infra clamav está rodando no VPS |

## 🔄 Rollback
Documentado em `rollback.sql`:
1. DROP das 34 policies recriadas
2. DELETE dos 6 buckets (CUIDADO: se já tiver dados, falha — desejável)

## 📊 Validação pós-patch
Após aplicar, rodar `validate.sql` que confirma:
- `count(*) FROM storage.buckets WHERE id IN (...) = 6`
- `count(*) FROM pg_policies WHERE schemaname='storage' = 34`
- RLS habilitado em `storage.objects` e `storage.buckets`

## 🧪 Smoke test (manual no app)
Após patch aplicado, sponsor faz:
1. Login admin no app
2. Tentar fazer upload em cada bucket via interface (se houver UI)
3. Verificar que upload funciona
4. Verificar que usuário não-admin NÃO consegue uploadar em buckets restritos

---

📅 **Criado:** 2026-05-11 17:30 UTC
👤 **Autor:** Claude (Gerente)
🚦 **Próximo passo:** sponsor revisa este README + os 4 SQL files → aprova → aplicamos
