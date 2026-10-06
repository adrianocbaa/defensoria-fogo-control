CREATE OR REPLACE FUNCTION public.auto_assign_default_organization()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _org uuid; _type text;
BEGIN
  IF NEW.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = NEW.user_id) THEN
    -- app_metadata só pode ser definido pelo servidor (Edge Function com service role)
    SELECT NULLIF(u.raw_app_meta_data->>'organization_id','')::uuid,
           COALESCE(NULLIF(u.raw_app_meta_data->>'member_type',''),'internal')
      INTO _org, _type
      FROM auth.users u WHERE u.id = NEW.user_id;
    IF _org IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org) THEN
      _org := '00000000-0000-0000-0000-000000000001';
    END IF;
    IF _type NOT IN ('internal','external') THEN _type := 'internal'; END IF;
    INSERT INTO public.organization_members (organization_id, user_id, member_type, status, activated_at)
    VALUES (_org, NEW.user_id, _type, 'active', now())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;