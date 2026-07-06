ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS nucleo_id uuid REFERENCES public.nuclei(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_nucleo_id ON public.maintenance_tickets(nucleo_id);