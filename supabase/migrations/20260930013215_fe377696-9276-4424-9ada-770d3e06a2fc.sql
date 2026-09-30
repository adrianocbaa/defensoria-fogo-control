CREATE OR REPLACE FUNCTION public.get_public_rdo_progress_by_obra(p_obra_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.obras
    WHERE id = p_obra_id AND is_public IS TRUE AND is_demo IS NOT TRUE
  ) THEN
    RETURN NULL;
  END IF;
  RETURN public.get_rdo_progress_by_obra(p_obra_id);
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_rdo_progress_by_obra(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_rdo_progress_by_obra(uuid) TO anon, authenticated, service_role;