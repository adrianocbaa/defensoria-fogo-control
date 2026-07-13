ALTER TABLE public.maintenance_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.maintenance_ticket_services REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_ticket_services;