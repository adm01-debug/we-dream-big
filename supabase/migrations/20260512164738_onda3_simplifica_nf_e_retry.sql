-- ============================================================
--  Ajustes Onda 3.1 pós-decisões de design:
--  1) Chave NF agora opcional (só número obrigatório no fluxo)
--  2) Campos pra rastrear tentativas do cron (retry indefinido)
-- ============================================================
--
-- Nota de sincronização (2026-05-12, T19 redeploy Fase 1):
-- Migration aplicada direto no banco prod via MCP e órfã no repo até agora.
-- ============================================================

-- 1) Remove o CHECK rígido de chave_nf (continua aceitando 44 dígitos OU vazio)
ALTER TABLE public.cotacoes
  DROP CONSTRAINT IF EXISTS cotacoes_chave_nf_check;

-- Mantém o check só pra garantir formato quando preenchida (44 dígitos)
ALTER TABLE public.cotacoes
  ADD CONSTRAINT cotacoes_chave_nf_check
  CHECK (chave_nf IS NULL OR chave_nf = '' OR chave_nf ~ '^\d{44}$');

-- 2) Campos pra observabilidade do cron
ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS tracking_ultima_tentativa  timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_ultimo_sucesso    timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_falhas_seguidas   int default 0,
  ADD COLUMN IF NOT EXISTS tracking_ultimo_erro       text;

-- Index pra cron varrer eficientemente
CREATE INDEX IF NOT EXISTS idx_cotacoes_cron_scan
  ON public.cotacoes(tracking_ultima_tentativa NULLS FIRST)
  WHERE tracking_ativo = true
    AND status IN ('aguardando_coleta','em_transito','em_risco','atrasado');

COMMENT ON COLUMN public.cotacoes.tracking_falhas_seguidas IS
  'Contador de falhas consecutivas. Útil pra debug, mas cron tenta sempre.';
