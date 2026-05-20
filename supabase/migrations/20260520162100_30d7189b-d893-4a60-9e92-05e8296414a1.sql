-- Add description column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_settings' AND column_name='description') THEN
        ALTER TABLE public.system_settings ADD COLUMN description TEXT;
    END IF;
END $$;

-- Insert default maintenance_mode if not exists
INSERT INTO public.system_settings (key, value, description)
VALUES ('maintenance_mode', 'false', 'Enable or disable global maintenance mode')
ON CONFLICT (key) DO NOTHING;
