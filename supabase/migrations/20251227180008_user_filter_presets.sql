CREATE TABLE IF NOT EXISTS user_filter_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  context TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table created by legacy migration with different schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_filter_presets' AND column_name='context') THEN
    ALTER TABLE user_filter_presets ADD COLUMN context TEXT NOT NULL DEFAULT 'catalog';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_filter_presets' AND column_name='name') THEN
    ALTER TABLE user_filter_presets ADD COLUMN name TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_filter_presets' AND column_name='filters') THEN
    ALTER TABLE user_filter_presets ADD COLUMN filters JSONB NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_filter_presets' AND column_name='is_default') THEN
    ALTER TABLE user_filter_presets ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_filters_user ON user_filter_presets(user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_filter_presets' AND column_name='context') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_user_filters_context') THEN
      EXECUTE 'CREATE INDEX idx_user_filters_context ON user_filter_presets(context)';
    END IF;
  END IF;
END $$;

ALTER TABLE user_filter_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own filters" ON user_filter_presets;
CREATE POLICY "Users manage own filters"
  ON user_filter_presets FOR ALL
  USING (auth.uid() = user_id);
