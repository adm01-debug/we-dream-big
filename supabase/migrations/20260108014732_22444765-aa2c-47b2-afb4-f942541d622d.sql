-- =============================================
-- ESTRUTURA DE CLIENTES NATIVA - GIFTS STORE
-- Modelo: Empresa → Contatos (com múltiplos telefones/emails)
-- =============================================

-- 1. TABELA PRINCIPAL: EMPRESAS (CLIENTES)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Dados Cadastrais
  cnpj TEXT UNIQUE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  
  -- Endereço Principal
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  pais TEXT DEFAULT 'Brasil',
  
  -- Dados Comerciais
  ramo TEXT,
  nicho TEXT,
  porte TEXT, -- 'micro', 'pequena', 'media', 'grande'
  faturamento_estimado NUMERIC,
  numero_funcionarios INTEGER,
  
  -- Branding (para mockups)
  logo_url TEXT,
  cor_primaria_hex TEXT,
  cor_primaria_nome TEXT,
  cor_secundaria_hex TEXT,
  cor_secundaria_nome TEXT,
  
  -- Relacionamento
  origem TEXT, -- 'indicacao', 'site', 'feira', 'prospeccao', 'bitrix'
  responsavel_id UUID, -- vendedor responsável
  
  -- Financeiro
  limite_credito NUMERIC DEFAULT 0,
  prazo_pagamento_dias INTEGER DEFAULT 30,
  condicao_pagamento TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'inativo', 'prospect', 'bloqueado'
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Vínculo Bitrix (opcional)
  bitrix_id TEXT,
  bitrix_synced_at TIMESTAMPTZ,
  
  -- Métricas
  total_pedidos INTEGER DEFAULT 0,
  total_gasto NUMERIC DEFAULT 0,
  ultima_compra_em TIMESTAMPTZ,
  
  -- Observações
  notas TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- 2. TABELA: CONTATOS DA EMPRESA
CREATE TABLE IF NOT EXISTS public.company_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Dados Pessoais
  nome TEXT NOT NULL,
  sobrenome TEXT,
  apelido TEXT,
  
  -- Cargo/Função
  cargo TEXT,
  departamento TEXT, -- 'compras', 'financeiro', 'marketing', 'diretoria'
  
  -- Poder de Decisão
  poder_decisao TEXT DEFAULT 'influenciador', -- 'decisor', 'influenciador', 'usuario', 'tecnico'
  is_principal BOOLEAN DEFAULT false, -- Contato principal da empresa
  
  -- Comunicação preferida
  canal_preferido TEXT DEFAULT 'whatsapp', -- 'email', 'whatsapp', 'telefone', 'presencial'
  melhor_horario TEXT,
  
  -- Pessoal (relacionamento)
  data_aniversario DATE,
  linkedin_url TEXT,
  instagram_url TEXT,
  
  -- Preferências
  preferencias JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Observações
  notas TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABELA: TELEFONES DOS CONTATOS
CREATE TABLE IF NOT EXISTS public.contact_phones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.company_contacts(id) ON DELETE CASCADE,
  
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'celular', -- 'celular', 'comercial', 'residencial', 'whatsapp'
  is_whatsapp BOOLEAN DEFAULT false,
  is_principal BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABELA: EMAILS DOS CONTATOS
CREATE TABLE IF NOT EXISTS public.contact_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.company_contacts(id) ON DELETE CASCADE,
  
  email TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'comercial', -- 'comercial', 'pessoal', 'nfe', 'financeiro'
  is_principal BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABELA: ENDEREÇOS DE ENTREGA (múltiplos por empresa)
CREATE TABLE IF NOT EXISTS public.company_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  nome TEXT NOT NULL, -- 'Matriz', 'Filial SP', 'CD Campinas'
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  pais TEXT DEFAULT 'Brasil',
  
  tipo TEXT DEFAULT 'entrega', -- 'entrega', 'cobranca', 'filial'
  is_principal BOOLEAN DEFAULT false,
  
  contato_local TEXT,
  telefone_local TEXT,
  observacoes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_nome_fantasia ON public.companies(nome_fantasia);
CREATE INDEX IF NOT EXISTS idx_companies_razao_social ON public.companies(razao_social);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_ramo ON public.companies(ramo);
CREATE INDEX IF NOT EXISTS idx_companies_responsavel ON public.companies(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_companies_bitrix ON public.companies(bitrix_id);

CREATE INDEX IF NOT EXISTS idx_contacts_company ON public.company_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_nome ON public.company_contacts(nome);
CREATE INDEX IF NOT EXISTS idx_contacts_principal ON public.company_contacts(company_id, is_principal) WHERE is_principal = true;

CREATE INDEX IF NOT EXISTS idx_phones_contact ON public.contact_phones(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_contact ON public.contact_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_addresses_company ON public.company_addresses(company_id);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_addresses ENABLE ROW LEVEL SECURITY;

-- Companies: Usuários autenticados podem ver, admins podem gerenciar
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'companies' AND policyname = 'Authenticated users can view companies') THEN
    CREATE POLICY "Authenticated users can view companies"
      ON public.companies FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'companies' AND policyname = 'Admins can manage companies') THEN
    CREATE POLICY "Admins can manage companies"
      ON public.companies FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'companies' AND policyname = 'Sellers can create companies') THEN
    CREATE POLICY "Sellers can create companies"
      ON public.companies FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'companies' AND policyname = 'Sellers can update companies') THEN
    CREATE POLICY "Sellers can update companies"
      ON public.companies FOR UPDATE
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Contacts: Herda da empresa
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_contacts' AND policyname = 'Authenticated users can view contacts') THEN
    CREATE POLICY "Authenticated users can view contacts"
      ON public.company_contacts FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_contacts' AND policyname = 'Authenticated users can manage contacts') THEN
    CREATE POLICY "Authenticated users can manage contacts"
      ON public.company_contacts FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Phones: Herda do contato
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_phones' AND policyname = 'Authenticated users can view phones') THEN
    CREATE POLICY "Authenticated users can view phones"
      ON public.contact_phones FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_phones' AND policyname = 'Authenticated users can manage phones') THEN
    CREATE POLICY "Authenticated users can manage phones"
      ON public.contact_phones FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Emails: Herda do contato
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_emails' AND policyname = 'Authenticated users can view emails') THEN
    CREATE POLICY "Authenticated users can view emails"
      ON public.contact_emails FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_emails' AND policyname = 'Authenticated users can manage emails') THEN
    CREATE POLICY "Authenticated users can manage emails"
      ON public.contact_emails FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Addresses: Herda da empresa
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_addresses' AND policyname = 'Authenticated users can view addresses') THEN
    CREATE POLICY "Authenticated users can view addresses"
      ON public.company_addresses FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'company_addresses' AND policyname = 'Authenticated users can manage addresses') THEN
    CREATE POLICY "Authenticated users can manage addresses"
      ON public.company_addresses FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_contacts_updated_at ON public.company_contacts;
CREATE TRIGGER update_company_contacts_updated_at
  BEFORE UPDATE ON public.company_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_addresses_updated_at ON public.company_addresses;
CREATE TRIGGER update_company_addresses_updated_at
  BEFORE UPDATE ON public.company_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();