
-- 1. Flag no perfil
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_maintenance_responsible boolean NOT NULL DEFAULT false;

-- 2. Vínculo do maintenance_manager a um usuário
ALTER TABLE public.maintenance_managers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_managers_user_id
  ON public.maintenance_managers(user_id);

-- 3. Função helper para visibilidade
CREATE OR REPLACE FUNCTION public.can_view_maintenance_ticket(
  _ticket_manager_ids uuid[],
  _ticket_user_id uuid,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR _ticket_user_id = _user_id
    OR EXISTS (
      SELECT 1
      FROM public.maintenance_managers m
      WHERE m.user_id = _user_id
        AND m.id = ANY(COALESCE(_ticket_manager_ids, ARRAY[]::uuid[]))
    );
$$;

-- 4. Substituir policy de SELECT em maintenance_tickets
DROP POLICY IF EXISTS "Authorized users can view maintenance tickets" ON public.maintenance_tickets;

CREATE POLICY "Users see own or assigned maintenance tickets"
  ON public.maintenance_tickets
  FOR SELECT
  USING (
    public.can_view_maintenance_ticket(manager_ids, user_id, auth.uid())
  );
