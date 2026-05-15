-- Adicionar campos faltantes em profiles conforme especificação
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'seller',
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

-- Copiar role existente do role_id para o novo campo role (se existir dados)
UPDATE public.profiles p
SET role = COALESCE(
  (SELECT r.name FROM public.roles r WHERE r.id = p.role_id),
  'seller'
)
WHERE p.role IS NULL;