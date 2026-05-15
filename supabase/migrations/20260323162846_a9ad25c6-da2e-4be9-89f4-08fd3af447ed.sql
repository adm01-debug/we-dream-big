-- Junction table: maps app_role enum to permission codes
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission_code)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage role_permissions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_permissions' AND policyname = 'Admins can manage role_permissions') THEN
    CREATE POLICY "Admins can manage role_permissions"
      ON public.role_permissions FOR ALL
      TO authenticated
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Authenticated users can read role_permissions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_permissions' AND policyname = 'Authenticated users can read role_permissions') THEN
    CREATE POLICY "Authenticated users can read role_permissions"
      ON public.role_permissions FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Seed: Admin gets all permissions
INSERT INTO public.role_permissions (role, permission_code)
SELECT 'admin'::app_role, code FROM public.permissions;

-- Seed: Manager permissions
INSERT INTO public.role_permissions (role, permission_code) VALUES
  ('manager', 'view_products'),
  ('manager', 'create_products'),
  ('manager', 'edit_products'),
  ('manager', 'delete_products'),
  ('manager', 'import_products'),
  ('manager', 'manage_suppliers'),
  ('manager', 'manage_categories'),
  ('manager', 'manage_kits'),
  ('manager', 'view_clients'),
  ('manager', 'edit_clients'),
  ('manager', 'view_quotes'),
  ('manager', 'create_quotes'),
  ('manager', 'edit_quotes'),
  ('manager', 'delete_quotes'),
  ('manager', 'approve_quotes'),
  ('manager', 'view_orders'),
  ('manager', 'create_orders'),
  ('manager', 'edit_orders'),
  ('manager', 'manage_orders'),
  ('manager', 'view_reports'),
  ('manager', 'export_reports'),
  ('manager', 'view_dashboard'),
  ('manager', 'view_mockups'),
  ('manager', 'create_mockups'),
  ('manager', 'use_expert_ai'),
  ('manager', 'manage_team');

-- Seed: Seller (vendedor) permissions
INSERT INTO public.role_permissions (role, permission_code) VALUES
  ('vendedor', 'view_products'),
  ('vendedor', 'view_clients'),
  ('vendedor', 'view_quotes'),
  ('vendedor', 'create_quotes'),
  ('vendedor', 'edit_quotes'),
  ('vendedor', 'view_orders'),
  ('vendedor', 'create_orders'),
  ('vendedor', 'view_mockups'),
  ('vendedor', 'create_mockups'),
  ('vendedor', 'view_dashboard'),
  ('vendedor', 'use_expert_ai'),
  ('vendedor', 'manage_kits');