-- ============================================================
--  Onda 3.1: NF + Tracking + Eventos + Storage
-- ============================================================
--
-- Nota de sincronização (2026-05-12, T19 redeploy Fase 1):
-- Migration aplicada direto no banco prod via MCP e órfã no repo até agora.
-- ============================================================

-- 1) Adiciona campos novos em cotacoes
ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS numero_nf            text,
  ADD COLUMN IF NOT EXISTS chave_nf             text,
  ADD COLUMN IF NOT EXISTS data_emissao_nf      timestamptz,
  ADD COLUMN IF NOT EXISTS data_coleta          timestamptz,
  ADD COLUMN IF NOT EXISTS data_prevista        date,
  ADD COLUMN IF NOT EXISTS data_entrega         timestamptz,
  ADD COLUMN IF NOT EXISTS protocolo_atual      text,
  ADD COLUMN IF NOT EXISTS ultimo_evento        text,
  ADD COLUMN IF NOT EXISTS ultimo_evento_em     timestamptz,
  ADD COLUMN IF NOT EXISTS recibo_url           text,
  ADD COLUMN IF NOT EXISTS tracking_ativo       boolean default false,
  ADD COLUMN IF NOT EXISTS proxima_consulta_em  timestamptz;

-- Constraint pra chave_nf ter exatamente 44 dígitos (se preenchida)
ALTER TABLE public.cotacoes
  DROP CONSTRAINT IF EXISTS cotacoes_chave_nf_check;
ALTER TABLE public.cotacoes
  ADD CONSTRAINT cotacoes_chave_nf_check
  CHECK (chave_nf IS NULL OR chave_nf ~ '^\d{44}$');

-- 2) Atualiza máquina de estados (status)
ALTER TABLE public.cotacoes
  DROP CONSTRAINT IF EXISTS cotacoes_status_check;
ALTER TABLE public.cotacoes
  ADD CONSTRAINT cotacoes_status_check
  CHECK (status IN (
    'cotado',
    'aguardando_coleta',
    'em_transito',
    'em_risco',
    'atrasado',
    'entregue',
    'cancelado'
  ));

-- 3) Index pro cron varrer rápido só os status que precisa
CREATE INDEX IF NOT EXISTS idx_cotacoes_tracking_ativo
  ON public.cotacoes(status, proxima_consulta_em)
  WHERE tracking_ativo = true;

CREATE INDEX IF NOT EXISTS idx_cotacoes_chave_nf
  ON public.cotacoes(chave_nf)
  WHERE chave_nf IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cotacoes_protocolo_atual
  ON public.cotacoes(protocolo_atual)
  WHERE protocolo_atual IS NOT NULL;

-- 4) Inicializa protocolo_atual a partir de numero_cotacao em registros existentes
UPDATE public.cotacoes
SET protocolo_atual = numero_cotacao
WHERE protocolo_atual IS NULL AND numero_cotacao IS NOT NULL;

-- 5) Tabela de eventos de tracking
CREATE TABLE IF NOT EXISTS public.cotacao_eventos (
  id              uuid primary key default gen_random_uuid(),
  cotacao_id      uuid not null references public.cotacoes(id) on delete cascade,
  ocorrido_em     timestamptz not null,
  descricao       text not null,
  codigo_evento   text,
  fonte           text not null,
  raw             jsonb,
  created_at      timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_cotacao_eventos_cotacao_id ON public.cotacao_eventos(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_eventos_ocorrido_em ON public.cotacao_eventos(ocorrido_em DESC);

-- Dedup: não duplica eventos iguais pra mesma cotação
CREATE UNIQUE INDEX IF NOT EXISTS uq_cotacao_eventos_dedup
  ON public.cotacao_eventos(cotacao_id, descricao, ocorrido_em);

-- 6) RLS na nova tabela (mesmo padrão de cotacoes: transparência interna)
ALTER TABLE public.cotacao_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos_select_authenticated" ON public.cotacao_eventos;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cotacao_eventos' AND policyname = 'eventos_select_authenticated') THEN
    CREATE POLICY "eventos_select_authenticated"
      ON public.cotacao_eventos FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DROP POLICY IF EXISTS "eventos_insert_service_role" ON public.cotacao_eventos;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cotacao_eventos' AND policyname = 'eventos_insert_service_role') THEN
    CREATE POLICY "eventos_insert_service_role"
      ON public.cotacao_eventos FOR INSERT
      TO authenticated, service_role
      WITH CHECK (true);
  END IF;
END $$;

-- DELETE bloqueado (auditoria)

COMMENT ON TABLE public.cotacao_eventos IS
  'Histórico completo de eventos de tracking por cotação. Imutável.';
