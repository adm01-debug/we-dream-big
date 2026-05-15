-- =====================================================================
-- BLOCO 18 — REALTIME DIAGNOSTICS
-- =====================================================================
-- Queries para verificação rápida do estado de Realtime de uma tabela:
--   (A) está na publication supabase_realtime?
--   (B) qual REPLICA IDENTITY está ativa?
--   (C) tem policy de SELECT válida (e RLS habilitada)?
--
-- Cada query é independente e pode ser executada via psql ou Studio.
-- Substitua :schema / :tabela conforme necessário (psql -v).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) PARÂMETROS (psql)
-- ---------------------------------------------------------------------
--   psql -v schema=public -v tabela=messages -f block18_realtime_diagnostics.sql
-- Em Studio/SQL Editor, troque :'schema' e :'tabela' por literais.
\set schema public
\set tabela messages


-- =====================================================================
-- (A) PUBLICATION — tabela está em supabase_realtime?
-- =====================================================================

-- A.1) Resposta direta sim/não para a tabela alvo
SELECT
  :'schema'  AS schema,
  :'tabela'  AS tabela,
  EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = :'schema'
      AND tablename  = :'tabela'
  ) AS na_publication;

-- A.2) Listar TODAS as tabelas atualmente publicadas
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY 1, 2;

-- A.3) Configuração da publication (insert/update/delete/truncate ligados?)
SELECT pubname, puballtables, pubinsert, pubupdate, pubdelete, pubtruncate
FROM pg_publication
WHERE pubname = 'supabase_realtime';


-- =====================================================================
-- (B) REPLICA IDENTITY — qual está ativa?
-- =====================================================================
-- relreplident:
--   'd' = DEFAULT (PK)             — só PK em UPDATE/DELETE old
--   'n' = NOTHING                  — INCOMPATÍVEL com Realtime
--   'f' = FULL                     — linha inteira em old (custo WAL alto)
--   'i' = USING INDEX <índice>    — usa um índice único específico

-- B.1) Para a tabela alvo (com tradução legível)
SELECT
  n.nspname AS schema,
  c.relname AS tabela,
  c.relreplident AS code,
  CASE c.relreplident
    WHEN 'd' THEN 'DEFAULT (PK)'
    WHEN 'n' THEN 'NOTHING (⚠ Realtime perde UPDATE/DELETE)'
    WHEN 'f' THEN 'FULL (linha inteira no WAL)'
    WHEN 'i' THEN 'USING INDEX'
    ELSE c.relreplident::text
  END AS replica_identity,
  -- Se for 'i', mostra qual índice está em uso
  (SELECT i.relname
     FROM pg_index x
     JOIN pg_class i ON i.oid = x.indexrelid
    WHERE x.indrelid = c.oid AND x.indisreplident) AS replica_index
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = :'schema' AND c.relname = :'tabela';

-- B.2) Auditoria: TODAS as tabelas publicadas + sua REPLICA IDENTITY
SELECT
  pt.schemaname,
  pt.tablename,
  CASE c.relreplident
    WHEN 'd' THEN 'DEFAULT'
    WHEN 'n' THEN 'NOTHING'
    WHEN 'f' THEN 'FULL'
    WHEN 'i' THEN 'INDEX'
  END AS replica_identity
FROM pg_publication_tables pt
JOIN pg_class c     ON c.relname = pt.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = pt.schemaname
WHERE pt.pubname = 'supabase_realtime'
ORDER BY 1, 2;


-- =====================================================================
-- (C) RLS + POLICIES DE SELECT — válidas?
-- =====================================================================
-- Realtime só entrega linhas que passam no SELECT da RLS.
-- Sem RLS habilitada OU sem policy de SELECT → cliente NÃO recebe nada.

-- C.1) RLS ligada na tabela?
SELECT
  n.nspname        AS schema,
  c.relname        AS tabela,
  c.relrowsecurity      AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = :'schema' AND c.relname = :'tabela';

-- C.2) Existe ao menos uma policy de SELECT na tabela?
SELECT
  :'schema' AS schema,
  :'tabela' AS tabela,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = :'schema'
      AND tablename  = :'tabela'
      AND cmd = 'SELECT'
  ) AS has_select_policy,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = :'schema'
      AND tablename  = :'tabela'
      AND cmd = 'SELECT'
      AND 'authenticated' = ANY(roles)
  ) AS has_select_for_authenticated,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = :'schema'
      AND tablename  = :'tabela'
      AND cmd = 'SELECT'
      AND 'anon' = ANY(roles)
  ) AS has_select_for_anon;

-- C.3) Listar todas as policies da tabela (com a expressão)
SELECT
  policyname,
  permissive,            -- 'PERMISSIVE' | 'RESTRICTIVE'
  roles,                 -- text[]
  cmd,                   -- 'SELECT' | 'INSERT' | ...
  qual         AS using_expr,
  with_check   AS with_check_expr
FROM pg_policies
WHERE schemaname = :'schema'
  AND tablename  = :'tabela'
ORDER BY cmd, policyname;

-- C.4) ⚠ Detector de policy "USING (true)" em SELECT (vazamento total)
SELECT policyname, roles, qual
FROM pg_policies
WHERE schemaname = :'schema'
  AND tablename  = :'tabela'
  AND cmd = 'SELECT'
  AND btrim(qual) IN ('true', '(true)');


-- =====================================================================
-- (D) DIAGNÓSTICO CONSOLIDADO — uma linha por tabela publicada
-- =====================================================================
-- Idealmente: rls_enabled=true, has_select_policy=true, replica != 'n'.
SELECT
  pt.schemaname,
  pt.tablename,
  c.relrowsecurity AS rls_enabled,
  CASE c.relreplident
    WHEN 'd' THEN 'DEFAULT' WHEN 'n' THEN 'NOTHING'
    WHEN 'f' THEN 'FULL'    WHEN 'i' THEN 'INDEX'
  END AS replica_identity,
  EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = pt.schemaname
      AND p.tablename  = pt.tablename
      AND p.cmd = 'SELECT'
  ) AS has_select_policy,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname = pt.schemaname
       AND p.tablename  = pt.tablename) AS total_policies,
  -- Veredito agregado
  CASE
    WHEN c.relreplident = 'n' THEN '❌ REPLICA IDENTITY NOTHING'
    WHEN NOT c.relrowsecurity THEN '❌ RLS desabilitada'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = pt.schemaname AND p.tablename = pt.tablename AND p.cmd = 'SELECT'
    ) THEN '❌ Sem policy de SELECT (canal não entrega nada)'
    ELSE '✅ OK'
  END AS verdict
FROM pg_publication_tables pt
JOIN pg_class c     ON c.relname = pt.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = pt.schemaname
WHERE pt.pubname = 'supabase_realtime'
ORDER BY verdict DESC, pt.tablename;


-- =====================================================================
-- (E) DIAGNÓSTICO REVERSO — tabelas com RLS+policy mas FORA da publication
-- =====================================================================
-- Útil para descobrir candidatos a Realtime que ainda não estão publicados.
SELECT
  n.nspname AS schema,
  c.relname AS tabela
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity
  AND EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = n.nspname AND p.tablename = c.relname AND p.cmd = 'SELECT'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables pt
    WHERE pt.pubname = 'supabase_realtime'
      AND pt.schemaname = n.nspname
      AND pt.tablename  = c.relname
  )
ORDER BY 1, 2;
