CREATE TABLE IF NOT EXISTS quote_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  mentioned_users UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_comments_quote ON quote_comments(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_comments_created ON quote_comments(created_at DESC);

ALTER TABLE quote_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments on accessible quotes" ON quote_comments;
CREATE POLICY "Users can view comments on accessible quotes"
  ON quote_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_comments.quote_id
      AND (quotes.seller_id = auth.uid() OR quotes.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create comments" ON quote_comments;
CREATE POLICY "Users can create comments"
  ON quote_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
