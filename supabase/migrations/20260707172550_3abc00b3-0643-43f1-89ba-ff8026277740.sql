
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by uuid,
  ADD COLUMN IF NOT EXISTS confirmation_file_url text,
  ADD COLUMN IF NOT EXISTS confirmation_file_name text,
  ADD COLUMN IF NOT EXISTS finalization_note text;

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_finalized_at
  ON public.maintenance_tickets (finalized_at);
