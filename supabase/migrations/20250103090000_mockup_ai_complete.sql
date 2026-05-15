-- ============================================================
-- MÓDULO MOCKUP IA - MIGRATION 001
-- Tabelas Principais do Sistema de Geração Automática de Mockups
-- VERSÃO DEFENSIVA: Todas as operações verificam existência das tabelas
-- ============================================================

-- 1. PERSONALIZATION TECHNIQUES (Técnicas de Personalização)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.personalization_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  prompt_suffix TEXT NOT NULL, -- Sufixo para prompt da IA
  requires_color_count BOOLEAN DEFAULT false,
  base_cost_multiplier DECIMAL(4,2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. MOCKUP GENERATION JOBS (Jobs de Geração)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mockup_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.bitrix_clients(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  technique_id UUID REFERENCES public.personalization_techniques(id) ON DELETE SET NULL,
  technique_name TEXT NOT NULL,
  
  -- Logo e configuração
  logo_url TEXT NOT NULL,
  logo_filename TEXT,
  
  -- Configuração de cores
  product_colors JSONB NOT NULL DEFAULT '[]', -- Array de HEX colors
  colors_count INTEGER NOT NULL DEFAULT 1,
  
  -- Configuração de áreas
  areas_config JSONB NOT NULL DEFAULT '[]', -- Array de áreas de personalização
  
  -- Contagem de cores da arte (para bordado/silk)
  art_colors_count INTEGER DEFAULT 1,
  
  -- Configuração avançada
  custom_prompt TEXT,
  ai_model TEXT DEFAULT 'pro', -- 'standard' ou 'pro'
  
  -- Status e tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  total_mockups INTEGER NOT NULL DEFAULT 0,
  completed_mockups INTEGER DEFAULT 0,
  failed_mockups INTEGER DEFAULT 0,
  
  -- Custos
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  
  -- Metadata
  error_message TEXT,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT valid_ai_model CHECK (ai_model IN ('standard', 'pro'))
);

-- 3. GENERATED MOCKUPS (Mockups Gerados)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.generated_mockups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.mockup_generation_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Produto e técnica
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  technique_id UUID REFERENCES public.personalization_techniques(id) ON DELETE SET NULL,
  technique_name TEXT NOT NULL,
  
  -- Configuração aplicada
  product_color_hex TEXT NOT NULL,
  product_color_name TEXT,
  area_name TEXT NOT NULL, -- "Frente", "Costas", etc
  area_config JSONB NOT NULL,
  
  -- URLs dos arquivos
  mockup_url TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Metadata da geração
  ai_model_used TEXT NOT NULL,
  generation_time_seconds INTEGER,
  prompt_used TEXT,
  seed_used INTEGER,
  
  -- Qualidade e validação
  quality_score DECIMAL(3,2), -- 0.00 a 1.00
  has_errors BOOLEAN DEFAULT false,
  error_details TEXT,
  
  -- Aprovação
  approval_status TEXT DEFAULT 'pending', -- pending, approved_internal, approved_client, rejected
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  client_feedback TEXT,
  
  -- Custo
  generation_cost DECIMAL(10,4),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_approval_status CHECK (
    approval_status IN ('pending', 'approved_internal', 'approved_client', 'rejected')
  )
);

-- 4. MOCKUP APPROVAL LINKS (Links Públicos de Aprovação)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mockup_approval_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.mockup_generation_jobs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.bitrix_clients(id) ON DELETE SET NULL,
  
  -- Token de acesso
  public_token TEXT NOT NULL UNIQUE,
  
  -- Configuração do link
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata de acesso
  first_accessed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  
  -- Aprovação
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  client_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. MOCKUP CREDITS (Sistema de Créditos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mockup_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Saldo
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  lifetime_earned DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  lifetime_spent DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  
  -- Limites
  monthly_limit DECIMAL(10,2),
  daily_limit DECIMAL(10,2),
  
  -- Tracking mensal/diário
  current_month_spent DECIMAL(10,2) DEFAULT 0.00,
  current_day_spent DECIMAL(10,2) DEFAULT 0.00,
  last_reset_month DATE,
  last_reset_day DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- 6. MOCKUP CREDIT TRANSACTIONS (Transações de Créditos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mockup_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_account_id UUID NOT NULL REFERENCES public.mockup_credits(id) ON DELETE CASCADE,
  
  -- Transação
  type TEXT NOT NULL, -- charge, refund, grant, bonus
  amount DECIMAL(10,4) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  
  -- Referência
  mockup_id UUID REFERENCES public.generated_mockups(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.mockup_generation_jobs(id) ON DELETE SET NULL,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_transaction_type CHECK (type IN ('charge', 'refund', 'grant', 'bonus', 'purchase'))
);

-- 7. MOCKUP TEMPLATES (Templates de Produtos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mockup_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Template info
  name TEXT NOT NULL,
  description TEXT,
  template_image_url TEXT NOT NULL,
  
  -- Áreas pré-configuradas
  predefined_areas JSONB NOT NULL DEFAULT '[]',
  
  -- Configuração padrão
  default_technique_id UUID REFERENCES public.personalization_techniques(id) ON DELETE SET NULL,
  available_colors JSONB DEFAULT '[]',
  
  -- Metadata
  usage_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Jobs
CREATE INDEX IF NOT EXISTS idx_mockup_jobs_user_id ON public.mockup_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_mockup_jobs_client_id ON public.mockup_generation_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_mockup_jobs_status ON public.mockup_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_mockup_jobs_created_at ON public.mockup_generation_jobs(created_at DESC);

-- Mockups gerados
CREATE INDEX IF NOT EXISTS idx_generated_mockups_job_id ON public.generated_mockups(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_mockups_user_id ON public.generated_mockups(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_mockups_approval_status ON public.generated_mockups(approval_status);
CREATE INDEX IF NOT EXISTS idx_generated_mockups_created_at ON public.generated_mockups(created_at DESC);

-- Links de aprovação
CREATE INDEX IF NOT EXISTS idx_approval_links_token ON public.mockup_approval_links(public_token);
CREATE INDEX IF NOT EXISTS idx_approval_links_job_id ON public.mockup_approval_links(job_id);
CREATE INDEX IF NOT EXISTS idx_approval_links_active ON public.mockup_approval_links(is_active) WHERE is_active = true;

-- Créditos
CREATE INDEX IF NOT EXISTS idx_mockup_credits_user_id ON public.mockup_credits(user_id);

-- Transações
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.mockup_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.mockup_credit_transactions(created_at DESC);

-- Templates
CREATE INDEX IF NOT EXISTS idx_mockup_templates_product_id ON public.mockup_templates(product_id);
CREATE INDEX IF NOT EXISTS idx_mockup_templates_active ON public.mockup_templates(is_active) WHERE is_active = true;

-- ============================================================
-- DADOS INICIAIS - TÉCNICAS DE PERSONALIZAÇÃO
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') THEN
    INSERT INTO public.personalization_techniques (name, code, prompt_suffix, requires_color_count) VALUES
    ('Bordado', 'bordado', 'as professional machine embroidery with visible thread stitching texture, showing the thread weave pattern typical of embroidered logos', true),
    ('Silk Screen', 'silk', 'as screen printed with flat solid colors, matte finish, ink sitting on top of the fabric surface', true),
    ('DTF', 'dtf', 'as DTF (Direct to Film) printed transfer with vibrant colors, slight glossy finish, smooth edges', false),
    ('Laser CO2', 'laser_co2', 'as CO2 laser engraved with precise etching, showing material removal and light burn marks on organic materials', false),
    ('Laser Fibra', 'laser_fibra', 'as fiber laser marked on metal, creating a high-contrast permanent mark with polished appearance', false),
    ('Sublimação', 'sublimacao', 'as sublimation printed, colors absorbed into the material, seamless integration with no texture difference', false),
    ('Tampografia', 'tampografia', 'as pad printed with slightly glossy ink, precise small details, subtle ink buildup', false),
    ('Hot Stamping', 'hot_stamping', 'as hot stamped with metallic foil finish, shiny reflective surface, typically gold or silver', false),
    ('Adesivo', 'adesivo', 'as vinyl sticker/decal applied to surface, slight edge visibility, glossy or matte vinyl finish', false),
    ('UV', 'uv', 'as UV printed with raised ink texture, vibrant colors, slightly embossed feel', false),
    ('Transfer', 'transfer', 'as heat transfer vinyl, smooth finish with slight sheen, cut around the design edges', false)
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

-- Mensagem de sucesso
SELECT 'Migration 001 concluída: Tabelas principais criadas!' as message;
-- ============================================================
-- MÓDULO MOCKUP IA - MIGRATION 002
-- Triggers, Functions e Automações
-- ============================================================

-- 1. FUNCTION: Auto-update timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_mockup_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGERS: Updated_at em todas as tabelas
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') THEN
    DROP TRIGGER IF EXISTS trigger_update_techniques_timestamp ON public.personalization_techniques;
    CREATE TRIGGER trigger_update_techniques_timestamp
      BEFORE UPDATE ON public.personalization_techniques
      FOR EACH ROW EXECUTE FUNCTION public.update_mockup_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    DROP TRIGGER IF EXISTS trigger_update_jobs_timestamp ON public.mockup_generation_jobs;
    CREATE TRIGGER trigger_update_jobs_timestamp
      BEFORE UPDATE ON public.mockup_generation_jobs
      FOR EACH ROW EXECUTE FUNCTION public.update_mockup_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups') THEN
    DROP TRIGGER IF EXISTS trigger_update_mockups_timestamp ON public.generated_mockups;
    CREATE TRIGGER trigger_update_mockups_timestamp
      BEFORE UPDATE ON public.generated_mockups
      FOR EACH ROW EXECUTE FUNCTION public.update_mockup_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_approval_links') THEN
    DROP TRIGGER IF EXISTS trigger_update_approval_links_timestamp ON public.mockup_approval_links;
    CREATE TRIGGER trigger_update_approval_links_timestamp
      BEFORE UPDATE ON public.mockup_approval_links
      FOR EACH ROW EXECUTE FUNCTION public.update_mockup_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_credits') THEN
    DROP TRIGGER IF EXISTS trigger_update_credits_timestamp ON public.mockup_credits;
    CREATE TRIGGER trigger_update_credits_timestamp
      BEFORE UPDATE ON public.mockup_credits
      FOR EACH ROW EXECUTE FUNCTION public.update_mockup_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_templates') THEN
    DROP TRIGGER IF EXISTS trigger_update_templates_timestamp ON public.mockup_templates;
    CREATE TRIGGER trigger_update_templates_timestamp
      BEFORE UPDATE ON public.mockup_templates
      FOR EACH ROW EXECUTE FUNCTION public.update_mockup_updated_at();
  END IF;
END $$;

-- 3. FUNCTION: Auto-criar conta de créditos para novo usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_mockup_credit_account()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.mockup_credits (user_id, balance, lifetime_earned)
  VALUES (NEW.id, 10.00, 10.00) -- Bônus de boas-vindas: R$ 10
  ON CONFLICT DO NOTHING;
  
  -- Criar transação de bônus
  INSERT INTO public.mockup_credit_transactions (
    user_id,
    credit_account_id,
    type,
    amount,
    balance_before,
    balance_after,
    description
  )
  SELECT 
    NEW.id,
    id,
    'bonus',
    10.00,
    0.00,
    10.00,
    'Bônus de boas-vindas'
  FROM public.mockup_credits
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_credit_account ON auth.users;
CREATE TRIGGER trigger_create_credit_account
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_mockup_credit_account();

-- 4. FUNCTION: Calcular custo estimado do job
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_job_estimated_cost()
RETURNS TRIGGER AS $$
DECLARE
  base_cost DECIMAL(10,4);
  color_count INTEGER;
  area_count INTEGER;
  tech_multiplier DECIMAL(4,2);
BEGIN
  -- Custo base por modelo
  IF NEW.ai_model = 'pro' THEN
    base_cost := 0.60; -- R$ 0.60 (Nano Banana Pro)
  ELSE
    base_cost := 0.10; -- R$ 0.10 (Nano Banana Standard)
  END IF;
  
  -- Contar cores e áreas
  color_count := jsonb_array_length(NEW.product_colors);
  area_count := jsonb_array_length(NEW.areas_config);
  
  -- Pegar multiplicador da técnica
  SELECT COALESCE(base_cost_multiplier, 1.0)
  INTO tech_multiplier
  FROM public.personalization_techniques
  WHERE id = NEW.technique_id;
  
  -- Calcular custo total
  NEW.total_mockups := color_count * area_count;
  NEW.estimated_cost := base_cost * color_count * area_count * tech_multiplier;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    DROP TRIGGER IF EXISTS trigger_calculate_job_cost ON public.mockup_generation_jobs;
    CREATE TRIGGER trigger_calculate_job_cost
      BEFORE INSERT OR UPDATE OF product_colors, areas_config, ai_model, technique_id
      ON public.mockup_generation_jobs
      FOR EACH ROW EXECUTE FUNCTION public.calculate_job_estimated_cost();
  END IF;
END $$;

-- 5. FUNCTION: Debitar créditos quando job for criado
-- ============================================================
CREATE OR REPLACE FUNCTION public.charge_credits_for_job()
RETURNS TRIGGER AS $$
DECLARE
  current_balance DECIMAL(10,2);
  credit_id UUID;
BEGIN
  -- Apenas processar quando status = 'processing'
  IF NEW.status = 'processing' AND (OLD.status IS NULL OR OLD.status != 'processing') THEN
    
    -- Buscar conta de créditos
    SELECT id, balance INTO credit_id, current_balance
    FROM public.mockup_credits
    WHERE user_id = NEW.user_id
    FOR UPDATE;
    
    -- Verificar se tem saldo
    IF current_balance < NEW.estimated_cost THEN
      RAISE EXCEPTION 'Saldo insuficiente. Necessário: R$ %, Disponível: R$ %', 
        NEW.estimated_cost, current_balance;
    END IF;
    
    -- Debitar
    UPDATE public.mockup_credits
    SET 
      balance = balance - NEW.estimated_cost,
      lifetime_spent = lifetime_spent + NEW.estimated_cost,
      current_month_spent = current_month_spent + NEW.estimated_cost,
      current_day_spent = current_day_spent + NEW.estimated_cost
    WHERE user_id = NEW.user_id;
    
    -- Registrar transação
    INSERT INTO public.mockup_credit_transactions (
      user_id,
      credit_account_id,
      type,
      amount,
      balance_before,
      balance_after,
      job_id,
      description
    ) VALUES (
      NEW.user_id,
      credit_id,
      'charge',
      NEW.estimated_cost,
      current_balance,
      current_balance - NEW.estimated_cost,
      NEW.id,
      format('Geração de %s mockups - Job %s', NEW.total_mockups, NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    DROP TRIGGER IF EXISTS trigger_charge_credits ON public.mockup_generation_jobs;
    CREATE TRIGGER trigger_charge_credits
      AFTER INSERT OR UPDATE OF status
      ON public.mockup_generation_jobs
      FOR EACH ROW EXECUTE FUNCTION public.charge_credits_for_job();
  END IF;
END $$;

-- 6. FUNCTION: Atualizar progresso do job quando mockup é criado
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_job_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.mockup_generation_jobs
  SET 
    completed_mockups = completed_mockups + 1,
    status = CASE 
      WHEN (completed_mockups + 1) >= total_mockups THEN 'completed'
      ELSE 'processing'
    END,
    processing_completed_at = CASE
      WHEN (completed_mockups + 1) >= total_mockups THEN NOW()
      ELSE processing_completed_at
    END
  WHERE id = NEW.job_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups') THEN
    DROP TRIGGER IF EXISTS trigger_update_job_progress ON public.generated_mockups;
    CREATE TRIGGER trigger_update_job_progress
      AFTER INSERT ON public.generated_mockups
      FOR EACH ROW EXECUTE FUNCTION public.update_job_progress();
  END IF;
END $$;

-- 7. FUNCTION: Resetar contadores mensais/diários
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_credit_limits()
RETURNS void AS $$
BEGIN
  -- Reset mensal
  UPDATE public.mockup_credits
  SET 
    current_month_spent = 0.00,
    last_reset_month = CURRENT_DATE
  WHERE last_reset_month IS NULL OR last_reset_month < DATE_TRUNC('month', CURRENT_DATE);
  
  -- Reset diário
  UPDATE public.mockup_credits
  SET 
    current_day_spent = 0.00,
    last_reset_day = CURRENT_DATE
  WHERE last_reset_day IS NULL OR last_reset_day < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNCTION: Gerar token público único
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_approval_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar token de 32 caracteres
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(replace(replace(token, '/', ''), '+', ''), '=', '');
    token := substring(token, 1, 32);
    
    -- Verificar se já existe
    SELECT EXISTS(
      SELECT 1 FROM public.mockup_approval_links WHERE public_token = token
    ) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNCTION: Auto-gerar token ao criar link de aprovação
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_approval_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_token IS NULL THEN
    NEW.public_token := public.generate_approval_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_approval_links') THEN
    DROP TRIGGER IF EXISTS trigger_set_approval_token ON public.mockup_approval_links;
    CREATE TRIGGER trigger_set_approval_token
      BEFORE INSERT ON public.mockup_approval_links
      FOR EACH ROW EXECUTE FUNCTION public.set_approval_token();
  END IF;
END $$;

-- 10. FUNCTION: Incrementar contador de uso do template
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.mockup_templates
  SET usage_count = usage_count + 1
  WHERE product_id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    DROP TRIGGER IF EXISTS trigger_increment_template_usage ON public.mockup_generation_jobs;
    CREATE TRIGGER trigger_increment_template_usage
      AFTER INSERT ON public.mockup_generation_jobs
      FOR EACH ROW EXECUTE FUNCTION public.increment_template_usage();
  END IF;
END $$;

-- Mensagem de sucesso
SELECT 'Migration 002 concluída: Triggers e Functions criadas!' as message;
-- ============================================================
-- MÓDULO MOCKUP IA - MIGRATION 003
-- Row Level Security (RLS) Policies
-- ============================================================

-- Habilitar RLS em todas as tabelas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') THEN
    ALTER TABLE public.personalization_techniques ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    ALTER TABLE public.mockup_generation_jobs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups') THEN
    ALTER TABLE public.generated_mockups ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_approval_links') THEN
    ALTER TABLE public.mockup_approval_links ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_credits') THEN
    ALTER TABLE public.mockup_credits ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_credit_transactions') THEN
    ALTER TABLE public.mockup_credit_transactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_templates') THEN
    ALTER TABLE public.mockup_templates ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================
-- POLÍTICAS: personalization_techniques
-- ============================================================

-- Todos podem ler técnicas ativas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='personalization_techniques' AND policyname='Anyone can read active techniques') THEN
      DROP POLICY "Anyone can read active techniques" ON public.personalization_techniques;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='personalization_techniques' AND policyname='Anyone can read active techniques') THEN
      CREATE POLICY "Anyone can read active techniques" ON public.personalization_techniques
        FOR SELECT USING (is_active = true);
    END IF;
  END IF;
END $$;

-- Apenas admins podem gerenciar
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='personalization_techniques') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='personalization_techniques' AND policyname='Admins can manage techniques') THEN
      DROP POLICY "Admins can manage techniques" ON public.personalization_techniques;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='personalization_techniques' AND policyname='Admins can manage techniques') THEN
      CREATE POLICY "Admins can manage techniques" ON public.personalization_techniques
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
  END IF;
END $$;

-- ============================================================
-- POLÍTICAS: mockup_generation_jobs
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND policyname='Users can read own jobs') THEN
      DROP POLICY "Users can read own jobs" ON public.mockup_generation_jobs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND policyname='Users can read own jobs') THEN
      CREATE POLICY "Users can read own jobs" ON public.mockup_generation_jobs
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND policyname='Users can create jobs') THEN
      DROP POLICY "Users can create jobs" ON public.mockup_generation_jobs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND policyname='Users can create jobs') THEN
      CREATE POLICY "Users can create jobs" ON public.mockup_generation_jobs
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND policyname='Users can update own jobs') THEN
      DROP POLICY "Users can update own jobs" ON public.mockup_generation_jobs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND policyname='Users can update own jobs') THEN
      CREATE POLICY "Users can update own jobs" ON public.mockup_generation_jobs
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_generation_jobs') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND policyname='Admins can read all jobs') THEN
      DROP POLICY "Admins can read all jobs" ON public.mockup_generation_jobs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_generation_jobs' AND policyname='Admins can read all jobs') THEN
      CREATE POLICY "Admins can read all jobs" ON public.mockup_generation_jobs
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
  END IF;
END $$;

-- ============================================================
-- POLÍTICAS: generated_mockups
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='Users can read own mockups') THEN
      DROP POLICY "Users can read own mockups" ON public.generated_mockups;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='Users can read own mockups') THEN
      CREATE POLICY "Users can read own mockups" ON public.generated_mockups
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='Users can create mockups') THEN
      DROP POLICY "Users can create mockups" ON public.generated_mockups;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='Users can create mockups') THEN
      CREATE POLICY "Users can create mockups" ON public.generated_mockups
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='Users can update own mockups') THEN
      DROP POLICY "Users can update own mockups" ON public.generated_mockups;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='Users can update own mockups') THEN
      CREATE POLICY "Users can update own mockups" ON public.generated_mockups
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='Users can delete own mockups') THEN
      DROP POLICY "Users can delete own mockups" ON public.generated_mockups;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='Users can delete own mockups') THEN
      CREATE POLICY "Users can delete own mockups" ON public.generated_mockups
        FOR DELETE USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='generated_mockups') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='Admins can read all mockups') THEN
      DROP POLICY "Admins can read all mockups" ON public.generated_mockups;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='generated_mockups' AND policyname='Admins can read all mockups') THEN
      CREATE POLICY "Admins can read all mockups" ON public.generated_mockups
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
  END IF;
END $$;

-- ============================================================
-- POLÍTICAS: mockup_approval_links
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_approval_links') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_approval_links' AND policyname='Public can access active link via token') THEN
      DROP POLICY "Public can access active link via token" ON public.mockup_approval_links;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_approval_links' AND policyname='Public can access active link via token') THEN
      CREATE POLICY "Public can access active link via token" ON public.mockup_approval_links
        FOR SELECT USING (is_active = true);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_approval_links') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_approval_links' AND policyname='Users can create approval links') THEN
      DROP POLICY "Users can create approval links" ON public.mockup_approval_links;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_approval_links' AND policyname='Users can create approval links') THEN
      CREATE POLICY "Users can create approval links" ON public.mockup_approval_links
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.mockup_generation_jobs
            WHERE id = job_id AND user_id = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_approval_links') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_approval_links' AND policyname='Users can update own approval links') THEN
      DROP POLICY "Users can update own approval links" ON public.mockup_approval_links;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_approval_links' AND policyname='Users can update own approval links') THEN
      CREATE POLICY "Users can update own approval links" ON public.mockup_approval_links
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM public.mockup_generation_jobs
            WHERE id = job_id AND user_id = auth.uid()
          )
        );
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_approval_links') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_approval_links' AND policyname='Admins can manage all links') THEN
      DROP POLICY "Admins can manage all links" ON public.mockup_approval_links;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_approval_links' AND policyname='Admins can manage all links') THEN
      CREATE POLICY "Admins can manage all links" ON public.mockup_approval_links
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
  END IF;
END $$;

-- ============================================================
-- POLÍTICAS: mockup_credits
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_credits') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credits' AND policyname='Users can read own credits') THEN
      DROP POLICY "Users can read own credits" ON public.mockup_credits;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credits' AND policyname='Users can read own credits') THEN
      CREATE POLICY "Users can read own credits" ON public.mockup_credits
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_credits') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credits' AND policyname='System can create credit accounts') THEN
      DROP POLICY "System can create credit accounts" ON public.mockup_credits;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credits' AND policyname='System can create credit accounts') THEN
      CREATE POLICY "System can create credit accounts" ON public.mockup_credits
        FOR INSERT WITH CHECK (true);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_credits') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credits' AND policyname='System can update credits') THEN
      DROP POLICY "System can update credits" ON public.mockup_credits;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credits' AND policyname='System can update credits') THEN
      CREATE POLICY "System can update credits" ON public.mockup_credits
        FOR UPDATE USING (true);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_credits') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credits' AND policyname='Admins can read all credits') THEN
      DROP POLICY "Admins can read all credits" ON public.mockup_credits;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credits' AND policyname='Admins can read all credits') THEN
      CREATE POLICY "Admins can read all credits" ON public.mockup_credits
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_credits') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credits' AND policyname='Admins can grant credits') THEN
      DROP POLICY "Admins can grant credits" ON public.mockup_credits;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credits' AND policyname='Admins can grant credits') THEN
      CREATE POLICY "Admins can grant credits" ON public.mockup_credits
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
  END IF;
END $$;

-- ============================================================
-- POLÍTICAS: mockup_credit_transactions
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_credit_transactions') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credit_transactions' AND policyname='Users can read own transactions') THEN
      DROP POLICY "Users can read own transactions" ON public.mockup_credit_transactions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credit_transactions' AND policyname='Users can read own transactions') THEN
      CREATE POLICY "Users can read own transactions" ON public.mockup_credit_transactions
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_credit_transactions') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credit_transactions' AND policyname='System can create transactions') THEN
      DROP POLICY "System can create transactions" ON public.mockup_credit_transactions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credit_transactions' AND policyname='System can create transactions') THEN
      CREATE POLICY "System can create transactions" ON public.mockup_credit_transactions
        FOR INSERT WITH CHECK (true);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_credit_transactions') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credit_transactions' AND policyname='Admins can read all transactions') THEN
      DROP POLICY "Admins can read all transactions" ON public.mockup_credit_transactions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_credit_transactions' AND policyname='Admins can read all transactions') THEN
      CREATE POLICY "Admins can read all transactions" ON public.mockup_credit_transactions
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
  END IF;
END $$;

-- ============================================================
-- POLÍTICAS: mockup_templates
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_templates') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_templates' AND policyname='Anyone can read active templates') THEN
      DROP POLICY "Anyone can read active templates" ON public.mockup_templates;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_templates' AND policyname='Anyone can read active templates') THEN
      CREATE POLICY "Anyone can read active templates" ON public.mockup_templates
        FOR SELECT USING (is_active = true);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='mockup_templates') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_templates' AND policyname='Admins can manage templates') THEN
      DROP POLICY "Admins can manage templates" ON public.mockup_templates;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mockup_templates' AND policyname='Admins can manage templates') THEN
      CREATE POLICY "Admins can manage templates" ON public.mockup_templates
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
  END IF;
END $$;

-- Mensagem de sucesso
SELECT 'Migration 003 concluída: RLS Policies aplicadas!' as message;
