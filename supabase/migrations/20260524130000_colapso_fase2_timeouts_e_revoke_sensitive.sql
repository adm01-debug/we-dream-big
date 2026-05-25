-- =============================================================
-- COLAPSO FASE 2 — ALTER ROLE timeouts + REVOKE sensíveis
-- Data: 2026-05-24
-- Contexto: análise forense identificou que `idle_session_timeout=0`
-- global criava conexões PostgREST zumbi por até 10 dias. Como ALTER
-- DATABASE para esse parâmetro é bloqueado em Supabase Cloud, aplicamos
-- por ROLE, que tem precedência semelhante.
--
-- Adicionalmente, 34 tabelas sensíveis (credenciais, tokens, audit logs)
-- tinham SELECT/INSERT/UPDATE/DELETE para `anon`, expondo a estrutura via
-- introspection do GraphQL e PostgREST mesmo com RLS ativa.
-- =============================================================

-- =============================================================
-- BLOCO 1 — Timeouts por role (substitui Dashboard idle_session_timeout)
-- =============================================================

-- authenticator: role-mãe do PostgREST. idle_session_timeout aqui força
-- limpeza de conexões zumbi do PostgREST que ficavam por dias.
ALTER ROLE authenticator SET idle_in_transaction_session_timeout = '60000';   -- 60s
ALTER ROLE authenticator SET idle_session_timeout = '600000';                  -- 10min

-- anon e authenticated herdam de authenticator, mas reforçamos:
ALTER ROLE anon SET idle_in_transaction_session_timeout = '30000';            -- 30s
ALTER ROLE authenticated SET idle_in_transaction_session_timeout = '60000';   -- 60s

-- service_role: edge functions e cron. 5min folgado.
ALTER ROLE service_role SET idle_in_transaction_session_timeout = '60000';
ALTER ROLE service_role SET idle_session_timeout = '300000';                   -- 5min

-- =============================================================
-- BLOCO 2 — REVOKE em 34 tabelas sensíveis (defesa em profundidade)
-- RLS protege os dados; REVOKE remove a tabela do schema introspection
-- do PostgREST e impede acesso mesmo se RLS for desabilitada por engano.
-- =============================================================

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'admissao_tokens','audit_log','audit_logs','auditoria','auditoria_contratual',
    'auditoria_logs','auth_gov_br_sessions','blocked_ips','ferias_audit_log',
    'folha_auditoria','folha_eventos_auditoria','geo_blocked_attempts',
    'govbr_auth_state','login_attempts','login_rate_limits','password_history',
    'password_policies','password_reset_config','password_reset_requests',
    'ponto_auditoria','ponto_auditoria_fraude','provisao_auditoria',
    'rate_limit_config','rate_limit_logs','rate_limits','security_alerts',
    'trilha_auditoria_ponto','user_mfa','user_sessions','verification_tokens',
    'webauthn_credentials','webhook_logs','webhooks','webhooks_config','webhooks_logs'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      RAISE NOTICE '[colapso_fase2] Skipped anon revoke: public.% does not exist', v_table;
    ELSE
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', v_table);
    END IF;
  END LOOP;
END $$;

-- =============================================================
-- VALIDAÇÃO (informativa, não falha)
-- =============================================================

DO $$
DECLARE
  v_count int;
BEGIN
  -- Conta quantas das tabelas sensíveis ainda têm SELECT para anon
  SELECT count(*) INTO v_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = ANY(ARRAY[
      'admissao_tokens','audit_log','audit_logs','auditoria','auditoria_contratual',
      'auditoria_logs','auth_gov_br_sessions','blocked_ips','ferias_audit_log',
      'folha_auditoria','folha_eventos_auditoria','geo_blocked_attempts',
      'govbr_auth_state','login_attempts','login_rate_limits','password_history',
      'password_policies','password_reset_config','password_reset_requests',
      'ponto_auditoria','ponto_auditoria_fraude','provisao_auditoria',
      'rate_limit_config','rate_limit_logs','rate_limits','security_alerts',
      'trilha_auditoria_ponto','user_mfa','user_sessions','verification_tokens',
      'webauthn_credentials','webhook_logs','webhooks','webhooks_config','webhooks_logs'
    ])
    AND has_table_privilege('anon', schemaname||'.'||tablename, 'SELECT');

  IF v_count > 0 THEN
    RAISE WARNING 'Ainda há % tabelas sensíveis com SELECT exposto para anon', v_count;
  ELSE
    RAISE NOTICE '✅ Todas as tabelas sensíveis estão fechadas para anon';
  END IF;
END $$;
