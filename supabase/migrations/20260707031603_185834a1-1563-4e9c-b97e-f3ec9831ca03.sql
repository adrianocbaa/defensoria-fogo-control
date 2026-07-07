ALTER TABLE public.maintenance_ticket_services
  DROP CONSTRAINT IF EXISTS maintenance_ticket_services_manager_id_fkey;

ALTER TABLE public.maintenance_ticket_services
  ADD CONSTRAINT maintenance_ticket_services_manager_id_fkey
  FOREIGN KEY (manager_id)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.maintenance_ticket_services.manager_id IS 'user_id do perfil com role manutencao responsável pelo serviço';