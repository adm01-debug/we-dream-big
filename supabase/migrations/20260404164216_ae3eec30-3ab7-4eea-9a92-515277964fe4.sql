DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Only admins can update product videos') THEN
    CREATE POLICY "Only admins can update product videos"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'product-videos' AND has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (bucket_id = 'product-videos' AND has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
