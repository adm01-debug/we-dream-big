
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'query_telemetry' AND policyname = 'Admins can delete telemetry') THEN
    CREATE POLICY "Admins can delete telemetry"
    ON public.query_telemetry FOR DELETE
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'query_telemetry' AND policyname = 'Service can insert telemetry') THEN
    CREATE POLICY "Service can insert telemetry"
    ON public.query_telemetry FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;
