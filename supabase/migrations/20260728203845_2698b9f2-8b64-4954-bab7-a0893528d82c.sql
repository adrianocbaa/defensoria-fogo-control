CREATE POLICY "Maintenance responsibles can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_maintenance_responsible(auth.uid()));