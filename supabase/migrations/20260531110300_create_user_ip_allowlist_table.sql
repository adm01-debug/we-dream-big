-- Per-user IP allowlist (distinct from global ip_access_control)
-- Allows each user account to be restricted to specific IP addresses
CREATE TABLE IF NOT EXISTS public.user_ip_allowlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, ip_address)
);

ALTER TABLE public.user_ip_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage user IP allowlist"
  ON public.user_ip_allowlist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'dev')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'dev')
    )
  );

CREATE POLICY "Users can read own IP allowlist"
  ON public.user_ip_allowlist
  FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_ip_allowlist_user_id ON public.user_ip_allowlist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ip_allowlist_ip ON public.user_ip_allowlist(ip_address);
