-- Create table for expert conversations
CREATE TABLE IF NOT EXISTS public.expert_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  client_id UUID REFERENCES public.bitrix_clients(id),
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for expert messages
CREATE TABLE IF NOT EXISTS public.expert_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.expert_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expert_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expert_conversations' AND policyname = 'Sellers can view their own conversations') THEN
    CREATE POLICY "Sellers can view their own conversations"
    ON public.expert_conversations FOR SELECT
    USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expert_conversations' AND policyname = 'Sellers can create their own conversations') THEN
    CREATE POLICY "Sellers can create their own conversations"
    ON public.expert_conversations FOR INSERT
    WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expert_conversations' AND policyname = 'Sellers can update their own conversations') THEN
    CREATE POLICY "Sellers can update their own conversations"
    ON public.expert_conversations FOR UPDATE
    USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expert_conversations' AND policyname = 'Sellers can delete their own conversations') THEN
    CREATE POLICY "Sellers can delete their own conversations"
    ON public.expert_conversations FOR DELETE
    USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- RLS policies for messages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expert_messages' AND policyname = 'Sellers can view messages of their conversations') THEN
    CREATE POLICY "Sellers can view messages of their conversations"
    ON public.expert_messages FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.expert_conversations c
      WHERE c.id = expert_messages.conversation_id
      AND (c.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expert_messages' AND policyname = 'Sellers can create messages in their conversations') THEN
    CREATE POLICY "Sellers can create messages in their conversations"
    ON public.expert_messages FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.expert_conversations c
      WHERE c.id = expert_messages.conversation_id
      AND c.seller_id = auth.uid()
    ));
  END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_expert_conversations_seller ON public.expert_conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_expert_messages_conversation ON public.expert_messages(conversation_id);

-- Trigger to update conversation updated_at
DROP TRIGGER IF EXISTS update_expert_conversations_updated_at ON public.expert_conversations;
CREATE TRIGGER update_expert_conversations_updated_at
BEFORE UPDATE ON public.expert_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();