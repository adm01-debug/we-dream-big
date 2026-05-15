# Onda 8 — notification_templates SELECT restrito + encerramento da B-3

**Data:** 14 de maio de 2026  
**PR alvo:** cleanup/onda-8-rls-notification-templates  
**Bloqueador resolvido:** B-3 da auditoria de 10/mai/2026 (encerrado)  
**Tempo de execução:** ~30 minutos  
**Risco:** muito baixo (frontend não consulta a tabela)

## Contexto

A auditoria de 10/mai listou **7 tabelas** com RLS overly-permissive (`USING (true)` ou equivalente):

| Tabela | O que vazava |
|---|---|
| `audit_log` | Logs de toda ação admin |
| `analytics_events` | Comportamento detalhado de usuários |
| `product_views` | Quem viu o quê |
| `search_queries` | O que cada vendedor pesquisou |
| `sync_jobs` | UPDATE permitido sem auth |
| `notification_templates` | ALL permitido sem auth |
| `quote_templates` | Templates de outros vendedores |

## Descoberta crítica: 5 de 7 já consertadas + 1 não existe

Inspeção em `pg_policy` revelou que migrations anteriores **já corrigiram a maioria**:

| Tabela | Policy SELECT atual | Status |
|---|---|---|
| `audit_log` | `is_supervisor_or_above(auth.uid())` | ✅ Já correta |
| `analytics_events` | `user_id = auth.uid() OR is_coord_or_above(auth.uid())` | ✅ Já correta |
| `product_views` | `is_admin(auth.uid()) OR seller_id = auth.uid()` | ✅ Já correta |
| `search_queries` | `user_id = auth.uid() OR is_coord_or_above(auth.uid())` | ✅ Já correta |
| `quote_templates` | `auth.uid() = created_by` (tudo) | ✅ Já correta |
| `sync_jobs` | Tabela não existe mais | ⚪ N/A (dropada) |
| `notification_templates` | `auth.role() = 'authenticated'` | ⚠️ **Esta Onda corrige** |

Migrations que já tinham consertado as outras 6:
- `20260512211025_t21_fix_rls_always_true_policies`
- `20260512221328_t30_fix_initplan_remaining`
- `20260512212708_t25b_material_groups_rls`

## A única tabela restante: `notification_templates`

### Estado antes do fix

```sql
-- Policy SELECT permitia QUALQUER authenticated:
CREATE POLICY notification_templates_select
ON public.notification_templates FOR SELECT
USING (auth.role() = 'authenticated');

-- Escrita já estava fail-closed:
CREATE POLICY notification_templates_insert ... USING (false);
CREATE POLICY notification_templates_update ... USING (false);
CREATE POLICY notification_templates_delete ... USING (false);
```

### Conteúdo da tabela

7 templates de sistema (sem coluna `user_id` ou `owner`):
- `quote_approved` — Orçamento Aprovado
- `new_order` — Novo Pedido
- `mockup_ready` — Mockup Pronto
- (mais 4 templates)

Colunas: `id, code, name, subject, body_template, variables, is_active, created_at, updated_at`.

### Investigação de uso real

`code_search` no repo retornou:
- **`src/` (frontend): zero referências** 
- `supabase/functions/_shared/external-db-config.ts:126` — config, não query
- `docs/`, `recovery/`, migrations antigas

**Conclusão:** o frontend cliente nunca consulta `notification_templates`. A tabela é lida apenas por edge functions que usam `service_role` (bypass automático de RLS).

### Fix aplicado

```diff
-CREATE POLICY notification_templates_select
-ON public.notification_templates FOR SELECT
-USING (auth.role() = 'authenticated');
+CREATE POLICY notification_templates_select
+ON public.notification_templates FOR SELECT
+TO authenticated
+USING (is_supervisor_or_above((SELECT auth.uid())));
```

## Comportamento antes/depois

| Quem | Antes | Depois |
|---|---|---|
| `vendedor` (5 usuários) | ✅ Lia todos os 7 templates | ❌ Bloqueado |
| `admin` (2 usuários) | ✅ Lia | ✅ Continua lendo |
| `dev` (1 usuário) | ✅ Lia | ✅ Continua lendo |
| `supervisor` (futuro) | ✅ Lia | ✅ Continua lendo |
| Edge functions (service_role) | ✅ Lia (bypass) | ✅ Continua lendo (bypass) |

## Por que não fui mais agressivo

Opções consideradas:

| Opção | Comportamento | Decisão |
|---|---|---|
| A. `USING (false)` para todos | Ninguém via API client lê | Rejeitada — bloqueia futuras telas admin sem reabrir RLS |
| B. `is_supervisor_or_above` ✅ | Roles elevadas leem; demais bloqueados | **Escolhida** |
| C. Manter `auth.role()='authenticated'` | Status quo | Rejeitada — frontend não usa, não vale o risco |

Opção B preserva flexibilidade: se amanhã o frontend ganhar uma tela admin de "gerenciar templates de notificação", admin/dev já têm acesso sem precisar mexer no RLS de novo.

## Aplicação em prod

Migration aplicada em `doufsxqlfjyuvxuezpln` em **14/mai/2026 17:09 UTC** via MCP `apply_migration`. Versão: `20260514170928`.

ADR 0006 respeitada: nenhum `supabase db push` foi executado.

## Validação empírica

1. ✅ `SELECT polqual` em `pg_policy` retorna `is_supervisor_or_above((SELECT auth.uid()))`
2. ✅ Comment registrado: "Onda 8 (B-3): apenas supervisor_or_above..."
3. ✅ Outras 3 policies (INSERT/UPDATE/DELETE) intactas com `USING false`
4. ✅ `code_search` confirma que `src/` (frontend) não consulta a tabela

## Encerramento da B-3

Com esta Onda, **todas as 7 tabelas listadas em B-3 estão tratadas**. Bloqueador removido.

## Próximos passos

- **Onda 9 (B-8):** drop_public_token_tables (tabelas órfãs do schema público)
- **Onda 10 (B-2):** auth em sync-quote-bitrix
- **Onda 11 (A2):** E2E baseURL
- **Onda 12 (M3):** npm audit upgrade controlado
- **Onda 13 (B-6):** login rate-limit server-side

## Rollback

Reverter via:
```sql
DROP POLICY notification_templates_select ON public.notification_templates;
CREATE POLICY notification_templates_select
ON public.notification_templates FOR SELECT
USING (auth.role() = 'authenticated');
```

Não recomendado — reabre B-3.
