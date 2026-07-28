
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS requester_email text,
  ADD COLUMN IF NOT EXISTS reference_videos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS inbound_message_id text,
  ADD COLUMN IF NOT EXISTS raw_email jsonb;

CREATE INDEX IF NOT EXISTS maintenance_tickets_inbound_msg_idx
  ON public.maintenance_tickets(inbound_message_id)
  WHERE inbound_message_id IS NOT NULL;
