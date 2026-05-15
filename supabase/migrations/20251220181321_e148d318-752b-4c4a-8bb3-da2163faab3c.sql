
-- Create sales_goals table for tracking seller goals
CREATE TABLE IF NOT EXISTS public.sales_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'monthly', -- monthly, weekly, quarterly
  target_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  target_quotes INTEGER DEFAULT 0,
  current_quotes INTEGER DEFAULT 0,
  target_conversions INTEGER DEFAULT 0,
  current_conversions INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_achieved BOOLEAN DEFAULT false,
  achieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sales_goals' AND policyname = 'Users can view their own goals') THEN
    CREATE POLICY "Users can view their own goals"
    ON public.sales_goals
    FOR SELECT
    USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sales_goals' AND policyname = 'Users can create their own goals') THEN
    CREATE POLICY "Users can create their own goals"
    ON public.sales_goals
    FOR INSERT
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sales_goals' AND policyname = 'Users can update their own goals') THEN
    CREATE POLICY "Users can update their own goals"
    ON public.sales_goals
    FOR UPDATE
    USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sales_goals' AND policyname = 'Users can delete their own goals') THEN
    CREATE POLICY "Users can delete their own goals"
    ON public.sales_goals
    FOR DELETE
    USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_sales_goals_updated_at ON public.sales_goals;
CREATE TRIGGER update_sales_goals_updated_at
BEFORE UPDATE ON public.sales_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sales_goals_user_date ON public.sales_goals(user_id, start_date, end_date);
