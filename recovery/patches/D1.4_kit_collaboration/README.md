# 📦 D1.4 / kit / collaboration

> **Título:** Kit Collaboration
> **Prioridade:** P1
> **Status:** ⏳ aguardando aprovação do sponsor pra aplicar

## 🎯 Objetivo
Sistema de colaboração em kits/coleções: convites, comentários, tokens de compartilhamento e variantes de personalização.

**Por que crítico:** Diferencial Lovable: usuários compartilham kits com clientes finais via link público + colaboram em decisões via comentários. Hoje QUEBRADO.

## 📊 O que esse patch cria

| Tipo | Quantidade |
|---|---|
| Tabelas | 4 |
| Indexes | 6 |
| Policies (RLS) | 13 |
| Constraints (ALTERs) | 15 |
| Functions | 2 |

### Tabelas
- `public.kit_collaborators`
- `public.kit_comments`
- `public.kit_share_tokens`
- `public.kit_variants`

### Functions
- `public.is_kit_collaborator()`
- `public.is_kit_owner()`

## 🔗 Dependências
- tabela `custom_kits` (já existe)
- função `auth.uid()`
- função `has_role()`

## ⚠️ Riscos identificados

| Risco | Severidade | Mitigação |
|---|---|---|
| 4 tabelas com FK provavelmente entre si (kit_id, collaborator_id) | 🟡 MEDIO | patch usa DO BEGIN/EXCEPTION em ALTERs pra tolerar FK depois |
| Tokens públicos: precisam ser únicos e gerados por trigger? | 🟡 MEDIO | smoke_test gera token + testa acesso público |
| Coexistência com `custom_kits` (já no destino) | 🟡 ALTO | Decisão 003: coexistir até validar uso real no app |

## 🔄 Workflow
```
1. backup.sql     → snapshot pré-patch (se houver objetos preexistentes)
2. patch.sql     → aplica em transação atômica idempotente
3. validate.sql  → confirma que tudo foi criado e funciona
4. smoke_test    → checklist manual no app
```

## 📊 Origem
- Extraído automaticamente de `recovery/block01_tables_indexes_rls.sql` (tabelas, indexes)
- `recovery/block03_policies.sql` (policies)
- `recovery/block04_functions.sql` (funções)
- Idempotência: `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` + `CREATE POLICY`, `CREATE OR REPLACE FUNCTION`, ALTERs em `DO BEGIN/EXCEPTION` blocks



---
📅 **Gerado:** 2026-05-11T18:46:35.372Z
🤖 **Por:** Claude (script de extração Node.js)
