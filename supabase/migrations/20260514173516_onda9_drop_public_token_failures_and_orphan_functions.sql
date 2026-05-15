-- Onda 9 (B-8 da auditoria de 10/mai/2026): drop public_token_tables + cleanup completo.
--
-- CONTEXTO:
-- Rotas publicas com token (/approve/:token, /proposta/:token, /kit/:token,
-- /lista-publica/, /colecao-publica/, /comparar-publica/, /dossie) foram descontinuadas
-- em 07/mai/2026 por decisao do PO (Joaquim). 7 rotas + 6 edge functions + codigo
-- frontend ja removidos. Migration original 20260507161547_drop_public_token_tables.sql
-- foi parcialmente aplicada em algum ponto: dropou quote_approval_tokens e
-- kit_share_tokens, mas public_token_failures FICOU NO BANCO (0 rows mas existente).
--
-- INVESTIGACAO PRE-DROP:
--   - public_token_failures: 0 rows
--   - 2 funcoes referenciam: auto_block_extreme_offenders, cleanup_security_logs
--   - Zero cron jobs ativos chamando essas funcoes
--   - Zero callers no repo (code_search confirmou frontend e edges nao chamam)
--   - Tabela nao tem FKs apontando pra ela
--
-- DECISAO (Opcao A escolhida pelo PO):
-- Drop TUDO. As funcoes auto_block_extreme_offenders e cleanup_security_logs sao
-- codigo morto completo (sem cron, sem caller). Se futuramente quisermos
-- defesa-em-profundidade equivalente, reescreveremos com base nas tabelas atuais
-- (login_attempts, bot_detection_log) sem dependencia de tabelas extintas.
--
-- APLICADA EM PROD em 14/mai/2026 17:35 UTC via MCP apply_migration (ADR 0006).
-- Esta migration substitui (consolida) a 20260507161547_drop_public_token_tables.sql
-- que estava marcada como "PREPARED but NOT YET APPLIED".

BEGIN;

-- 1. Drop funcoes orfas que dependiam de public_token_failures
DROP FUNCTION IF EXISTS public.auto_block_extreme_offenders();
DROP FUNCTION IF EXISTS public.cleanup_security_logs();

-- 2. Drop tabela orfa (com CASCADE para qualquer dependente residual)
DROP TABLE IF EXISTS public.public_token_failures CASCADE;

-- 3. As outras 2 tabelas listadas em B-8 ja foram dropadas anteriormente,
--    mas reaplicamos com IF EXISTS para idempotencia e clareza historica.
DROP TABLE IF EXISTS public.quote_approval_tokens CASCADE;
DROP TABLE IF EXISTS public.kit_share_tokens CASCADE;

COMMIT;
