# ADR 0006 — Baseline de Migrations: Aceitar Estado Atual (Opção A)

**Status:** Accepted · **Decision:** 013 · **Date:** 2026-05-12

## Contexto

O banco Supabase (209 migrations aplicadas) e o diretório `supabase/migrations/` (332 arquivos) não têm intersecção alguma — diagnóstico documentado em issue #153 e `docs/redeploy/REDEPLOY-T3-MIGRATIONS-AUDIT.md`.

As três opções avaliadas foram:
- **Opção A** — Aceitar o estado atual; formalizar que migrations vão via MCP/Dashboard; repo é histórico
- **Opção B** — Criar migration única de baseline (`pg_dump --schema-only`) + arquivar legacy
- **Opção C** — Migrar para outra ferramenta (Atlas, Sqitch, Prisma migrations)

## Decisão

**Opção A — aceitar o estado atual**, com as seguintes formalizações:

1. `supabase/migrations/` é tratado como **histórico legado** — não representa o estado do banco
2. Toda nova DDL entra via **MCP `apply_migration`** ou **Supabase Dashboard SQL Editor**
3. Novas migrations no repo são criadas manualmente após aplicação confirmada no banco
4. `supabase db push` está **proibido** neste projeto (aviso em `supabase/migrations/README.md`)

## Justificativa (por que não Opção B)

- Opção B requer 2–4h + `pg_dump` do schema completo (~500 tabelas, ~2700 policies, ~5000 indexes)
- O Lovable IDE commita migrations de forma assíncrona; sincronizar durante desenvolvimento ativo aumenta chance de conflito
- O time já opera com sucesso no modo "MCP-first" desde a migração para Onda 3
- A dívida técnica (rastreabilidade quebrada) é real mas não bloqueia operação; pode ser endereçada numa janela de manutenção futura

## Consequências

- ✅ Zero esforço de sincronização; desenvolvimento continua sem interrupção
- ✅ `supabase/migrations/` continua como arquivo de contexto histórico (`git log` ainda útil)
- ⚠️ Rastreabilidade: nova DDL não tem correspondência direta no repo até ser manualmente anotada
- ⚠️ Novo dev precisa ler `CONTRIBUTING.md` antes de assumir que `db push` funciona

## Revisão futura

Reconsiderar Opção B quando: (a) Lovable passar a ter integração nativa com Supabase migrations tracked, ou (b) time crescer acima de 5 devs ativos no banco.

## Referências

- Issue #153 — diagnóstico completo
- `docs/redeploy/REDEPLOY-T3-MIGRATIONS-AUDIT.md` — auditoria das 332 migrations
- `supabase/migrations/README.md` — aviso operacional
