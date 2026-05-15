# 🔧 Post-merge fix — `auth_login_attempts` policies

**Data:** 2026-05-11 (após merge do PR #143)
**Detectado por:** Supabase Security Advisor (`rls_enabled_no_policy`)
**Severidade:** INFO (mas operacionalmente bloqueante)

## Problema

A tabela `public.auth_login_attempts` (criada no D.2.1) ficou com **RLS habilitado mas sem policies** — efeito prático: ninguém conseguia ler ou escrever (exceto `service_role` que bypassa RLS).

O dump Lovable original tinha policies para essa tabela, mas elas não foram extraídas no patch.sql do D.2.1 (extrator regex não pegou).

## Fix aplicado direto em PROD

```sql
-- Admins veem tudo (auditoria)
CREATE POLICY "Admins can view auth login attempts"
  ON public.auth_login_attempts
  FOR SELECT TO authenticated
  USING (is_admin_or_above(auth.uid()));

-- Service role insere (Edge Function de auth)
CREATE POLICY "Service role can insert auth login attempts"
  ON public.auth_login_attempts
  FOR INSERT TO service_role
  WITH CHECK (true);
```

Padrão idêntico ao usado em `audit_logs` (mesma natureza: logs de segurança).

## Resultado
- ✅ Advisory `rls_enabled_no_policy` fechado para essa tabela
- ✅ Admins podem fazer SELECT (auditoria)
- ✅ Service role pode INSERT (Edge Functions de auth)
- ✅ Frontend (authenticated) tem acesso apenas leitura, e apenas se for admin

## Rollback (se necessário)

```sql
DROP POLICY IF EXISTS "Admins can view auth login attempts" ON public.auth_login_attempts;
DROP POLICY IF EXISTS "Service role can insert auth login attempts" ON public.auth_login_attempts;
```
