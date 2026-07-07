ALTER TABLE public.maintenance_ticket_services
  ADD COLUMN IF NOT EXISTS travel_is_linked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.maintenance_ticket_services.travel_is_linked IS 'Quando true, travel_id aponta para uma viagem existente reaproveitada (não deve ser excluída ao editar/apagar o serviço).';