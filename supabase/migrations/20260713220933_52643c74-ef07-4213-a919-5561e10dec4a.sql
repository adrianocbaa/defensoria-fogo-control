
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS reference_photos jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.maintenance_ticket_services
  ADD COLUMN IF NOT EXISTS reference_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS execution_photos jsonb NOT NULL DEFAULT '[]'::jsonb;
