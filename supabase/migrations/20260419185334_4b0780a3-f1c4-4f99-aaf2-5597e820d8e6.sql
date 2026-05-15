-- Tabela de histórico de testes de conexões externas
CREATE TABLE IF NOT EXISTS public.connection_test_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.external_connections(id) ON DELETE CASCADE,
  tested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false,
  latency_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice principal de leitura
CREATE INDEX IF NOT EXISTS idx_connection_test_history_conn_time
  ON public.connection_test_history(connection_id, tested_at DESC);

-- RLS
ALTER TABLE public.connection_test_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'connection_test_history' AND policyname = 'Admins read connection_test_history') THEN
    CREATE POLICY "Admins read connection_test_history"
    ON public.connection_test_history
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'connection_test_history' AND policyname = 'Service role inserts connection_test_history') THEN
    CREATE POLICY "Service role inserts connection_test_history"
    ON public.connection_test_history
    FOR INSERT
    TO service_role
    WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'connection_test_history' AND policyname = 'Admins delete connection_test_history') THEN
    CREATE POLICY "Admins delete connection_test_history"
    ON public.connection_test_history
    FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Função de retenção: mantém últimos 200 por conexão
CREATE OR REPLACE FUNCTION public.trim_connection_test_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.connection_test_history
  WHERE connection_id = NEW.connection_id
    AND id NOT IN (
      SELECT id FROM public.connection_test_history
      WHERE connection_id = NEW.connection_id
      ORDER BY tested_at DESC
      LIMIT 200
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trim_connection_test_history ON public.connection_test_history;
CREATE TRIGGER trg_trim_connection_test_history
AFTER INSERT ON public.connection_test_history
FOR EACH ROW
EXECUTE FUNCTION public.trim_connection_test_history();