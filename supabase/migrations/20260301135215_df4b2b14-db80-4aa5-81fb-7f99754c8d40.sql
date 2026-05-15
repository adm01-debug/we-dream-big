-- Add layout_url column to store the full approval layout image
ALTER TABLE public.generated_mockups 
ADD COLUMN IF NOT EXISTS layout_url TEXT,
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS colors_count INTEGER;