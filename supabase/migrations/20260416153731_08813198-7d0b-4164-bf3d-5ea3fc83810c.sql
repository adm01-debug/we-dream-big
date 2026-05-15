-- Add agenda fields to follow_up_reminders
ALTER TABLE public.follow_up_reminders 
  ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- CREATE INDEX IF NOT EXISTS for agenda queries
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_seller_scheduled
  ON public.follow_up_reminders (seller_id, scheduled_for DESC);

CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_completed
  ON public.follow_up_reminders (is_completed, scheduled_for);