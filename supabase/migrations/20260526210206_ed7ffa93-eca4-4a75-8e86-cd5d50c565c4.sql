-- Migration corrigida (26/05/2026): Lovable bot usou ON CONFLICT DO UPDATE
-- que rebaixaria quotas existentes (manager 5000→1000, supervisor 5000→1000, agente 1000→200).
-- Corrigido para ON CONFLICT DO NOTHING — preserva valores atuais, insere apenas roles ausentes.
INSERT INTO public.ai_usage_quotas (role, monthly_limit, is_unlimited)
VALUES 
  ('admin',         0, true),
  ('dev',           0, true),
  ('manager',    5000, false),
  ('supervisor', 5000, false),
  ('vendedor',    500, false),
  ('agente',     1000, false),
  ('coordenador', 1000, false)
ON CONFLICT (role) DO NOTHING;
