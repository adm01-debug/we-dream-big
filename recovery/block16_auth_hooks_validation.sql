-- =====================================================================
-- Bloco 16b — Validação de Auth Hooks customizados
-- =====================================================================
-- Complementa block16_auth_hooks.md. Roda SELECTs read-only para conferir
-- se as tabelas, RPCs e triggers que sustentam os auth hooks "aplicacionais"
-- (verify-email, step-up-verify, force-global-logout, detect-new-device,
-- log-login-attempt) existem e estão funcionais no banco atual.
--
-- Uso:
--   psql "$DATABASE_URL" -f supabase-export/block16_auth_hooks_validation.sql
-- ou cole bloco a bloco no SQL Editor.
--
-- Convenção: cada seção retorna um "status" ('OK' | 'MISSING' | 'WARN')
-- na 1ª coluna para facilitar diff entre ambientes.
-- =====================================================================

\echo '============================================================'
\echo '1) TABELAS esperadas pelos auth hooks'
\echo '============================================================'

WITH expected(table_name) AS (
  VALUES
    ('login_attempts'),
    ('user_known_devices'),
    ('admin_audit_log'),
    ('step_up_challenges'),
    ('step_up_tokens'),
    ('user_roles'),
    ('mcp_keys'),
    ('mcp_key_auto_revocations')
)
SELECT
  CASE WHEN t.tablename IS NULL THEN 'MISSING' ELSE 'OK' END AS status,
  e.table_name,
  t.schemaname,
  pg_size_pretty(pg_total_relation_size(format('public.%I', e.table_name)::regclass)) AS size,
  CASE WHEN c.relrowsecurity THEN 'on' ELSE 'off' END AS rls
FROM expected e
LEFT JOIN pg_tables t
  ON t.schemaname = 'public' AND t.tablename = e.table_name
LEFT JOIN pg_class c
  ON c.relname = e.table_name AND c.relnamespace = 'public'::regnamespace
ORDER BY status DESC, e.table_name;

\echo ''
\echo '============================================================'
\echo '2) Contagens rápidas (sanidade)'
\echo '============================================================'

SELECT 'login_attempts'        AS tabela, count(*) AS rows, max(created_at) AS last_event FROM public.login_attempts
UNION ALL
SELECT 'user_known_devices',     count(*), max(last_seen_at)               FROM public.user_known_devices
UNION ALL
SELECT 'admin_audit_log',        count(*), max(created_at)                  FROM public.admin_audit_log
UNION ALL
SELECT 'step_up_challenges',     count(*), max(created_at)                  FROM public.step_up_challenges
UNION ALL
SELECT 'step_up_tokens',         count(*), max(issued_at)                   FROM public.step_up_tokens
UNION ALL
SELECT 'user_roles',             count(*), NULL::timestamptz                FROM public.user_roles
UNION ALL
SELECT 'mcp_keys',               count(*), max(created_at)                  FROM public.mcp_keys
UNION ALL
SELECT 'mcp_key_auto_revocations', count(*), max(revoked_at)                FROM public.mcp_key_auto_revocations;

\echo ''
\echo '============================================================'
\echo '3) RPCs (SECURITY DEFINER) esperadas'
\echo '============================================================'

WITH expected(proname) AS (
  VALUES
    ('start_step_up_challenge'),
    ('verify_step_up_password'),
    ('verify_step_up_otp'),
    ('consume_step_up_token'),
    ('has_role'),
    ('auto_revoke_orphan_full_keys'),
    ('audit_security_definer_acl')
)
SELECT
  CASE WHEN p.oid IS NULL THEN 'MISSING' ELSE 'OK' END AS status,
  e.proname,
  CASE WHEN p.prosecdef THEN 'definer' ELSE 'invoker' END AS security,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_function_result(p.oid) AS returns,
  COALESCE(
    (SELECT string_agg(unnest, ', ')
       FROM unnest(p.proacl::text[])
      WHERE unnest LIKE '%=X%'),
    '(default)'
  ) AS execute_grants
FROM expected e
LEFT JOIN pg_proc p
  ON p.proname = e.proname AND p.pronamespace = 'public'::regnamespace
ORDER BY status DESC, e.proname;

\echo ''
\echo '============================================================'
\echo '4) ACL hardening: nenhuma RPC sensível pode ser EXECUTE-able por anon'
\echo '============================================================'

SELECT
  'WARN' AS status,
  p.proname,
  array_to_string(p.proacl::text[], ' | ') AS acl
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN (
    'start_step_up_challenge','verify_step_up_password','verify_step_up_otp',
    'consume_step_up_token','auto_revoke_orphan_full_keys'
  )
  AND (
    p.proacl::text LIKE '%anon=X%'
    OR p.proacl::text LIKE '%PUBLIC=X%'
    OR p.proacl IS NULL  -- default = PUBLIC EXECUTE
  );

\echo ''
\echo '============================================================'
\echo '5) TRIGGERS esperados'
\echo '============================================================'

WITH expected(table_name, trigger_name) AS (
  VALUES
    ('user_roles', 'trg_auto_revoke_orphan_full_keys'),
    ('mcp_keys',   'trg_block_direct_mcp_key_update'),
    ('admin_audit_log', NULL)  -- só queremos ver se algum trigger existe
)
SELECT
  CASE WHEN tg.tgname IS NULL AND e.trigger_name IS NOT NULL THEN 'MISSING'
       WHEN tg.tgname IS NULL THEN 'INFO'
       ELSE 'OK' END AS status,
  e.table_name,
  COALESCE(tg.tgname, e.trigger_name, '(none)') AS trigger,
  CASE WHEN tg.tgenabled = 'O' THEN 'enabled'
       WHEN tg.tgenabled = 'D' THEN 'DISABLED'
       ELSE COALESCE(tg.tgenabled::text, '-') END AS enabled,
  pg_get_triggerdef(tg.oid) AS definition
FROM expected e
LEFT JOIN pg_trigger tg
  ON tg.tgrelid = format('public.%I', e.table_name)::regclass
 AND (e.trigger_name IS NULL OR tg.tgname = e.trigger_name)
 AND NOT tg.tgisinternal
ORDER BY status DESC, e.table_name, trigger;

\echo ''
\echo '============================================================'
\echo '6) Smoke test: has_role() funcional'
\echo '============================================================'

-- Não deve retornar erro. NULL é resposta válida (= "não tem role").
SELECT
  CASE WHEN public.has_role('00000000-0000-0000-0000-000000000000'::uuid, 'admin') IS NOT NULL
       THEN 'OK' ELSE 'OK' END AS status,
  public.has_role('00000000-0000-0000-0000-000000000000'::uuid, 'admin') AS sample_result;

\echo ''
\echo '============================================================'
\echo '7) Index health — colunas críticas para auth hooks'
\echo '============================================================'

WITH expected(table_name, column_name) AS (
  VALUES
    ('login_attempts',     'email'),
    ('login_attempts',     'ip_address'),
    ('login_attempts',     'created_at'),
    ('user_known_devices', 'user_id'),
    ('user_known_devices', 'fingerprint'),
    ('step_up_tokens',     'token_hash'),
    ('step_up_tokens',     'expires_at'),
    ('step_up_challenges', 'user_id'),
    ('step_up_challenges', 'expires_at'),
    ('user_roles',         'user_id'),
    ('admin_audit_log',    'user_id'),
    ('admin_audit_log',    'created_at')
)
SELECT
  CASE WHEN i.indexrelid IS NULL THEN 'MISSING' ELSE 'OK' END AS status,
  e.table_name,
  e.column_name,
  COALESCE(c.relname, '-') AS index_name
FROM expected e
LEFT JOIN pg_attribute a
  ON a.attrelid = format('public.%I', e.table_name)::regclass
 AND a.attname = e.column_name
LEFT JOIN pg_index i
  ON i.indrelid = a.attrelid
 AND a.attnum = ANY(i.indkey)
LEFT JOIN pg_class c
  ON c.oid = i.indexrelid
ORDER BY status DESC, e.table_name, e.column_name;

\echo ''
\echo '============================================================'
\echo '8) RLS policies — confere que as tabelas auth-related têm policies'
\echo '============================================================'

SELECT
  CASE WHEN count(p.policyname) = 0 THEN 'MISSING' ELSE 'OK' END AS status,
  t.tablename,
  count(p.policyname) AS policies,
  string_agg(p.policyname, ', ' ORDER BY p.policyname) AS policy_list
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'login_attempts','user_known_devices','admin_audit_log',
    'step_up_challenges','step_up_tokens','user_roles',
    'mcp_keys','mcp_key_auto_revocations'
  )
GROUP BY t.tablename
ORDER BY status DESC, t.tablename;

\echo ''
\echo '============================================================'
\echo '9) Higiene: challenges/tokens expirados não-purgados'
\echo '============================================================'

SELECT 'step_up_challenges' AS tabela,
       count(*) FILTER (WHERE expires_at < now()) AS expired,
       count(*) FILTER (WHERE expires_at >= now()) AS active
FROM public.step_up_challenges
UNION ALL
SELECT 'step_up_tokens',
       count(*) FILTER (WHERE expires_at < now()),
       count(*) FILTER (WHERE expires_at >= now())
FROM public.step_up_tokens;

\echo ''
\echo '============================================================'
\echo '10) auth.users — confere que email confirmation está ativa'
\echo '============================================================'
-- Requer service_role/owner. Em sandbox de cliente pode falhar com permission denied.

SELECT
  count(*) FILTER (WHERE email_confirmed_at IS NOT NULL) AS confirmed,
  count(*) FILTER (WHERE email_confirmed_at IS NULL)     AS pending,
  count(*) AS total
FROM auth.users;

\echo ''
\echo '✅ Validação concluída. Procure por linhas com status MISSING/WARN acima.'

\echo ''
\echo '============================================================'
\echo '11) RLS — cobertura de policies por comando (auth-related)'
\echo '============================================================'
-- Para cada tabela "auth-related", verifica se existe policy explícita
-- cobrindo SELECT/INSERT/UPDATE/DELETE. Status:
--   OK      = comando coberto por policy específica OU por policy ALL
--   MISSING = nenhuma policy cobre esse comando (default deny — pode ser intencional)
--   WARN    = RLS desabilitada na tabela (acesso liberado p/ qualquer um)
--   FAIL    = tabela não existe

WITH expected(table_name) AS (
  VALUES
    ('login_attempts'),
    ('user_known_devices'),
    ('admin_audit_log'),
    ('step_up_challenges'),
    ('step_up_tokens'),
    ('user_roles'),
    ('mcp_keys'),
    ('mcp_key_auto_revocations')
),
cmds(cmd) AS (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE')),
matrix AS (
  SELECT e.table_name, c.cmd FROM expected e CROSS JOIN cmds c
),
pol AS (
  SELECT tablename, cmd FROM pg_policies p
  CROSS JOIN LATERAL (
    SELECT CASE WHEN p.cmd='ALL' THEN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE'])
                ELSE p.cmd END AS cmd
  ) x
  WHERE p.schemaname='public'
),
rls AS (
  SELECT c.relname AS tablename, c.relrowsecurity AS rls_on
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public'
)
SELECT
  CASE
    WHEN r.tablename IS NULL                    THEN 'FAIL'
    WHEN r.rls_on IS NOT TRUE                   THEN 'WARN'
    WHEN p.tablename IS NOT NULL                THEN 'OK'
    ELSE 'MISSING'
  END AS status,
  m.table_name || ':' || m.cmd AS check,
  COALESCE(r.rls_on::text,'—') AS rls,
  CASE WHEN p.tablename IS NULL THEN 'no policy' ELSE 'covered' END AS detail
FROM matrix m
LEFT JOIN rls r  ON r.tablename = m.table_name
LEFT JOIN pol p  ON p.tablename = m.table_name AND p.cmd = m.cmd
ORDER BY m.table_name, m.cmd;

\echo ''
\echo '============================================================'
\echo '12) RLS — bloqueio de acesso anônimo (role anon NÃO deve ler)'
\echo '============================================================'
-- Lista, por tabela auth-related, todas as policies que aceitam o role
-- 'anon' OU 'public' (ou seja: rodam para usuários NÃO autenticados).
-- Em tabelas de auditoria/segurança o esperado é que NÃO existam policies
-- assim — qualquer linha = ALERTA de exposição anônima.
--   OK      = nenhuma policy expõe a tabela ao anon
--   FAIL    = existe ≥1 policy concedendo acesso ao anon/public

WITH expected(table_name) AS (
  VALUES
    ('login_attempts'),
    ('user_known_devices'),
    ('admin_audit_log'),
    ('step_up_challenges'),
    ('step_up_tokens'),
    ('user_roles'),
    ('mcp_keys'),
    ('mcp_key_auto_revocations')
),
anon_pol AS (
  SELECT
    p.tablename,
    p.policyname,
    p.cmd,
    p.roles,
    p.qual,
    p.with_check
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND (
         'anon'   = ANY (p.roles)
      OR 'public' = ANY (p.roles)
      OR p.roles IS NULL  -- policies sem TO explícito = todos os roles
    )
)
SELECT
  CASE WHEN a.tablename IS NULL THEN 'OK' ELSE 'FAIL' END AS status,
  e.table_name,
  COALESCE(a.policyname, '—')        AS exposing_policy,
  COALESCE(a.cmd, '—')               AS cmd,
  COALESCE(a.roles::text, '—')       AS roles,
  COALESCE(left(a.qual, 80), '—')    AS using_clause,
  COALESCE(left(a.with_check, 80),'—') AS with_check
FROM expected e
LEFT JOIN anon_pol a ON a.tablename = e.table_name
ORDER BY status DESC, e.table_name;

\echo ''
\echo '============================================================'
\echo '13) RLS — policies suspeitas (USING true / sem qualificador)'
\echo '============================================================'
-- Detecta policies cuja cláusula USING é literal "true" OU NULL (= sem
-- restrição), mesmo que estejam restritas a authenticated. Em tabelas
-- de segurança isso geralmente é um bug.
--   OK   = todas as policies da tabela têm USING significativo
--   WARN = ao menos uma policy tem USING=true ou USING ausente

WITH expected(table_name) AS (
  VALUES
    ('login_attempts'),('user_known_devices'),('admin_audit_log'),
    ('step_up_challenges'),('step_up_tokens'),
    ('user_roles'),('mcp_keys'),('mcp_key_auto_revocations')
),
susp AS (
  SELECT p.tablename, p.policyname, p.cmd, p.roles::text AS roles, p.qual
  FROM pg_policies p
  WHERE p.schemaname='public'
    AND (p.qual IS NULL OR btrim(p.qual) IN ('true','(true)'))
    AND p.cmd IN ('SELECT','UPDATE','DELETE','ALL')  -- INSERT usa with_check
)
SELECT
  CASE WHEN s.tablename IS NULL THEN 'OK' ELSE 'WARN' END AS status,
  e.table_name,
  COALESCE(s.policyname,'—') AS suspicious_policy,
  COALESCE(s.cmd,'—')        AS cmd,
  COALESCE(s.roles,'—')      AS roles,
  COALESCE(s.qual,'—')       AS using_clause
FROM expected e
LEFT JOIN susp s ON s.tablename = e.table_name
ORDER BY status DESC, e.table_name;

\echo ''
\echo '============================================================'
\echo '14) RLS — teste runtime: SET ROLE anon e tente SELECT'
\echo '============================================================'
-- Prova final: assume role 'anon' (sem JWT) e tenta ler 1 linha de cada
-- tabela auth-related. O esperado é "permission denied" OU 0 linhas em
-- TODAS. Se algum SELECT retornar linha, há vazamento real.
-- Requer privilégio para SET ROLE — pule no SQL Editor se não tiver.
--
-- Saída: status por tabela.
--   OK   = 0 linhas visíveis ao anon
--   FAIL = ≥1 linha visível ao anon (vazamento)
--   SKIP = sem privilégio para SET ROLE / extensão ausente

DO $rls_test$
DECLARE
  t text;
  n bigint;
  rec record;
  tables text[] := ARRAY[
    'login_attempts','user_known_devices','admin_audit_log',
    'step_up_challenges','step_up_tokens',
    'user_roles','mcp_keys','mcp_key_auto_revocations'
  ];
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _rls_runtime_test(
    status text, table_name text, visible_rows bigint, note text
  ) ON COMMIT DROP;
  TRUNCATE _rls_runtime_test;

  BEGIN
    SET LOCAL ROLE anon;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rls_runtime_test VALUES
      ('SKIP','*',NULL,'cannot SET ROLE anon: '||SQLERRM);
    RETURN;
  END;

  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      INSERT INTO _rls_runtime_test
        VALUES (CASE WHEN n=0 THEN 'OK' ELSE 'FAIL' END, t, n,
                CASE WHEN n=0 THEN 'anon sees no rows' ELSE 'LEAK: anon sees rows' END);
    EXCEPTION
      WHEN insufficient_privilege THEN
        INSERT INTO _rls_runtime_test VALUES ('OK', t, 0, 'permission denied (expected)');
      WHEN undefined_table THEN
        INSERT INTO _rls_runtime_test VALUES ('FAIL', t, NULL, 'table missing');
      WHEN OTHERS THEN
        INSERT INTO _rls_runtime_test VALUES ('SKIP', t, NULL, SQLERRM);
    END;
  END LOOP;

  RESET ROLE;
END
$rls_test$;

SELECT status, table_name, visible_rows, note
FROM _rls_runtime_test
ORDER BY (status='FAIL') DESC, table_name;

\echo ''
\echo '✅ Validação RLS concluída.'
\echo '   - Seção 11: cada tabela deve ter SELECT/INSERT/UPDATE/DELETE = OK (ou MISSING intencional).'
\echo '   - Seção 12: TODAS as linhas devem ser status=OK (zero exposição anônima).'
\echo '   - Seção 13: TODAS as linhas devem ser status=OK (sem USING true).'
\echo '   - Seção 14: TODAS as linhas devem ser status=OK (anon não enxerga nada).'