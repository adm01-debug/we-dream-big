# Redeploy 2026-05 Fase 1 — Sincronização repo↔DB de migrations órfãs

**Contexto:** auditoria do redeploy Fase 1 (T13–T17, 12/05/2026) descobriu 8 migrations aplicadas no banco de produção `doufsxqlfjyuvxuezpln` via MCP `apply_migration` que **não tinham `.sql` versionado no repo**. Esta PR sincroniza 6 das 8 e documenta os 2 gaps que exigem decisão humana.

Reduz desync chronic flagado pela PR #154 ("supabase/migrations and prod db are 100% desync").

## Sincronizadas nesta PR (6)

| Version | Nome | Origem do SQL |
|---|---|---|
| `20260511200038` | `create_painel_cotacoes_schema` | Cópia fiel de `schema_migrations.statements[1]` |
| `20260512163615` | `onda3_tracking_e_nf` | Idem |
| `20260512163629` | `onda3_storage_recibos` | Idem ⚠️ flagado bucket público |
| `20260512164738` | `onda3_simplifica_nf_e_retry` | Idem |
| `20260512201500` | `t15_fix_system_health_dashboard_exposure` | Cópia fiel (statements[1..3]) |
| `20260512201600` | `t16_move_backup_tables_to_schema_backup` | **Reconstruído** — `schema_migrations` só tinha summary; lista das 17 tabelas vem de `pg_tables WHERE schemaname='backup'` |

## NÃO sincronizadas nesta PR (2) — gaps abertos

### Gap A — `20260511200056_create_painel_users` (segurança)

A migration cria 4 usuários do painel de cotação com senha default `Promo@2026!` em plaintext. **O repo é público**; commitar verbatim expõe a senha publicamente (mesmo que os usuários já tenham trocado no 1º login).

**Decisão necessária do sponsor**: uma de três opções:

1. **Confirmar que todos os 4 usuários trocaram a senha em prod** + commitar a migration verbatim (passa a ser histórico, não credencial ativa).
2. **Rotacionar a senha em prod** via UI / SQL direto e DEPOIS commitar a migration com a senha rotacionada placeholder (`__SET_VIA_VAULT__`).
3. **Não commitar nunca** — a migration vira "snapshot operacional do dia X" e fica documentada apenas neste arquivo.

Os 4 usuários afetados:
- `joaquim@promobrindes.com.br` (admin)
- `tiago@promobrindes.com.br` (cotacao)
- `marcus@promobrindes.com.br` (cotacao)
- `gabryelly@promobrindes.com.br` (cotacao)

### Gap B — `20260512201700_t17_fix_function_search_path_mutable_22_funcs` (reconstrução impossível com info disponível)

A entrada em `schema_migrations.statements` é apenas o summary `"ALTER FUNCTION ... SET search_path (22 funcoes)"` — não SQL válido. Para reconstruir precisaríamos do **resultado do advisor `function_search_path_mutable` no instante anterior à aplicação** (lista das 22 funções específicas que estavam mutáveis).

Estado atual: 731 funções em `public` têm `search_path` setado (a maioria via migration `20260423123503_fix_all_functions_search_path_safe`). Não é possível distinguir quais 22 foram tocadas pela T17 sem o histórico do advisor.

**Decisão necessária do sponsor**: uma de três opções:

1. **Aceitar o gap** — a função está corrigida em prod, o advisor está zerado, e o `db reset` continuaria zerando o mesmo advisor (porque migrations anteriores já cobriam quase tudo). Documentar e seguir.
2. **Reproduzir a partir de logs** — se houver `pg_stat_statements` ou audit log que contenha os ALTER FUNCTIONs executados em `2026-05-12 20:17 UTC`, extrair daí.
3. **Re-executar a auditoria manual** — listar todas as SECURITY DEFINER em `public` sem `search_path` no estado HISTÓRICO (pré-T17) via `pg_dump` antigo, se existir.

## Verificação local (DoD desta PR)

- [x] `supabase/migrations/` ganha 6 arquivos
- [x] Cada arquivo tem cabeçalho explicando origem do SQL (cópia fiel / reconstrução)
- [x] Migrations idempotentes (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`)
- [x] Lista de 17 backup tables em T16 batida contra `pg_tables`
- [x] Sem regressão de lint (baseline gate)
- [x] Sem segredos em plaintext (gitleaks limpo)

## Comportamento esperado pós-merge

- **`supabase db reset` (dev)** vai rodar TODAS as migrations em ordem cronológica. T15 + T16 vão re-fixar o que já estava fixo (idempotente). Os GAP A + B ficam ausentes:
  - **Sem Gap A**: dev environment não terá os 4 usuários do painel — esperado, devem ser criados via seeds dedicados se necessário.
  - **Sem Gap B**: dev environment pode ter 0–22 funções com `search_path` mutável (depende de quantas das 22 já estão cobertas pelas migrations anteriores). Advisor pode acender 0–22 warnings no dev — aceitável.
- **Produção**: nada muda — todas as migrations já estão aplicadas. `schema_migrations` continua com os summaries broken para T16/T17, mas os arquivos no repo agora têm o SQL real para o caso de rebuild.
