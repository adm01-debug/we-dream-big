-- ============================================================
-- GIFTS STORE - SEED DATA FINAL
-- Dados iniciais (SEM gamificação + COM organizations)
-- Data: 03/01/2025
-- VERSÃO DEFENSIVA: Todas as operações verificam existência das tabelas
-- ============================================================

-- ============================================================
-- 1. CATEGORIAS PADRÃO (GLOBAIS)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='slug') THEN
    INSERT INTO public.categories (name, slug, description, display_order, is_active) VALUES
    ('Canecas', 'canecas', 'Canecas personalizadas de diversos materiais', 1, true),
    ('Camisetas', 'camisetas', 'Camisetas e vestuário personalizado', 2, true),
    ('Bonés', 'bones', 'Bonés e chapéus personalizados', 3, true),
    ('Squeezes', 'squeezes', 'Garrafas e squeezes personalizados', 4, true),
    ('Pen Drives', 'pen-drives', 'Pen drives e dispositivos USB personalizados', 5, true),
    ('Cadernos', 'cadernos', 'Cadernos e agendas personalizadas', 6, true),
    ('Ecobags', 'ecobags', 'Sacolas e ecobags personalizadas', 7, true),
    ('Mochilas', 'mochilas', 'Mochilas e bolsas personalizadas', 8, true),
    ('Chaveiros', 'chaveiros', 'Chaveiros personalizados diversos modelos', 9, true),
    ('Power Banks', 'power-banks', 'Carregadores portáteis personalizados', 10, true),
    ('Mousepads', 'mousepads', 'Mousepads personalizados', 11, true),
    ('Adesivos', 'adesivos', 'Adesivos personalizados', 12, true),
    ('Calendários', 'calendarios', 'Calendários personalizados', 13, true),
    ('Porta-retratos', 'porta-retratos', 'Porta-retratos personalizados', 14, true),
    ('Kits Executivos', 'kits-executivos', 'Kits corporativos personalizados', 15, true)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- 2. TÉCNICAS DE PERSONALIZAÇÃO (GLOBAIS)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='personalization_techniques' AND column_name='code') THEN
    INSERT INTO public.personalization_techniques (name, code, description, prompt_suffix, requires_color_count, base_cost_multiplier, is_active) VALUES
    (
      'Bordado',
      'embroidery',
      'Técnica de bordado tradicional com fios coloridos',
      'com bordado de alta qualidade, mostrando os detalhes das linhas e textura do bordado',
      true,
      1.5,
      true
    ),
    (
      'Silk Screen',
      'silk',
      'Serigrafia tradicional, ideal para grandes volumes',
      'com serigrafia nítida e uniforme, mostrando a qualidade da impressão',
      true,
      1.0,
      true
    ),
    (
      'DTF (Direct to Film)',
      'dtf',
      'Impressão direta no filme, cores vibrantes',
      'com impressão DTF de alta resolução, cores vibrantes e brilhantes',
      false,
      1.3,
      true
    ),
    (
      'Laser CO2',
      'laser_co2',
      'Gravação a laser em materiais orgânicos (madeira, couro, acrílico)',
      'com gravação a laser precisa e elegante, mostrando os detalhes gravados',
      false,
      1.4,
      true
    ),
    (
      'Laser Fibra',
      'laser_fiber',
      'Gravação a laser em metais',
      'com gravação a laser em metal, acabamento profissional e duradouro',
      false,
      1.6,
      true
    ),
    (
      'Sublimação',
      'sublimation',
      'Impressão por sublimação, ideal para tecidos claros e canecas',
      'com sublimação full color, cores vivas e duráveis',
      false,
      1.2,
      true
    ),
    (
      'Tampografia',
      'pad_printing',
      'Impressão tampográfica, ideal para superfícies irregulares',
      'com tampografia de precisão, adaptada à superfície do produto',
      true,
      1.3,
      true
    ),
    (
      'Hot Stamping',
      'hot_stamp',
      'Aplicação de folha metálica com calor',
      'com hot stamping dourado/prateado, acabamento premium e luxuoso',
      false,
      1.5,
      true
    ),
    (
      'Adesivo',
      'sticker',
      'Aplicação de adesivo personalizado',
      'com adesivo de alta qualidade, cores nítidas e acabamento profissional',
      false,
      0.8,
      true
    ),
    (
      'UV',
      'uv_print',
      'Impressão UV direta, cores vibrantes e resistente',
      'com impressão UV de alta definição, cores vibrantes e resistente a riscos',
      false,
      1.4,
      true
    ),
    (
      'Transfer',
      'transfer',
      'Impressão por transfer térmico',
      'com transfer de qualidade, cores vivas e boa durabilidade',
      false,
      1.1,
      true
    )
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- 3. FEATURE FLAGS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='feature_flags' AND column_name='flag_name') THEN
    INSERT INTO public.feature_flags (flag_name, is_enabled, description, rollout_percentage) VALUES
    ('enable_ai_mockups', true, 'Habilita geração de mockups com IA', 100),
    ('enable_public_approval', true, 'Habilita aprovação pública de orçamentos', 100),
    ('enable_bitrix_sync', true, 'Habilita sincronização com Bitrix24', 100),
    ('enable_analytics', true, 'Habilita tracking de analytics', 100),
    ('enable_notifications', true, 'Habilita sistema de notificações', 100),
    ('enable_favorites', true, 'Habilita sistema de favoritos', 100),
    ('enable_comparisons', true, 'Habilita comparação de produtos', 100),
    ('enable_payments', true, 'Habilita módulo de pagamentos', 100),
    ('enable_organizations', true, 'Habilita sistema multi-tenant com organizations', 100),
    ('maintenance_mode', false, 'Modo de manutenção', 0),
    ('new_product_editor', false, 'Novo editor de produtos (em desenvolvimento)', 10)
    ON CONFLICT (flag_name) DO UPDATE SET
      is_enabled = EXCLUDED.is_enabled,
      rollout_percentage = EXCLUDED.rollout_percentage;
  END IF;
END $$;

-- ============================================================
-- 4. SYSTEM SETTINGS
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='system_settings' AND column_name='setting_key') THEN
    INSERT INTO public.system_settings (setting_key, setting_value, description, is_public) VALUES
    -- Empresa
    ('company_name', '"Pink e Cerébro"', 'Nome da empresa', true),
    ('company_email', '"contato@pinkcerebro.com.br"', 'Email de contato', true),
    ('company_phone', '"+55 11 99999-9999"', 'Telefone de contato', true),

    -- Limites
    ('max_quote_items', '50', 'Máximo de itens por orçamento', false),
    ('max_mockups_per_job', '20', 'Máximo de mockups por job', false),
    ('default_quote_validity_days', '30', 'Validade padrão de orçamentos (dias)', false),

    -- Notificações
    ('enable_email_notifications', 'true', 'Habilitar notificações por email', false),
    ('enable_push_notifications', 'true', 'Habilitar push notifications', false),

    -- IA
    ('ai_model_default', '"pro"', 'Modelo de IA padrão (standard/pro)', false),
    ('ai_max_retries', '3', 'Máximo de tentativas para geração de IA', false),

    -- Internacionalização
    ('currency', '"BRL"', 'Moeda padrão', true),
    ('timezone', '"America/Sao_Paulo"', 'Timezone padrão', false),
    ('language', '"pt-BR"', 'Idioma padrão', true),

    -- Pagamentos
    ('payment_gateway_default', '"mercadopago"', 'Gateway de pagamento padrão', false),
    ('payment_methods_enabled', '["credit_card", "debit_card", "pix", "boleto"]', 'Métodos de pagamento habilitados', false),
    ('payment_auto_capture', 'false', 'Captura automática de pagamentos', false),
    ('payment_webhook_secret', '""', 'Secret para validação de webhooks (configurar em produção)', false),

    -- Organizations
    ('max_users_per_org', '50', 'Máximo de usuários por organização (plano free)', false),
    ('max_products_per_org', '1000', 'Máximo de produtos por organização (plano free)', false),
    ('enable_org_invites', 'true', 'Habilitar convites para organizations', false)

    ON CONFLICT (setting_key) DO UPDATE SET
      setting_value = EXCLUDED.setting_value;
  END IF;
END $$;

-- ============================================================
-- 5. NOTIFICATION TEMPLATES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  body_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_templates' AND column_name='code') THEN
    INSERT INTO public.notification_templates (code, name, subject, body_template, variables, is_active) VALUES
    (
      'quote_approved',
      'Orçamento Aprovado',
      'Orçamento {{quote_number}} aprovado!',
      'Parabéns! O cliente aprovou o orçamento {{quote_number}} no valor de {{total}}.',
      '["quote_number", "total", "client_name"]',
      true
    ),
    (
      'new_order',
      'Novo Pedido',
      'Novo pedido {{order_number}}',
      'Um novo pedido {{order_number}} foi criado no valor de {{total}}.',
      '["order_number", "total", "client_name"]',
      true
    ),
    (
      'mockup_ready',
      'Mockup Pronto',
      'Seus mockups estão prontos!',
      'Os mockups do job {{job_id}} foram gerados com sucesso. Total: {{count}} mockups.',
      '["job_id", "count", "product_name"]',
      true
    ),
    (
      'payment_confirmed',
      'Pagamento Confirmado',
      'Pagamento confirmado - Pedido {{order_number}}',
      'O pagamento do pedido {{order_number}} foi confirmado! Valor: {{amount}}. Método: {{method}}.',
      '["order_number", "amount", "method"]',
      true
    ),
    (
      'payment_failed',
      'Falha no Pagamento',
      'Falha no pagamento - Pedido {{order_number}}',
      'Houve uma falha no pagamento do pedido {{order_number}}. Por favor, tente novamente ou entre em contato.',
      '["order_number", "amount", "error_message"]',
      true
    ),
    (
      'org_invite',
      'Convite para Organization',
      'Você foi convidado para {{org_name}}!',
      'Você recebeu um convite para participar da organização {{org_name}} como {{role}}.',
      '["org_name", "role", "inviter_name"]',
      true
    ),
    (
      'user_added_to_org',
      'Novo Membro na Organization',
      'Novo membro adicionado',
      '{{user_name}} foi adicionado à organização como {{role}}.',
      '["user_name", "role", "org_name"]',
      true
    )
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- MENSAGEM DE SUCESSO
-- ============================================================

SELECT
  'Seed data defensivo executado com sucesso!' as message,
  'Sistema multi-tenant com Organizations ativo' as info,
  'Proximo passo: Criar sua primeira Organization via app' as next_step;
