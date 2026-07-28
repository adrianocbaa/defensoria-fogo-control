
CREATE OR REPLACE FUNCTION public.is_maintenance_responsible(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND is_maintenance_responsible = true
  );
$$;

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
    _user_id IS NOT NULL
    AND (
      public.is_admin(_user_id)
      OR public.is_maintenance_responsible(_user_id)
      OR _ticket_user_id = _user_id
      OR _user_id = ANY(COALESCE(_ticket_manager_ids, ARRAY[]::uuid[]))
    );
$$;

DROP POLICY IF EXISTS "Users with edit permission can insert maintenance tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Users with edit permission can update maintenance tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Users with edit permission can delete maintenance tickets" ON public.maintenance_tickets;

CREATE POLICY "Users with edit permission can insert maintenance tickets"
  ON public.maintenance_tickets FOR INSERT
  WITH CHECK (public.can_edit() OR public.is_maintenance_responsible());

CREATE POLICY "Users with edit permission can update maintenance tickets"
  ON public.maintenance_tickets FOR UPDATE
  USING (public.can_edit() OR public.is_maintenance_responsible());

CREATE POLICY "Users with edit permission can delete maintenance tickets"
  ON public.maintenance_tickets FOR DELETE
  USING (public.can_edit() OR public.is_maintenance_responsible());
