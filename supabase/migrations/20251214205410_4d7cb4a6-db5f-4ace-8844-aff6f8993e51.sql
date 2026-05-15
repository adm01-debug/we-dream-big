-- Create storage bucket for personalization area images
INSERT INTO storage.buckets (id, name, public)
VALUES ('personalization-images', 'personalization-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view images
DROP POLICY IF EXISTS "Anyone can view personalization images" ON storage.objects;
CREATE POLICY "Anyone can view personalization images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'personalization-images');

-- Allow admins to upload images
DROP POLICY IF EXISTS "Admins can upload personalization images" ON storage.objects;
CREATE POLICY "Admins can upload personalization images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'personalization-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update images
DROP POLICY IF EXISTS "Admins can update personalization images" ON storage.objects;
CREATE POLICY "Admins can update personalization images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'personalization-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete images
DROP POLICY IF EXISTS "Admins can delete personalization images" ON storage.objects;
CREATE POLICY "Admins can delete personalization images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'personalization-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);