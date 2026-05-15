# Helpers semânticos de RBAC (RLS)

Toda nova policy deve usar uma das funções abaixo em vez de `has_role(...,'admin')`
ou checagens diretas de papel. Elas são a **fonte única de verdade** para acesso
a áreas administrativas e isolam policies de mudanças no enum `app_role`.

## Funções disponíveis

| Função (SQL)                       | Quem passa                                 | Uso típico                                                              |
|------------------------------------|--------------------------------------------|-------------------------------------------------------------------------|
| `is_dev(uid)`                      | dev                                        | Ações exclusivamente do desenvolvedor (chaves MCP, promover supervisor) |
| `is_supervisor_or_above(uid)`      | dev, supervisor, admin*, manager*          | Aprovações, edição de catálogo, gestão geral                            |
| `is_admin(uid)`                    | **alias** de `is_supervisor_or_above`      | Mantido por compatibilidade — prefira o nome novo                       |
| `can_view_audit_logs(uid)`         | dev                                        | Leitura de `admin_audit_log`                                            |
| `can_view_telemetry(uid)`          | dev, supervisor, admin*, manager*          | Logs de IA, quotas, detecção de bots                                    |
| `can_view_connections(uid)`        | dev, supervisor, admin*, manager*          | Credenciais de integração, webhooks, IP allowlist                        |
| `can_manage_connections(uid)`      | dev, supervisor, admin*, manager*          | Criar/alterar/excluir credenciais, webhooks, IP allowlist                |

\* legado — papéis serão removidos do enum em onda futura.

## Regras

1. **Nunca** escreva `has_role(auth.uid(), 'admin')` em uma nova policy. Use o
   helper semântico que melhor descreve a intenção.
2. Se nenhum helper se encaixa, **crie um** seguindo o padrão (STABLE, SECURITY
   DEFINER, `search_path=public`, GRANT EXECUTE TO authenticated, anon).
3. O helper deve ser um wrapper fino sobre `is_dev` ou `is_supervisor_or_above`
   — não checar papel literal.
4. Adicione o novo gate à matriz em
   `tests/rls/telemetry-logs-connections-access.test.ts` (ou ao teste apropriado)
   para garantir cobertura.

## Exemplo de uso em policy

```sql
-- ✅ correto
CREATE POLICY "Telemetria — leitura por supervisor+"
  ON public.minha_tabela FOR SELECT
  USING (public.can_view_telemetry(auth.uid()));

-- ❌ proibido
CREATE POLICY "Admins podem ler"
  ON public.minha_tabela FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
```
