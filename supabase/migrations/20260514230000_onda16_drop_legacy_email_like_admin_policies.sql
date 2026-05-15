-- ============================================================================
-- Onda 16 — Drop legacy "email LIKE '%admin%'" RLS policies
-- ============================================================================
--
-- Auditoria pre-prod (10/mai/2026) item 3.4 apontou policies em storage.objects
-- e file_scan_logs que identificavam admin via:
--
--   USING (auth.jwt() ->> 'email' LIKE '%admin%')
--
-- Este padrao eh fragil porque:
--  1. Qualquer email contendo "admin" passa (admin.silva@..., usuario.administrativo@...)
--  2. Email eh identidade humana; role eh permissao. Misturar eh footgun.
--  3. Vendedor financeiro com email "admin@..." (cargo administrativo) consegue
--     ler bucket de quarentena e logs de scan.
--
-- Em PROD essas policies JA foram dropadas e substituidas (via migration
-- 20260513040959_fix_quarantine_storage_policy, aplicada fora-do-repo, mais
-- correcoes adicionais em file_scan_logs). As policies atuais usam:
--
--   is_supervisor_or_above(auth.uid())  -- para storage quarantine
--   is_admin_or_above(auth.uid())       -- para file_scan_logs
--
-- Esta migration eh IDEMPOTENTE e serve para:
--  (a) Fechar o gap entre PROD e o repo
--  (b) Garantir que se alguem rodar `supabase db reset`, as policies fragis
--      criadas pelas migrations antigas (20260427212820/213016/213832/213920)
--      sejam removidas.
--
-- IMPORTANTE: NAO recriamos policies aqui — em PROD ja existem as novas
-- (quarantine_select_admin_or_service, quarantine_delete_admin,
-- quarantine_insert_service, "Users read own file_scan_logs"). Se rodar
-- em banco recriado do zero, as migrations 20260513040959 e correlatas
-- precisam ser sincronizadas tambem em PR futura.
--
-- Ref: docs/AUDITORIA-PROFUNDA-PROMOGIFTS-PRE-PROD.md (item 3.4)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- storage.objects — policies frageis criadas em 27/abr/2026
-- ----------------------------------------------------------------------------

-- 20260427212820_*: "Acesso restrito ao bucket de quarentena"
DROP POLICY IF EXISTS "Acesso restrito ao bucket de quarentena" ON storage.objects;

-- 20260427213832_* e 20260427213920_*: "Admins podem visualizar quarentena"
-- (criada/recriada duas vezes com email LIKE '%admin%')
DROP POLICY IF EXISTS "Admins podem visualizar quarentena" ON storage.objects;

-- 20260427213832_* e 20260427213920_*: "Sistema pode gerenciar quarentena"
-- (esta nao tem email LIKE, mas estava acoplada — drop tambem para
--  consistencia, ja que em PROD foi substituida por quarantine_*_service)
DROP POLICY IF EXISTS "Sistema pode gerenciar quarentena" ON storage.objects;

-- ----------------------------------------------------------------------------
-- public.file_scan_logs — policy fragil criada em 27/abr/2026
-- ----------------------------------------------------------------------------

-- 20260427213016_*: "Apenas administradores podem visualizar logs de scan"
-- (em PROD foi substituida por "Users read own file_scan_logs" com
--  is_admin_or_above + ownership check)
DROP POLICY IF EXISTS "Apenas administradores podem visualizar logs de scan"
  ON public.file_scan_logs;

COMMIT;

-- ============================================================================
-- Notas de validacao (executar APOS aplicar):
--
--   SELECT policyname, qual FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects'
--     AND policyname IN ('Acesso restrito ao bucket de quarentena',
--                        'Admins podem visualizar quarentena',
--                        'Sistema pode gerenciar quarentena');
--   -- Esperado: 0 linhas
--
--   SELECT policyname, qual FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'file_scan_logs'
--     AND policyname = 'Apenas administradores podem visualizar logs de scan';
--   -- Esperado: 0 linhas
-- ============================================================================
