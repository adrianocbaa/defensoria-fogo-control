ALTER TABLE public.maintenance_tickets
  DROP CONSTRAINT IF EXISTS maintenance_tickets_nucleo_id_fkey;

ALTER TABLE public.maintenance_tickets
  ADD CONSTRAINT maintenance_tickets_nucleo_id_fkey
  FOREIGN KEY (nucleo_id) REFERENCES public.nucleos_central(id) ON DELETE SET NULL;