# Matriz de cenários de RLS

> Documento canônico dos cenários de Row-Level Security esperados para tabelas críticas do vendedor.
> Use esta matriz para revisar PRs que alterem policies, criar testes e auditar o banco.
>
> Planilha equivalente: [`/mnt/documents/rls-matrix-cenarios.xlsx`](../docs/rls-matrix-cenarios.xlsx)
> Validação automatizada: edge function `rls-integration-tests` (botão **Testar RLS** em `/admin/auditoria-propriedade`).
> Auditoria contínua: RPC `audit_rls_matrix()` + cron `ownership-audit`.

## Convenções

- **ALLOW** ✅ — a operação deve ser permitida pela policy.
- **DENY** ❌ — a operação deve ser rejeitada por RLS.
- ⚠️ marca **lacuna conhecida** (ex.: tabela sem policy admin-bypass).
- 🚨 marca **regra crítica de segurança** que NÃO pode regredir.

### Funções de apoio
| Função | Descrição |
|---|---|
| `auth.uid()` | UUID do usuário autenticado (JWT). |
| `has_role(uid, role)` | Verifica papel em `user_roles` (security definer). |
| `is_admin(uid)` | Atalho para `has_role(uid,'admin') OR has_role(uid,'dev')`. |
| `can_view_all_sales()` | `true` para admin/dev/finance — bypass de `seller_id` em `orders`/`order_items`. |
| `get_user_org_ids(uid)` | Retorna `organization_id`s do supervisor. |

---

## `favorite_lists`

| Op | Role/Ator | Escopo | Esperado | Justificativa |
|---|---|---|---|---|
| SELECT | vendedor (dono)     | próprio          | ALLOW | `Users manage own favorite lists` (`user_id = auth.uid()`) |
| SELECT | vendedor (terceiro) | alheio           | DENY  | Não casa `user_id = auth.uid()` |
| SELECT | admin               | qualquer         | ALLOW | `Admins read all favorite lists` (`is_admin`) |
| SELECT | anon (token)        | compartilhado    | ALLOW | `Public can read shared lists by token` (token válido) |
| SELECT | anon (sem token)    | qualquer         | DENY  | Sem `shared_token` válido |
| INSERT | vendedor            | próprio          | ALLOW | `WITH CHECK user_id = auth.uid()` |
| INSERT | vendedor            | alheio           | DENY  | `WITH CHECK` falha |
| UPDATE | vendedor            | próprio          | ALLOW | `USING + WITH CHECK user_id = auth.uid()` |
| UPDATE | vendedor            | alheio           | DENY  | `USING` falha |
| DELETE | vendedor            | próprio          | ALLOW | `USING user_id = auth.uid()` |
| DELETE | vendedor            | alheio           | DENY  | `USING` falha |

## `collections`

| Op | Role/Ator | Escopo | Esperado | Justificativa |
|---|---|---|---|---|
| SELECT | vendedor (dono)     | próprio          | ALLOW | `Users can manage own collections` |
| SELECT | vendedor (terceiro) | alheio           | DENY  | `user_id ≠ auth.uid()` |
| SELECT | anon (token)        | compartilhado    | ALLOW | `Public can view collection by valid share token` |
| SELECT | admin               | qualquer         | DENY  | ⚠️ Sem policy admin-bypass — admin não enxerga coleções alheias |
| INSERT | vendedor            | próprio          | ALLOW | `WITH CHECK user_id = auth.uid()` |
| INSERT | vendedor            | alheio           | DENY  | `WITH CHECK` falha |
| UPDATE | vendedor            | próprio          | ALLOW | `USING + WITH CHECK` |
| UPDATE | vendedor            | alheio           | DENY  | `USING` falha |
| DELETE | vendedor            | próprio          | ALLOW | `USING user_id = auth.uid()` |
| DELETE | vendedor            | alheio           | DENY  | `USING` falha |

## `custom_kits`

| Op | Role/Ator | Escopo | Esperado | Justificativa |
|---|---|---|---|---|
| SELECT | vendedor (dono)     | próprio  | ALLOW | `Users can manage own kits` (`user_id OR is_admin`) |
| SELECT | vendedor (terceiro) | alheio   | DENY  | `user_id ≠ auth.uid()` e não é admin |
| SELECT | admin               | qualquer | ALLOW | `is_admin(auth.uid())` na própria policy + `Admins can read all kits` |
| INSERT | vendedor            | próprio  | ALLOW | `WITH CHECK user_id = auth.uid()` |
| INSERT | vendedor            | alheio   | DENY  | `WITH CHECK` falha |
| UPDATE | vendedor            | próprio  | ALLOW | `user_id = auth.uid()` |
| UPDATE | vendedor            | alheio   | DENY  | `USING` falha |
| UPDATE | admin               | qualquer | ALLOW | `is_admin(auth.uid())` na cláusula `USING/CHECK` |
| DELETE | vendedor            | próprio  | ALLOW | `user_id = auth.uid()` |
| DELETE | admin               | qualquer | ALLOW | `is_admin(auth.uid())` |

## `magic_up_campaigns`

| Op | Role/Ator | Escopo | Esperado | Justificativa |
|---|---|---|---|---|
| SELECT | vendedor (dono)     | próprio  | ALLOW | `Users can view own Magic Up campaigns` |
| SELECT | vendedor (terceiro) | alheio   | DENY  | `auth.uid() ≠ user_id` |
| SELECT | admin               | qualquer | DENY  | ⚠️ Sem policy admin-bypass |
| INSERT | vendedor            | próprio  | ALLOW | `WITH CHECK auth.uid() = user_id` |
| INSERT | vendedor            | alheio   | DENY  | `WITH CHECK` falha |
| UPDATE | vendedor            | próprio  | ALLOW | `USING + WITH CHECK auth.uid() = user_id` |
| UPDATE | vendedor            | alheio   | DENY  | `USING` falha |
| DELETE | vendedor            | próprio  | ALLOW | `USING auth.uid() = user_id` |
| DELETE | vendedor            | alheio   | DENY  | `USING` falha |

## `orders`

| Op | Role/Ator | Escopo | Esperado | Justificativa |
|---|---|---|---|---|
| SELECT | vendedor (dono)     | próprio   | ALLOW | `seller_id = auth.uid()` |
| SELECT | vendedor (terceiro) | alheio    | DENY  | `seller_id ≠ auth.uid()` e sem `can_view_all_sales` |
| SELECT | supervisor          | mesma org | ALLOW | `has_role(supervisor)` + `organization_id` em `get_user_org_ids` |
| SELECT | supervisor          | outra org | DENY  | `organization_id` fora da org do supervisor |
| SELECT | admin/dev           | qualquer  | ALLOW | `can_view_all_sales() = true` |
| INSERT | vendedor            | próprio   | ALLOW | `WITH CHECK seller_id = auth.uid()` |
| INSERT | vendedor            | alheio    | DENY  | `WITH CHECK` falha |
| UPDATE | vendedor            | próprio   | ALLOW | `USING/CHECK seller_id = auth.uid()` |
| UPDATE | vendedor            | alheio    | DENY  | `USING` falha |
| DELETE | vendedor            | próprio   | ALLOW | `USING seller_id = auth.uid()` |
| DELETE | vendedor            | alheio    | DENY  | `USING` falha |

## `order_items`

| Op | Role/Ator | Escopo | Esperado | Justificativa |
|---|---|---|---|---|
| SELECT | vendedor (dono do pedido) | próprio   | ALLOW | `EXISTS orders WHERE seller_id = auth.uid()` |
| SELECT | vendedor (pedido alheio)  | alheio    | DENY  | `EXISTS` falha |
| SELECT | supervisor                | mesma org | ALLOW | `has_role(supervisor)` + `organization_id` |
| SELECT | admin/dev                 | qualquer  | ALLOW | `can_view_all_sales()` |
| INSERT | vendedor                  | próprio   | ALLOW | `WITH CHECK` liga em `orders.seller_id` |
| INSERT | vendedor                  | alheio    | DENY  | `WITH CHECK` falha |
| UPDATE | vendedor                  | próprio   | ALLOW | `USING + WITH CHECK` |
| DELETE | vendedor                  | próprio   | ALLOW | `USING` liga em `orders.seller_id` |
| DELETE | vendedor                  | alheio    | DENY  | `USING` falha |

## `quotes`

| Op | Role/Ator | Escopo | Esperado | Justificativa |
|---|---|---|---|---|
| SELECT | vendedor (dono)     | próprio | ALLOW | `seller_id = auth.uid()` |
| SELECT | vendedor (terceiro) | alheio  | DENY  | `seller_id ≠ auth.uid()` |
| SELECT | anon (token)        | público | ALLOW | `approval_token` válido (rota pública) |
| INSERT | vendedor            | próprio | ALLOW | `WITH CHECK seller_id = auth.uid()` |
| INSERT | vendedor            | alheio  | DENY  | `WITH CHECK` falha |
| UPDATE | vendedor            | próprio | ALLOW | `USING + WITH CHECK` |
| UPDATE | vendedor            | alheio  | DENY  | `USING` falha |
| DELETE | vendedor            | próprio | ALLOW | `USING seller_id = auth.uid()` |
| DELETE | vendedor            | alheio  | DENY  | `USING` falha |

## `user_roles` (governança)

| Op | Role/Ator | Escopo | Esperado | Justificativa |
|---|---|---|---|---|
| SELECT | qualquer autenticado | próprio  | ALLOW | `user_id = auth.uid()` |
| SELECT | vendedor             | alheio   | DENY  | Sem permissão |
| SELECT | admin/dev            | qualquer | ALLOW | `has_role(admin\|dev)` |
| INSERT | vendedor             | qualquer | DENY  | 🚨 Apenas dev/admin podem conceder roles |
| UPDATE | vendedor             | qualquer | DENY  | 🚨 Apenas dev pode mover roles entre usuários |
| DELETE | vendedor             | qualquer | DENY  | 🚨 Apenas dev pode revogar |

---

## Resumo

| Tabela | Cenários | ALLOW | DENY | Atenção |
|---|---:|---:|---:|---:|
| `collections`        | 10 | 5 | 5 | ⚠️ 1 |
| `custom_kits`        | 10 | 7 | 3 | — |
| `favorite_lists`     | 11 | 6 | 5 | — |
| `magic_up_campaigns` |  9 | 4 | 5 | ⚠️ 1 |
| `order_items`        |  9 | 6 | 3 | — |
| `orders`             | 11 | 6 | 5 | — |
| `quotes`             |  9 | 5 | 4 | — |
| `user_roles`         |  6 | 2 | 4 | 🚨 3 |
| **Total**            | **75** | **41** | **34** | **5** |

## Manutenção

1. **Ao alterar uma policy**: atualize a linha correspondente nesta matriz e na planilha XLSX.
2. **Ao adicionar tabela crítica do vendedor**: inclua-a aqui antes do merge da migration.
3. **Lacunas conhecidas (⚠️)**: as tabelas `collections` e `magic_up_campaigns` hoje **não** permitem que admins enxerguem registros alheios. Se for política do produto, manter; senão, adicionar policy `is_admin(auth.uid())`.
4. **Validação manual** (psql como service role):
   ```sql
   set local role authenticated;
   set local "request.jwt.claims" = '{"sub":"<uuid-do-vendedor>","role":"authenticated"}';
   select * from collections where id = '<row-alheia>'; -- deve retornar 0 linhas
   ```
5. **Validação automatizada**: rodar `rls-integration-tests` antes de cada deploy de migration que toque RLS.
