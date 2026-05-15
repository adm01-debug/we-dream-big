# Onda 9 — Drop public_token_tables + cleanup de funções órfãs (B-8 encerrada)

**Data:** 14 de maio de 2026  
**PR alvo:** cleanup/onda-9-drop-public-token-tables  
**Bloqueador resolvido:** B-8 da auditoria de 10/mai/2026  
**Tempo de execução:** ~40 minutos  
**Risco:** muito baixo (zero callers no repo, zero cron, tabela vazia)

## Contexto

Em 07/mai/2026, o PO (Joaquim) decidiu descontinuar todas as rotas públicas com token:
- `/approve/:token` (aprovação pública de orçamento)
- `/proposta/:token`
- `/kit/:token`
- `/lista-publica/:token`
- `/colecao-publica/:token`
- `/comparar-publica/:token`
- `/dossie/:token`

Motivação: não viável para o modelo de negócio B2B. 7 rotas frontend + 6 edge functions + código associado foram removidos. Faltava limpar o banco.

A migration `20260507161547_drop_public_token_tables.sql` estava no repo marcada como `"PREPARED but NOT YET APPLIED"` — a B-8 da auditoria de 10/mai.

## Estado pré-fix descoberto

Inspeção em `information_schema.tables` revelou que **a maioria do trabalho já tinha sido feito** em algum momento:

| Entidade | Estado | Ação necessária |
|---|---|---|
| `quote_approval_tokens` | ⚪ Já dropada | Nenhuma |
| `kit_share_tokens` | ⚪ Já dropada | Nenhuma |
| `public_token_failures` | ⚠️ Existia, 0 rows | **Dropar** |
| Função `submit_quote_response` | ⚪ Já removida | Nenhuma |
| Função `get_quote_token_by_value` | ⚪ Já removida | Nenhuma |
| Trigger `validate_status_fields` | ⚪ Já limpo (Fase B Decision 011) | Nenhuma |
| Função `auto_block_extreme_offenders` | ⚠️ Existia, referência órfã a `public_token_failures` | **Dropar (decisão A)** |
| Função `cleanup_security_logs` | ⚠️ Existia, limpava `public_token_failures` | **Dropar (decisão A)** |

## Investigação pré-drop

Antes de dropar `auto_block_extreme_offenders` (função de segurança/defesa-em-profundidade), verifiquei:

1. **Cron jobs ativos:** zero. `SELECT FROM cron.job WHERE command ILIKE ...` retornou vazio.
2. **Callers no repo:** zero. `code_search auto_block_extreme_offenders|cleanup_security_logs|public_token_failures` retornou vazio.
3. **FKs apontando pra `public_token_failures`:** zero.
4. **Tabela contava algo útil:** 0 rows.

Conclusão: código morto completo. Sem cron e sem caller, a função `auto_block_extreme_offenders` nunca foi executada em prod.

## Decisão

Apresentado ao PO via single-select prompt com 3 opções:

| Opção | Comportamento | Decisão |
|---|---|---|
| **A. Drop TUDO** | Tabela + 2 funções | ✅ **Escolhida** |
| B. Drop só tabela | Reescrever as 2 funções sem `public_token_failures` | Rejeitada |
| C. Não dropar nada | Só documentar | Rejeitada |

Justificativa: as funções nunca foram acionadas e dependiam de uma tabela que vai virar código morto. Se amanhã precisarmos de auto-block, reescrevemos com base em `login_attempts` + `bot_detection_log` (que continuam ativas e populadas) sem dependencia de tabelas extintas.

## Mudanças aplicadas

```sql
BEGIN;

-- 1. Drop funções órfãs
DROP FUNCTION IF EXISTS public.auto_block_extreme_offenders();
DROP FUNCTION IF EXISTS public.cleanup_security_logs();

-- 2. Drop tabela órfã
DROP TABLE IF EXISTS public.public_token_failures CASCADE;

-- 3. Idempotência: as outras 2 já estavam fora, mas reaplicamos com IF EXISTS
DROP TABLE IF EXISTS public.quote_approval_tokens CASCADE;
DROP TABLE IF EXISTS public.kit_share_tokens CASCADE;

COMMIT;
```

## Validação

Após aplicar via MCP `apply_migration`:

| Check | Result |
|---|---|
| `public_token_failures` existe | `false` ✅ |
| `quote_approval_tokens` existe | `false` ✅ |
| `kit_share_tokens` existe | `false` ✅ |
| Função `auto_block_extreme_offenders` existe | `false` ✅ |
| Função `cleanup_security_logs` existe | `false` ✅ |
| Migration registrada | `20260514173516` ✅ |

## Limpeza no repo

A migration anterior `20260507161547_drop_public_token_tables.sql` foi **deletada** do repo pois:
- Estava marcada como "PREPARED but NOT YET APPLIED"
- Esta migration `20260514173516` consolida e finaliza o trabalho dela
- Manter as duas confunde futura leitura do histórico

## Aplicação em prod

Migration aplicada em `doufsxqlfjyuvxuezpln` em **14/mai/2026 17:35 UTC** via MCP `apply_migration`. Versão: `20260514173516`.

ADR 0006 respeitada: nenhum `supabase db push` foi executado.

## Próximos passos

- **Onda 10 (B-2):** auth em sync-quote-bitrix
- **Onda 11 (A2):** E2E baseURL
- **Onda 12 (M3):** npm audit upgrade controlado
- **Onda 13 (B-6):** login rate-limit server-side

Apenas 1 bloqueador BLOQUEADOR-pré-prod resta (B-2). Ondas 11-13 são hardening não-bloqueante.

## Rollback

Não existe rollback simples — teríamos que recriar tabela com schema antigo + duas funções. **Não recomendado.** Se precisarmos de auto-block de IPs no futuro, escreveremos uma versão nova com base nas tabelas atuais.

## Referências

- Auditoria 10/mai: `AUDITORIA-PROFUNDA-PROMOGIFTS-PRE-PROD.md`, seção 2.8 (B-8)
- Decisão original 07/mai: deprecate de rotas públicas
- ADR 0006: migration baseline (apply_migration MCP, não db push)
