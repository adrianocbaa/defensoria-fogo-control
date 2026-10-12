CREATE OR REPLACE FUNCTION public.user_roles_guard_super_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _touches boolean;
BEGIN
  _touches := (TG_OP IN ('INSERT','UPDATE') AND NEW.role = 'super_admin')
           OR (TG_OP IN ('UPDATE','DELETE') AND OLD.role = 'super_admin');
  IF NOT _touches THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  -- Manutenção direta pelo dono do banco (SQL editor / migrations) segue permitida
  IF session_user IN ('postgres','supabase_admin') AND auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF auth.uid() IS NULL OR NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente Super Admin pode conceder, alterar ou remover o papel super_admin'
      USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.user_roles_guard_super_admin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_roles_guard_super_admin ON public.user_roles;
CREATE TRIGGER user_roles_guard_super_admin
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.user_roles_guard_super_admin();

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (public.has_role(auth.uid(),'admin') AND role <> 'super_admin')
);
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (public.has_role(auth.uid(),'admin') AND role <> 'super_admin')
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (public.has_role(auth.uid(),'admin') AND role <> 'super_admin')
);
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (public.has_role(auth.uid(),'admin') AND role <> 'super_admin')
);