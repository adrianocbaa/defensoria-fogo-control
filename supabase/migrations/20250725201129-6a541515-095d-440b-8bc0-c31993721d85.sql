-- Add a relation between travels and maintenance tickets
ALTER TABLE public.travels ADD COLUMN ticket_id UUID REFERENCES public.maintenance_tickets(id);
ALTER TABLE public.maintenance_tickets ADD COLUMN travel_id UUID REFERENCES public.travels(id);