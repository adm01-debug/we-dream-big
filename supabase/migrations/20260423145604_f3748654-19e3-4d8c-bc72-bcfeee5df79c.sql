-- Tabela de credenciais persistidas para integrações
CREATE TABLE IF NOT EXISTS public.integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_name text NOT NULL UNIQUE,
  secret_value text NOT NULL,
  masked_suffix text,
  length integer,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_credentials_name
  ON public.integration_credentials (secret_name);

ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

-- RLS: somente admins
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integration_credentials' AND policyname = 'Admins can view integration credentials') THEN
    CREATE POLICY "Admins can view integration credentials"
      ON public.integration_credentials
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integration_credentials' AND policyname = 'Admins can insert integration credentials') THEN
    CREATE POLICY "Admins can insert integration credentials"
      ON public.integration_credentials
      FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integration_credentials' AND policyname = 'Admins can update integration credentials') THEN
    CREATE POLICY "Admins can update integration credentials"
      ON public.integration_credentials
      FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integration_credentials' AND policyname = 'Admins can delete integration credentials') THEN
    CREATE POLICY "Admins can delete integration credentials"
      ON public.integration_credentials
      FOR DELETE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Trigger: preenche masked_suffix e length automaticamente
CREATE OR REPLACE FUNCTION public.fill_integration_credential_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.length := COALESCE(char_length(NEW.secret_value), 0);
  IF NEW.length >= 4 THEN
    NEW.masked_suffix := right(NEW.secret_value, 4);
  ELSE
    NEW.masked_suffix := NEW.secret_value;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_integration_credential_metadata ON public.integration_credentials;
DROP TRIGGER IF EXISTS trg_fill_integration_credential_metadata ON public.integration_credentials;
CREATE TRIGGER trg_fill_integration_credential_metadata
  BEFORE INSERT OR UPDATE ON public.integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_integration_credential_metadata();