CREATE OR REPLACE FUNCTION public.user_roles_guard_super_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _touches boolean;
  _caller text := current_setting('role', true);
BEGIN
  _touches := (TG_OP IN ('INSERT','UPDATE') AND NEW.role = 'super_admin')
           OR (TG_OP IN ('UPDATE','DELETE') AND OLD.role = 'super_admin');
  IF NOT _touches THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  -- Manutenção direta pelo dono do banco (SQL editor / migrations), nunca via API
  IF session_user IN ('postgres','supabase_admin')
     AND coalesce(_caller,'none') NOT IN ('authenticated','anon','service_role')
     AND auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF auth.uid() IS NULL OR NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente Super Admin pode conceder, alterar ou remover o papel super_admin'
      USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.user_roles_guard_super_admin() FROM PUBLIC, anon, authenticated;