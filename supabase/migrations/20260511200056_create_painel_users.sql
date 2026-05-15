-- ============================================================
--  Criar usuários do painel de cotação (Gap A — sincronizado em 2026-05-12)
--
--  ORIGEM: migration aplicada via MCP em 2026-05-11 (sem arquivo .sql no repo).
--  SQL recuperado de supabase_migrations.schema_migrations.statements[].
--
--  SEGURANÇA: versão original usava senha padrão fixada em texto.
--  Esta versão commita com senha ALEATÓRIA (inloggável sem reset).
--  Para definir senhas reais, use o Supabase Dashboard:
--    Authentication > Users > Reset Password
--  Ou via CLI: supabase auth admin update-user <user_id> --password <nova>
--
--  IDEMPOTÊNCIA: cada INSERT é guardado por "IF NOT EXISTS" — re-execução
--  segura em ambientes de dev/staging.
-- ============================================================

DO $$
DECLARE
  v_user_id  uuid;
  v_email    text;
  v_nome     text;
  v_role     text;
  v_users    record;
BEGIN
  FOR v_users IN
    SELECT * FROM (VALUES
      ('joaquim@promobrindes.com.br',   'Joaquim (Pink)', 'admin'),
      ('tiago@promobrindes.com.br',     'Tiago',          'cotacao'),
      ('marcus@promobrindes.com.br',    'Marcus',         'cotacao'),
      ('gabryelly@promobrindes.com.br', 'Gabryelly',      'cotacao')
    ) AS t(email, nome, role)
  LOOP
    v_email := v_users.email;
    v_nome  := v_users.nome;
    v_role  := v_users.role;

    -- Pula se já existe (idempotência)
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
      RAISE NOTICE 'Usuário % já existe, pulando.', v_email;
      CONTINUE;
    END IF;

    v_user_id := gen_random_uuid();

    -- 1) Cria entrada em auth.users com senha ALEATÓRIA (bcrypt de UUID).
    --    Senha não pode ser derivada nem por força bruta — reset obrigatório.
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      v_user_id,
      'authenticated', 'authenticated',
      v_email,
      crypt(gen_random_uuid()::text, gen_salt('bf')),   -- senha aleatória — requer reset
      now(),
      jsonb_build_object(
        'nome',           v_nome,
        'role',           v_role,
        'email_verified', true,
        'app',            'painel-cotacoes'
      ),
      jsonb_build_object(
        'provider',  'email',
        'providers', jsonb_build_array('email')
      ),
      now(), now(),
      '', '', '', ''
    );

    -- 2) Cria identity (provider email) — necessário para login funcionar
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub',            v_user_id::text,
        'email',          v_email,
        'email_verified', true
      ),
      'email',
      v_email,
      now(), now(), now()
    );

    RAISE NOTICE 'Usuário % criado (id=%). ATENÇÃO: senha aleatória — use Dashboard para redefinir.', v_email, v_user_id;
  END LOOP;
END $$;
