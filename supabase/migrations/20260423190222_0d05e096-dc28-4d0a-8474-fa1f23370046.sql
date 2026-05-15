-- Required for upsert(onConflict: "type,name") path used when env_key is null.
-- Partial index avoids clashing with existing supabase env_key uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS external_connections_type_name_no_env_uidx
  ON public.external_connections (type, name)
  WHERE env_key IS NULL;