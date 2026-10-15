CREATE OR REPLACE FUNCTION public.auto_assign_default_organization()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _org uuid; _type text;
BEGIN
  IF NEW.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = NEW.user_id) THEN
    SELECT NULLIF(u.raw_app_meta_data->>'organization_id','')::uuid,
           COALESCE(NULLIF(u.raw_app_meta_data->>'member_type',''),'internal')
      INTO _org, _type
      FROM auth.users u WHERE u.id = NEW.user_id;
    -- H2.1: sem organização resolvível => NÃO cria vínculo (nunca cai na DPE-MT por padrão).
    -- O vínculo explícito é feito pelo fluxo autorizado (admin-create-user).
    IF _org IS NULL OR NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org) THEN
      RETURN NEW;
    END IF;
    IF _type NOT IN ('internal','external') THEN _type := 'internal'; END IF;
    INSERT INTO public.organization_members (organization_id, user_id, member_type, status, activated_at)
    VALUES (_org, NEW.user_id, _type, 'active', now())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;

-- H2.1-D: corrigir apenas o usuário de homologação onboarding.homolog@sidif.test
DELETE FROM public.organization_members
 WHERE user_id = 'fdd87e15-c71c-4b40-af17-a3b6a12c7693'
   AND organization_id = '00000000-0000-0000-0000-000000000001';
INSERT INTO public.organization_members (organization_id, user_id, member_type, status, activated_at)
VALUES ('00000000-0000-0000-0000-000000000002','fdd87e15-c71c-4b40-af17-a3b6a12c7693','internal','active', now())
ON CONFLICT (organization_id, user_id) DO UPDATE SET status='active', member_type='internal';
UPDATE public.profiles SET sectors = ARRAY['nucleos_central']::public.sector_type[]
 WHERE user_id = 'fdd87e15-c71c-4b40-af17-a3b6a12c7693';