-- Remover dependência da tabela maintenance_managers
ALTER TABLE public.maintenance_tickets
  DROP CONSTRAINT IF EXISTS maintenance_tickets_manager_id_fkey;

-- manager_id passa a armazenar o user_id do perfil (auth.users)
COMMENT ON COLUMN public.maintenance_tickets.manager_id IS 'user_id do perfil com role manutencao responsável pelo chamado';