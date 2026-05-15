-- Add client_name column to generated_mockups for denormalized client filtering
ALTER TABLE public.generated_mockups ADD COLUMN IF NOT EXISTS client_name text;