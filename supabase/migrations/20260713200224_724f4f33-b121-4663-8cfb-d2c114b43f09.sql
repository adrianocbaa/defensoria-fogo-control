
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
      OR _ticket_user_id = _user_id
      OR _user_id = ANY(COALESCE(_ticket_manager_ids, ARRAY[]::uuid[]))
    );
$$;
