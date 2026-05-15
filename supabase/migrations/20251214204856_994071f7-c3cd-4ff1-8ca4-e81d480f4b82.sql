-- Add max_colors field to product_component_location_techniques
ALTER TABLE public.product_component_location_techniques
ADD COLUMN IF NOT EXISTS max_colors integer DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.product_component_location_techniques.max_colors IS 'Maximum number of colors allowed for this technique in this location';

-- Create product_groups table for grouping products with shared personalization rules
CREATE TABLE IF NOT EXISTS public.product_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_code text NOT NULL UNIQUE,
  group_name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on product_groups
ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_groups
DROP POLICY IF EXISTS "Authenticated users can view groups" ON public.product_groups;
CREATE POLICY "Authenticated users can view groups"
ON public.product_groups
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage groups" ON public.product_groups;
CREATE POLICY "Admins can manage groups"
ON public.product_groups
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create product_group_members to link products to groups
CREATE TABLE IF NOT EXISTS public.product_group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_group_id uuid NOT NULL REFERENCES public.product_groups(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_group_id, product_id)
);

-- Enable RLS on product_group_members
ALTER TABLE public.product_group_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_group_members
DROP POLICY IF EXISTS "Authenticated users can view group members" ON public.product_group_members;
CREATE POLICY "Authenticated users can view group members"
ON public.product_group_members
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage group members" ON public.product_group_members;
CREATE POLICY "Admins can manage group members"
ON public.product_group_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create group-level component templates
CREATE TABLE IF NOT EXISTS public.product_group_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_group_id uuid NOT NULL REFERENCES public.product_groups(id) ON DELETE CASCADE,
  component_code text NOT NULL,
  component_name text NOT NULL,
  is_personalizable boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_group_id, component_code)
);

-- Enable RLS on product_group_components
ALTER TABLE public.product_group_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view group components" ON public.product_group_components;
CREATE POLICY "Authenticated users can view group components"
ON public.product_group_components
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage group components" ON public.product_group_components;
CREATE POLICY "Admins can manage group components"
ON public.product_group_components
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create group-level location templates
CREATE TABLE IF NOT EXISTS public.product_group_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_component_id uuid NOT NULL REFERENCES public.product_group_components(id) ON DELETE CASCADE,
  location_code text NOT NULL,
  location_name text NOT NULL,
  max_width_cm numeric,
  max_height_cm numeric,
  max_area_cm2 numeric,
  area_image_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_component_id, location_code)
);

-- Enable RLS on product_group_locations
ALTER TABLE public.product_group_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view group locations" ON public.product_group_locations;
CREATE POLICY "Authenticated users can view group locations"
ON public.product_group_locations
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage group locations" ON public.product_group_locations;
CREATE POLICY "Admins can manage group locations"
ON public.product_group_locations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create group-level technique associations with max_colors
CREATE TABLE IF NOT EXISTS public.product_group_location_techniques (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_location_id uuid NOT NULL REFERENCES public.product_group_locations(id) ON DELETE CASCADE,
  technique_id uuid NOT NULL REFERENCES public.personalization_techniques(id) ON DELETE CASCADE,
  max_colors integer,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_location_id, technique_id)
);

-- Enable RLS on product_group_location_techniques
ALTER TABLE public.product_group_location_techniques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view group location techniques" ON public.product_group_location_techniques;
CREATE POLICY "Authenticated users can view group location techniques"
ON public.product_group_location_techniques
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage group location techniques" ON public.product_group_location_techniques;
CREATE POLICY "Admins can manage group location techniques"
ON public.product_group_location_techniques
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at on product_groups
DROP TRIGGER IF EXISTS update_product_groups_updated_at ON public.product_groups;
CREATE TRIGGER update_product_groups_updated_at
BEFORE UPDATE ON public.product_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();