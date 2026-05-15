# Redeploy T3 — Auditoria de Migrations

**Data**: 2026-05-12  
**Autor**: Tarefa 3 do plano de redeploy Promo_Gifts  
**Status**: 🟡 Achado crítico documentado — decisão estratégica necessária

---

## TL;DR

`supabase/migrations/` no repo e o estado real do banco Supabase **estão completamente desincronizados há meses**:

| Camada | Total | Papel |
|---|---|---|
| **Banco Supabase** (`schema_migrations`) | 209 versions | ✅ Fonte da verdade do schema real |
| **Repo** (`supabase/migrations/`) | 332 versions | Histórico desincronizado (várias fontes contribuíram) |
| **Intersecção** | **ZERO** | Nenhuma version aparece nos dois lados |

**O banco Supabase é a fonte da verdade**. As migrations no repo são histórico legado e iterações de várias ferramentas (Lovable, edição direta, scripts) que **não foram sincronizadas com o que efetivamente foi aplicado**.

---

## Como descobri

```sql
-- No projeto doufsxqlfjyuvxuezpln:
SELECT COUNT(*) FROM supabase_migrations.schema_migrations;
-- → 209

-- Última aplicada (registro do que o BANCO aceitou):
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;
-- → 20260512164738_onda3_simplifica_nf_e_retry  (12 maio 16:47)
```

E no repo: 332 arquivos `.sql` em `supabase/migrations/`, último timestamp `20260512153020` (a migration que eu criei na T2, 1h17min ANTES da última registrada no banco).

Cruzando os dois conjuntos: **zero intersecção** de versions.

---

## Quem aplica mudanças no banco

O banco Supabase aceita DDL de várias fontes:
- **Supabase Dashboard** (SQL Editor)
- **MCP `apply_migration`** (caminho que usei na T2 da auditoria — não, espera, só CRIEI o arquivo, ainda não apliquei)
- **Lovable IDE** — quando o dev pede mudança, Lovable gera SQL, aplica via Supabase Management API, e também commita o `.sql` no repo
- **Scripts ad-hoc** (`psql`, migrations manuais)
- **Edição direta** no SQL Editor

Cada uma dessas registra uma linha em `supabase_migrations.schema_migrations` SE for executada via mecanismo de migration. Edições ad-hoc no SQL Editor podem nem aparecer lá.

**Lovable é só UMA dessas fontes** — ele aplica mudanças, mas o Supabase pode estar mais atualizado que o Lovable (mudanças feitas direto no Dashboard, por exemplo).

---

## Implicações práticas para o redeploy (T11)

### ❌ O que NÃO fazer
```bash
supabase db push --project-ref doufsxqlfjyuvxuezpln
```
Isso tentaria aplicar 332 migrations no banco. Resultado esperado:
- Tentaria recriar tabelas que já existem
- Tentaria dropar colunas que já foram renomeadas
- Conflitos de schema em cascata
- Possível corrupção de estado

### ✅ O que fazer
Para a única migration relevante que adicionei (T2):
```sql
-- Conteúdo de 20260512153020_drop_favorite_item_reactions.sql
DROP TABLE IF EXISTS public.favorite_item_reactions CASCADE;
```

Aplicar **manualmente** via:
- MCP tool: `SUPABASE - GESTÃO DE PRODUTOS:apply_migration`
- ou SQL Editor do Supabase Dashboard

Não usar `supabase db push`.

---

## Distribuição das pendentes (332 no repo, fora do banco)

```
Numéricas legadas (001_*, 002_*…)    →   5 (provavelmente do bootstrap inicial em 2024)
Formato 2024…                         →   2
Formato 2025…                         →  37
Formato 2026 com timestamp completo   → 288
```

A grande maioria (288) tem timestamp completo `YYYYMMDDHHMMSS_*` e descrição (ou hash UUID gerado pelo Lovable). Algumas têm nomes bem descritivos:

- `20260507145245_drop_user_passkeys_table.sql`
- `20260507161547_drop_public_token_tables.sql`
- `20260512153020_drop_favorite_item_reactions.sql` ← criada por mim (T2)

Outras (a maioria) têm hash gerado:
- `20260503132831_d3a803d5-3290-4a8e-bc12-27042b90facb.sql`

**Hipótese forte**: as com hash são tentativas/iterações do Lovable que foram salvas no repo (por commit automático) mas que **divergiram** do que foi efetivamente aplicado no banco. Algumas podem ter sido revertidas, substituídas, ou simplesmente nunca chegaram a ser executadas.

---

## Como o Supabase chegou ao estado atual

Provável sequência (não-linear, com várias fontes contribuindo):

```
Mudança pedida no Lovable IDE ──┐
Mudança feita direto no Dashboard ──┼──→ Banco Supabase (fonte da verdade)
Migration aplicada via MCP ─────────┘
                                      │
                                      └──→ schema_migrations.version registrado
                                      
Algumas migrations também ganham .sql no repo (Lovable commita)
Mas o repo NÃO reflete TUDO que foi aplicado.
```

Por isso a divergência: o repo tem 332 "tentativas" históricas, mas o banco só registrou 209 que foram efetivamente aplicadas — e dessas, **nenhuma** tem o mesmo filename que está no repo.

---

## Achado crítico de processo

Não estamos com **migrations pendentes** — estamos com um **histórico de migrations desincronizado**. Isso é uma situação DIFERENTE de "preciso rodar `db push`".

### Risco mapeado
- 🔴 Algum desavisado roda `supabase db push` → **destrói o banco**
- 🟡 Time perde rastreabilidade de mudanças (não dá pra fazer `git blame` da migration de uma coluna em prod)
- 🟡 Rollback impossível via git revert (precisa reverter direto no banco)

### Mitigação recomendada
1. **Documentar a realidade** (este doc faz isso)
2. **Avisar no diretório**: `supabase/migrations/README.md` explica o cenário e o `db push` proibido (já adicionado nesta PR)
3. **Para migrations específicas que precisam ir pro banco**: aplicar via MCP `apply_migration` ou Dashboard, e registrar quem aplicou
4. **Discussão estratégica futura**: decidir como restabelecer paridade entre repo e banco — exportar schema atual, marcar migrations antigas como "baseline", começar processo limpo

---

## Impacto no plano de Redeploy

| Tarefa | Como ficou |
|---|---|
| **T11 (aplicar migrations)** | ⚠️ Redefinida: aplicar APENAS a migration `20260512153020_drop_favorite_item_reactions.sql` via MCP `apply_migration`. Não usar `db push`. |
| **T14 (smoke test)** | Validar que o drop foi efetivo: `SELECT * FROM information_schema.tables WHERE table_name = 'favorite_item_reactions'` → deve retornar vazio |
| **T15 (POP)** | Documentar a regra: "neste projeto, o banco Supabase é fonte da verdade. Não rode `db push`. Aplique migrations específicas via MCP ou Dashboard." |

---

## Para o próximo Claude (se chat trocar)

Se você está lendo isso porque herdou esta sessão:

1. **NÃO rode `supabase db push`** em hipótese alguma. Vai quebrar tudo.
2. **Banco Supabase é a fonte da verdade do schema**, não o repo nem o Lovable.
3. Para aplicar a migration de T2 (T11 do plano), use:
   ```
   SUPABASE - GESTÃO DE PRODUTOS:apply_migration
   - name: drop_favorite_item_reactions
   - query: DROP TABLE IF EXISTS public.favorite_item_reactions CASCADE;
   ```
4. Issue de discussão (a abrir na T3) vai estar linkada nesta tarefa
5. Próxima tarefa: **T4 — auditar load alto na VPS**
