CREATE TABLE IF NOT EXISTS public.sales_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('monthly', 'weekly', 'quarterly')),
  target_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  target_quotes INTEGER NOT NULL DEFAULT 0,
  current_quotes INTEGER NOT NULL DEFAULT 0,
  target_conversions INTEGER NOT NULL DEFAULT 0,
  current_conversions INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_achieved BOOLEAN NOT NULL DEFAULT FALSE,
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
  ON public.sales_goals
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_sales_goals_user_id ON public.sales_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_goals_date_range ON public.sales_goals(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sales_goals_user_active ON public.sales_goals(user_id, start_date, end_date) WHERE NOT is_achieved;
