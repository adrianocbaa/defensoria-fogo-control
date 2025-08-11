-- Set deterministic search_path for security-definer and other functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.get_user_role(uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.is_admin(uuid) SET search_path = public;
ALTER FUNCTION public.can_edit(uuid) SET search_path = public;
ALTER FUNCTION public.log_changes() SET search_path = public;
ALTER FUNCTION public.update_material_stock() SET search_path = public;