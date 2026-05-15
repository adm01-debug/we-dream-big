# Onda 3 — Remoção de referências órfãs

**Data:** 14 de maio de 2026  
**PR alvo:** cleanup/onda-3-remove-orphan-refs  
**Bloqueadores resolvidos:** B-5 (parcial — refs), B-9 (parcial — refs)  
**Tempo de execução:** ~20 minutos  
**Risco:** baixo (apenas refs mortas em código)

## Contexto

A auditoria de 10/mai/2026 identificou dois bloqueadores pré-prod:

- **B-5:** `src/hooks/useFavoriteReactions.ts` chamava edge function `favorites-public-react` que não existe
- **B-9:** `supabase/functions/quote-public-view/` era stub que retornava 501 com `verify_jwt=false`, expondo metadata pra reconnaissance de bots

Em sessões anteriores, dois trabalhos parciais já tinham sido feitos:

1. O arquivo `src/hooks/useFavoriteReactions.ts` foi deletado (commit anterior à Onda 1)
2. A pasta `supabase/functions/quote-public-view/` foi deletada (commit anterior à Onda 1)
3. A edge function foi de-deployada do Supabase prod (HTTP 404 confirmado em 14/mai)

Porém, **referências mortas a `quote-public-view` permaneceram em 4 arquivos** do repo, e um artefato de diagnóstico (`.tmp-write-probe.md`) ficou em main após PR #189.

## Mudanças desta onda

### 1. `supabase/config.toml`
Removido bloco órfão `[functions.quote-public-view]` (3 linhas).

### 2. `supabase/functions/_shared/edge-authz-manifest.ts`
Removida entrada órfã na linha 52 do `EDGE_AUTHZ_MANIFEST`.

### 3. `supabase/functions/_shared/cors-snapshot.json`
Removida entrada órfã (8 linhas) do array `functions[]`.

### 4. `supabase/functions/_shared/credentials.ts`
Atualizado comentário de documentação (linha 225) removendo menção a quote-public-view.

### 5. `.tmp-write-probe.md`
Deletado (artefato do diagnóstico de permissões GitHub PAT durante Onda 1).

## Validações

- ✅ JSON do `cors-snapshot.json` parseia corretamente
- ✅ Estrutura TOML do `config.toml` válida após remoção
- ✅ Nenhuma outra referência a `quote-public-view` ou `favorites-public-react` em `src/` ou `supabase/functions/` (exceto migration histórica que dropou a tabela `favorite_item_reactions` — mantida por histórico)
- ✅ Edge function `quote-public-view` confirmadamente removida do Supabase prod (HTTP 404)
- ✅ Hook `useFavoriteReactions` não é importado em nenhum lugar de `src/`

## Impacto

| Item | Antes | Depois |
|---|---|---|
| Edges públicas no manifest | 16 | 15 |
| Edges em config.toml | 10 | 9 |
| Refs mortas a quote-public-view | 4 | 0 |
| Artefatos de diagnóstico em main | 1 | 0 |

## Próximas ondas

Onda 4 — `esbuild preservar warn/error` (B-1.1) + base para Sentry init (B-1.2).