-- Adiciona suporte a múltiplos servidores em tarefas, serviços e viagens
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS manager_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.maintenance_ticket_services
  ADD COLUMN IF NOT EXISTS manager_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.travels
  ADD COLUMN IF NOT EXISTS manager_ids uuid[] NOT NULL DEFAULT '{}';

-- Migração automática: converte manager_id singular em array
UPDATE public.maintenance_tickets
  SET manager_ids = ARRAY[manager_id]
  WHERE manager_id IS NOT NULL AND (manager_ids IS NULL OR array_length(manager_ids,1) IS NULL);

UPDATE public.maintenance_ticket_services
  SET manager_ids = ARRAY[manager_id]
  WHERE manager_id IS NOT NULL AND (manager_ids IS NULL OR array_length(manager_ids,1) IS NULL);

-- Travels: tenta casar pelo nome atual do campo servidor
UPDATE public.travels t
  SET manager_ids = ARRAY[m.id]
  FROM public.maintenance_managers m
  WHERE t.servidor IS NOT NULL
    AND (t.manager_ids IS NULL OR array_length(t.manager_ids,1) IS NULL)
    AND lower(trim(m.nome)) = lower(trim(t.servidor));

CREATE INDEX IF NOT EXISTS idx_tickets_manager_ids ON public.maintenance_tickets USING GIN (manager_ids);
CREATE INDEX IF NOT EXISTS idx_services_manager_ids ON public.maintenance_ticket_services USING GIN (manager_ids);
CREATE INDEX IF NOT EXISTS idx_travels_manager_ids ON public.travels USING GIN (manager_ids);