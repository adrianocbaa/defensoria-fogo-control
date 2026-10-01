CREATE OR REPLACE FUNCTION public.my_org_storage_ok()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN e.organization_id IS NULL THEN true
    WHEN e.storage_limit_bytes IS NULL THEN true
    ELSE COALESCE(c.storage_bytes_used, 0) < e.storage_limit_bytes
  END
  FROM (SELECT public.user_organization_id(auth.uid()) AS org) o
  LEFT JOIN public.organization_entitlements e ON e.organization_id = o.org
  LEFT JOIN public.organization_usage_counters c ON c.organization_id = o.org
$$;
REVOKE EXECUTE ON FUNCTION public.my_org_storage_ok() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_org_storage_ok() TO authenticated;

DROP POLICY IF EXISTS org_storage_quota ON storage.objects;
CREATE POLICY org_storage_quota ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.my_org_storage_ok());