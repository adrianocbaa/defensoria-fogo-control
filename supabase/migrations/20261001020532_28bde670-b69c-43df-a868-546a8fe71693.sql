CREATE TABLE public.organization_usage_counters (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  internal_users_count integer NOT NULL DEFAULT 0,
  external_users_count integer NOT NULL DEFAULT 0,
  storage_bytes_used bigint NOT NULL DEFAULT 0,
  users_counted_at timestamptz NOT NULL DEFAULT now(),
  storage_counted_at timestamptz
);
GRANT SELECT ON public.organization_usage_counters TO authenticated;
GRANT ALL ON public.organization_usage_counters TO service_role;
ALTER TABLE public.organization_usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own usage" ON public.organization_usage_counters FOR SELECT TO authenticated
  USING (organization_id = public.user_organization_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.recount_org_users(_org uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_usage_counters AS c (organization_id, internal_users_count, external_users_count, users_counted_at)
  SELECT _org,
    count(*) FILTER (WHERE member_type='internal'),
    count(*) FILTER (WHERE member_type='external'), now()
  FROM public.organization_members WHERE organization_id=_org AND status IN ('active','invited')
  ON CONFLICT (organization_id) DO UPDATE SET
    internal_users_count=EXCLUDED.internal_users_count,
    external_users_count=EXCLUDED.external_users_count, users_counted_at=now();
END $$;

CREATE OR REPLACE FUNCTION public.trg_members_recount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN PERFORM public.recount_org_users(OLD.organization_id); END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND (TG_OP='INSERT' OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.status IS DISTINCT FROM OLD.status OR NEW.member_type IS DISTINCT FROM OLD.member_type) THEN
    PERFORM public.recount_org_users(NEW.organization_id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_org_members_usage AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_members_recount();

-- Conferência completa (fonte da verdade): usuários + armazenamento (somente leitura em storage.objects)
CREATE OR REPLACE FUNCTION public.reconcile_usage_counters()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE _o record;
BEGIN
  FOR _o IN SELECT id FROM public.organizations LOOP
    PERFORM public.recount_org_users(_o.id);
  END LOOP;
  WITH objs AS (
    SELECT COALESCE(org.id, '00000000-0000-0000-0000-000000000001'::uuid) AS org_id,
           COALESCE((so.metadata->>'size')::bigint, 0) AS bytes
    FROM storage.objects so
    LEFT JOIN public.organizations org ON org.id::text = split_part(so.name, '/', 1)
  ), agg AS (
    SELECT o.id AS org_id, COALESCE(SUM(objs.bytes),0) AS total
    FROM public.organizations o LEFT JOIN objs ON objs.org_id = o.id GROUP BY o.id
  )
  UPDATE public.organization_usage_counters c
     SET storage_bytes_used = agg.total, storage_counted_at = now()
    FROM agg WHERE c.organization_id = agg.org_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.recount_org_users(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_members_recount() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reconcile_usage_counters() FROM anon, authenticated, public;

SELECT public.reconcile_usage_counters();

SELECT cron.schedule('sidif-reconcile-usage', '0 3 * * *', $$SELECT public.reconcile_usage_counters();$$);