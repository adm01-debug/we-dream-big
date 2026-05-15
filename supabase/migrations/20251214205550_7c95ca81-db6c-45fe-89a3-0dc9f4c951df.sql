-- Add use_group_rules flag to product_group_members
ALTER TABLE public.product_group_members
ADD COLUMN IF NOT EXISTS use_group_rules boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.product_group_members.use_group_rules IS 'If true, product inherits rules from group. If false, uses custom product-specific rules.';

-- Add max_colors to product_component_location_techniques if not exists
ALTER TABLE public.product_component_location_techniques
ADD COLUMN IF NOT EXISTS max_colors integer DEFAULT NULL;