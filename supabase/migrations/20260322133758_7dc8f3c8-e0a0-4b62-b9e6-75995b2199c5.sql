
-- Tabela para persistir kits customizados montados pelos vendedores
CREATE TABLE IF NOT EXISTS public.custom_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Kit sem nome',
  status text NOT NULL DEFAULT 'draft',
  box_data jsonb DEFAULT NULL,
  items_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  personalization_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  kit_quantity integer NOT NULL DEFAULT 1,
  box_price numeric NOT NULL DEFAULT 0,
  items_price numeric NOT NULL DEFAULT 0,
  personalization_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  volume_usage_percent numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.custom_kits ENABLE ROW LEVEL SECURITY;

-- Vendedores gerenciam seus próprios kits
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_kits' AND policyname = 'Users can manage own kits') THEN
    CREATE POLICY "Users can manage own kits"
      ON public.custom_kits
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Admins podem ler todos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_kits' AND policyname = 'Admins can read all kits') THEN
    CREATE POLICY "Admins can read all kits"
      ON public.custom_kits
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
