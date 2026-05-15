# Padrão SECURITY DEFINER + RLS no PromoGifts

**Status:** vigente desde Onda 20 (15/mai/2026)
**Gate:** `scripts/check-security-definer-acl.mjs` + `audit_security_definer_acl()` RPC
**Aplica-se a:** todas as funções `SECURITY DEFINER` em `public`

---

## TL;DR — checklist por padrão

Toda função `SECURITY DEFINER` em `public` cai em uma de 3 categorias. Escolha a categoria correta antes de escrever a migration:

| Categoria | Quando usar | GRANT EXECUTE para |
|---|---|---|
| **A. RLS helper** | Função usada em `pg_policies` (em `qual` ou `with_check`) | `authenticated`, `service_role` |
| **B. RPC backend-only** | Função chamada só por edge function via `service_role` | `service_role` (apenas) |
| **C. Public-intent** | Endpoint público intencional (ex: validação de token de aprovação) | `anon`, `authenticated`, `service_role` + adicionar nome na whitelist de `audit_security_definer_acl()` |

Em **TODOS** os casos, **PUBLIC nunca tem EXECUTE** (revoke default do PostgreSQL).

---

## Por que isso importa

PostgreSQL define duas coisas independentes:

1. **Quem executa a função** (`SECURITY DEFINER` = como owner; `SECURITY INVOKER` = como caller).
2. **Quem pode chamar a função** (grants em `pg_proc.proacl`).

A confusão comum: pensar que `SECURITY DEFINER` dispensa o GRANT do caller. **Não dispensa.** O caller ainda precisa de `EXECUTE` pra invocar. Se uma RLS policy faz `WHERE is_admin_or_above(auth.uid())` e `authenticated` não tem EXECUTE em `is_admin_or_above`, qualquer SELECT/UPDATE/INSERT/DELETE nessa tabela quebra com:

```
ERROR: 42501: permission denied for function is_admin_or_above
```

Esse foi o bug do PR #192 (migration `t38_deploy_hardening_final`): aplicou REVOKE FROM authenticated em 2 funções RLS helper, quebrou 112 policies. Onda 20 corrigiu e adicionou gate bilateral.

---

## Padrão A — RLS helper (mais comum no PromoGifts)

**Exemplos no repo:** `is_admin_or_above`, `is_coord_or_above`, `is_supervisor_or_above`, `has_org_role`, `org_has_any_members`, `can_access_quote`.

**Template canônico:**

```sql
CREATE OR REPLACE FUNCTION public.minha_funcao_rls(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('supervisor', 'dev')
  );
$$;

-- Hardening obrigatório:
REVOKE EXECUTE ON FUNCTION public.minha_funcao_rls(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.minha_funcao_rls(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.minha_funcao_rls(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.minha_funcao_rls(uuid) TO service_role;
```

> O comentário `-- rls-helper:` opcional satisfaz o regex do gate `check-security-definer-hardening.mjs` quando a função não tem REVOKE explícito de anon (caso raro). Prefira o REVOKE explícito.

---

## Padrão B — RPC backend-only

**Exemplos no repo:** funções chamadas só por edge functions via service_role (ex: `revoke_all_user_tokens`).

**Template canônico:**

```sql
CREATE OR REPLACE FUNCTION public.minha_rpc_admin(_arg text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- lógica privilegiada
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.minha_rpc_admin(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.minha_rpc_admin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.minha_rpc_admin(text) FROM authenticated;
-- service_role mantém grant default
```

Não é citada em nenhuma policy. Se for, vira Padrão A.

---

## Padrão C — Public-intent

**Exemplos no repo:** `submit_quote_response`, `get_quote_token_by_value` (validam token público).

**Template canônico:**

```sql
CREATE OR REPLACE FUNCTION public.validate_public_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- valida token, rate-limit interno, etc
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_public_token(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.validate_public_token(text) TO anon;
GRANT  EXECUTE ON FUNCTION public.validate_public_token(text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.validate_public_token(text) TO service_role;
```

**E adicione o nome na whitelist** em `audit_security_definer_acl()`:

```sql
(p.proname IN ('submit_quote_response', 'get_quote_token_by_value', 'validate_public_token')) AS public_intent
```

Sem esse passo, o gate ACL falha mesmo o grant sendo intencional.

---

## O gate `audit_security_definer_acl()` — 4 categorias detectadas

| Caso | Anti-padrão | Mensagem |
|---|---|---|
| 1 | PUBLIC com EXECUTE | `PUBLIC has EXECUTE` |
| 2 | anon com EXECUTE fora da whitelist | `anon has EXECUTE (not in public-intent whitelist)` |
| 3 | trigger function com EXECUTE pra authenticated (sem sentido — triggers são invocadas pelo PG) | `trigger function has EXECUTE for authenticated` |
| 4 | função citada em `pg_policies` sem EXECUTE pra authenticated → RLS quebra com 42501 | `used in RLS policy but missing EXECUTE for authenticated (RLS will fail with 42501)` |

O CI roda o RPC após cada deploy. Qualquer linha retornada → gate falha.

---

## Workflow recomendado pra criar nova função SECURITY DEFINER

1. **Decidir categoria** (A/B/C) antes de escrever.
2. **Copiar template** correspondente acima.
3. **Substituir nome/args/lógica.**
4. **Manter** `SET search_path = public, pg_catalog` (sem isso, search_path injection vira CVE).
5. **Manter** REVOKE FROM PUBLIC e GRANTs explícitos do template.
6. **Se for Padrão C**, atualizar whitelist da função `audit_security_definer_acl()` na mesma migration.
7. **Rodar localmente** (se Supabase CLI disponível): `supabase migration up` → executa também o `RAISE EXCEPTION` da Onda 20 e aborta se houver violação.

---

## Histórico

- **Onda 20 (15/mai/2026, PR #TBD):** gate bilateral. Adiciona Caso 4. Corrige regression do t38 (PR #192) e gap do org_has_any_members.
- **t28 pilot (12/mai/2026, PRs #205-#212):** REVOKE de anon/PUBLIC nas funções admin existentes (257 ocorrências fechadas).
- **Hardening original (27/abr/2026):** criação inicial de `audit_security_definer_acl()` com Casos 1, 2, 3.
