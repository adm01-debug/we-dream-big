-- Drop user_passkeys table — Passkey/WebAuthn login removido do sistema.
-- Sistema é restrito a colaboradores e usa apenas email/senha + Google SSO.
-- Esta migration foi criada quando o feature foi removido do código,
-- mas só será aplicada quando o time tiver acesso ao banco em produção
-- (Supabase do Lovable, ou após migração pra Supabase próprio).
DROP TABLE IF EXISTS public.user_passkeys CASCADE;
