-- Criar tabela de logs de varredura
CREATE TABLE IF NOT EXISTS public.file_scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    bucket VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    hash VARCHAR(64) NOT NULL, -- SHA-256
    scan_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    status_code INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_file_scan_logs_user_id ON public.file_scan_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_scan_logs_hash ON public.file_scan_logs(hash);

-- Habilitar RLS
ALTER TABLE public.file_scan_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'file_scan_logs' AND policyname = 'Apenas administradores podem visualizar logs de scan') THEN
    CREATE POLICY "Apenas administradores podem visualizar logs de scan"
    ON public.file_scan_logs FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'email' LIKE '%admin%');
  END IF;
END $$;

-- Nota: O sistema (Edge Function) usará Service Role para inserção.
