-- Tabela local de overrides de validade de preço por produto.
-- O BD externo (catálogo) é SSOT do produto, mas a janela de validade é um
-- conceito operacional do nosso vendedor — fica isolada aqui.
CREATE TABLE IF NOT EXISTS public.product_price_freshness_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL UNIQUE,
  threshold_days int NOT NULL CHECK (threshold_days IN (30, 60, 90)),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pfo_product_id
  ON public.product_price_freshness_overrides (product_id);

ALTER TABLE public.product_price_freshness_overrides ENABLE ROW LEVEL SECURITY;

-- Leitura: todo autenticado (badge precisa do valor para qualquer vendedor).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_price_freshness_overrides' AND policyname = 'Authenticated can read freshness overrides') THEN
    CREATE POLICY "Authenticated can read freshness overrides"
      ON public.product_price_freshness_overrides
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Escrita: somente admins.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_price_freshness_overrides' AND policyname = 'Admins can insert freshness overrides') THEN
    CREATE POLICY "Admins can insert freshness overrides"
      ON public.product_price_freshness_overrides
      FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_price_freshness_overrides' AND policyname = 'Admins can update freshness overrides') THEN
    CREATE POLICY "Admins can update freshness overrides"
      ON public.product_price_freshness_overrides
      FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_price_freshness_overrides' AND policyname = 'Admins can delete freshness overrides') THEN
    CREATE POLICY "Admins can delete freshness overrides"
      ON public.product_price_freshness_overrides
      FOR DELETE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- updated_at automático.
DROP TRIGGER IF EXISTS trg_pfo_set_updated_at ON public.product_price_freshness_overrides;
CREATE TRIGGER trg_pfo_set_updated_at
  BEFORE UPDATE ON public.product_price_freshness_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.product_price_freshness_overrides IS
  'Override local da janela de validade de preço por produto (30/60/90 dias). Sobrescreve o valor padrão de 60 dias e tem precedência sobre qualquer valor que venha a ser exposto pelo BD externo no futuro.';