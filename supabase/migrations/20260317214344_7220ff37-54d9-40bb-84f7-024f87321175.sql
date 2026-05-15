
-- Tokens for public quote approval links
CREATE TABLE IF NOT EXISTS public.quote_approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT,
  client_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response TEXT,
  response_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_approval_tokens' AND column_name='seller_id') THEN
    ALTER TABLE public.quote_approval_tokens ADD COLUMN seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_approval_tokens' AND column_name='status') THEN
    ALTER TABLE public.quote_approval_tokens ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_approval_tokens' AND column_name='client_name') THEN
    ALTER TABLE public.quote_approval_tokens ADD COLUMN client_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_approval_tokens' AND column_name='client_email') THEN
    ALTER TABLE public.quote_approval_tokens ADD COLUMN client_email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_approval_tokens' AND column_name='response') THEN
    ALTER TABLE public.quote_approval_tokens ADD COLUMN response TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_approval_tokens' AND column_name='response_notes') THEN
    ALTER TABLE public.quote_approval_tokens ADD COLUMN response_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_approval_tokens' AND column_name='responded_at') THEN
    ALTER TABLE public.quote_approval_tokens ADD COLUMN responded_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_approval_tokens' AND column_name='viewed_at') THEN
    ALTER TABLE public.quote_approval_tokens ADD COLUMN viewed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_approval_tokens' AND column_name='updated_at') THEN
    ALTER TABLE public.quote_approval_tokens ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

ALTER TABLE public.quote_approval_tokens ENABLE ROW LEVEL SECURITY;

-- Sellers can manage their own tokens
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_approval_tokens' AND policyname='Users can manage own approval tokens') THEN
    CREATE POLICY "Users can manage own approval tokens"
      ON public.quote_approval_tokens FOR ALL
      TO authenticated
      USING (seller_id = auth.uid())
      WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

-- Anon users can read tokens by token value (for public page)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_approval_tokens' AND policyname='Anyone can read by token') THEN
    CREATE POLICY "Anyone can read by token"
      ON public.quote_approval_tokens FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Anon users can update response fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quote_approval_tokens' AND policyname='Anyone can update response') THEN
    CREATE POLICY "Anyone can update response"
      ON public.quote_approval_tokens FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_approval_tokens_token ON public.quote_approval_tokens(token);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_quote ON public.quote_approval_tokens(quote_id);

-- Follow-up reminders for expiring quotes
CREATE TABLE IF NOT EXISTS public.follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'expiring',
  scheduled_for TIMESTAMPTZ NOT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='follow_up_reminders' AND column_name='seller_id') THEN
    ALTER TABLE public.follow_up_reminders ADD COLUMN seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='follow_up_reminders' AND column_name='scheduled_for') THEN
    ALTER TABLE public.follow_up_reminders ADD COLUMN scheduled_for TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='follow_up_reminders' AND column_name='reminder_type') THEN
    ALTER TABLE public.follow_up_reminders ADD COLUMN reminder_type TEXT NOT NULL DEFAULT 'expiring';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='follow_up_reminders' AND column_name='is_sent') THEN
    ALTER TABLE public.follow_up_reminders ADD COLUMN is_sent BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='follow_up_reminders' AND column_name='sent_at') THEN
    ALTER TABLE public.follow_up_reminders ADD COLUMN sent_at TIMESTAMPTZ;
  END IF;
END $$;

ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='follow_up_reminders' AND policyname='Users can manage own reminders') THEN
    CREATE POLICY "Users can manage own reminders"
      ON public.follow_up_reminders FOR ALL
      TO authenticated
      USING (seller_id = auth.uid())
      WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_follow_up_pending ON public.follow_up_reminders(is_sent, scheduled_for);
