-- Create table for Bitrix24 clients
CREATE TABLE IF NOT EXISTS public.bitrix_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bitrix_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  ramo TEXT,
  nicho TEXT,
  primary_color_name TEXT,
  primary_color_hex TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_purchase_date TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for Bitrix24 deals (purchase history)
CREATE TABLE IF NOT EXISTS public.bitrix_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bitrix_id TEXT NOT NULL UNIQUE,
  bitrix_client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  value DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  stage TEXT,
  close_date TIMESTAMPTZ,
  created_at_bitrix TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for sync history logs
CREATE TABLE IF NOT EXISTS public.bitrix_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  synced_by UUID REFERENCES auth.users(id),
  clients_synced INTEGER DEFAULT 0,
  deals_synced INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bitrix_clients_bitrix_id ON public.bitrix_clients(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_bitrix_deals_client_id ON public.bitrix_deals(bitrix_client_id);
CREATE INDEX IF NOT EXISTS idx_bitrix_sync_logs_synced_by ON public.bitrix_sync_logs(synced_by);

-- Enable RLS
ALTER TABLE public.bitrix_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitrix_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitrix_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated users can read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bitrix_clients' AND policyname = 'Authenticated users can view clients') THEN
    CREATE POLICY "Authenticated users can view clients"
    ON public.bitrix_clients FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bitrix_deals' AND policyname = 'Authenticated users can view deals') THEN
    CREATE POLICY "Authenticated users can view deals"
    ON public.bitrix_deals FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bitrix_sync_logs' AND policyname = 'Authenticated users can view sync logs') THEN
    CREATE POLICY "Authenticated users can view sync logs"
    ON public.bitrix_sync_logs FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Only admins or service role can insert/update (via edge function)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bitrix_clients' AND policyname = 'Service can manage clients') THEN
    CREATE POLICY "Service can manage clients"
    ON public.bitrix_clients FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bitrix_deals' AND policyname = 'Service can manage deals') THEN
    CREATE POLICY "Service can manage deals"
    ON public.bitrix_deals FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bitrix_sync_logs' AND policyname = 'Service can manage sync logs') THEN
    CREATE POLICY "Service can manage sync logs"
    ON public.bitrix_sync_logs FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Update trigger for clients
DROP TRIGGER IF EXISTS update_bitrix_clients_updated_at ON public.bitrix_clients;
CREATE TRIGGER update_bitrix_clients_updated_at
BEFORE UPDATE ON public.bitrix_clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();