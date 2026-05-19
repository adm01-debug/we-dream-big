-- Tabela para telemetria de frontend (Erros, Performance, UX)
CREATE TABLE IF NOT EXISTS public.frontend_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'error', 'performance', 'ux_action', 'api_fail'
    name TEXT NOT NULL,
    duration_ms FLOAT,
    metadata JSONB DEFAULT '{}'::jsonb,
    url TEXT,
    user_agent TEXT,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexação para performance de busca no dashboard
CREATE INDEX IF NOT EXISTS idx_telemetry_event_type ON public.frontend_telemetry(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON public.frontend_telemetry(created_at);

-- Habilitar RLS
ALTER TABLE public.frontend_telemetry ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Anyone can insert telemetry" ON public.frontend_telemetry 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view telemetry" ON public.frontend_telemetry 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'supervisor')
        )
    );

CREATE POLICY "Admins can cleanup telemetry" ON public.frontend_telemetry 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'supervisor')
        )
    );

-- Função para limpeza automática (manter apenas 15 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_telemetry() 
RETURNS trigger AS $$
BEGIN
    DELETE FROM public.frontend_telemetry WHERE created_at < now() - interval '15 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para execução periódica (aproximada por inserções)
CREATE TRIGGER trigger_cleanup_telemetry
    AFTER INSERT ON public.frontend_telemetry
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.cleanup_old_telemetry();
