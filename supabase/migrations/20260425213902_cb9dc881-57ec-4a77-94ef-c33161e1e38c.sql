-- Adiciona ações step-up dedicadas para revoke e rotate de chaves MCP.
-- Antes, somente "mcp_full_issue" cobria emissão e rotação de chaves full.
-- Agora, toda operação sensível (issue, rotate, revoke) tem sua ação própria,
-- permitindo auditoria mais granular em step_up_audit_log.
ALTER TYPE public.step_up_action ADD VALUE IF NOT EXISTS 'mcp_key_revoke';
ALTER TYPE public.step_up_action ADD VALUE IF NOT EXISTS 'mcp_key_rotate';