ALTER TABLE public.organizations
  ADD COLUMN abrangencia_geografica text,
  ADD COLUMN uf text,
  ADD COLUMN municipio_ibge text,
  ADD COLUMN municipio_nome text;

ALTER TABLE public.organizations ADD CONSTRAINT organizations_abrangencia_check
  CHECK (abrangencia_geografica IS NULL OR abrangencia_geografica IN ('municipal','estadual','nacional'));

ALTER TABLE public.organizations ADD CONSTRAINT organizations_uf_check
  CHECK (uf IS NULL OR uf ~ '^[A-Z]{2}$');

ALTER TABLE public.organizations ADD CONSTRAINT organizations_escopo_coerente_check
  CHECK (
    abrangencia_geografica IS NULL
    OR (abrangencia_geografica = 'municipal' AND uf IS NOT NULL AND municipio_ibge IS NOT NULL)
    OR (abrangencia_geografica = 'estadual' AND uf IS NOT NULL AND municipio_ibge IS NULL AND municipio_nome IS NULL)
    OR (abrangencia_geografica = 'nacional' AND uf IS NULL AND municipio_ibge IS NULL AND municipio_nome IS NULL)
  );

UPDATE public.organizations
SET abrangencia_geografica = 'estadual', uf = 'MT', municipio_ibge = NULL, municipio_nome = NULL
WHERE id = '00000000-0000-0000-0000-000000000001';

CREATE OR REPLACE FUNCTION public.super_admin_create_organization(
  p_nome text, p_cnpj text, p_slug text,
  p_abrangencia text DEFAULT NULL, p_uf text DEFAULT NULL,
  p_municipio_ibge text DEFAULT NULL, p_municipio_nome text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado: requer super admin'; END IF;
  INSERT INTO public.organizations (nome, cnpj, slug, status, abrangencia_geografica, uf, municipio_ibge, municipio_nome)
  VALUES (p_nome, p_cnpj, p_slug, 'active', p_abrangencia, p_uf, p_municipio_ibge, p_municipio_nome)
  RETURNING id INTO v_id;
  INSERT INTO public.subscription_history (organization_id, entity, action, new_value, reason, changed_by)
  VALUES (v_id, 'organization', 'created', jsonb_build_object('nome', p_nome, 'slug', p_slug, 'abrangencia_geografica', p_abrangencia, 'uf', p_uf, 'municipio_ibge', p_municipio_ibge, 'municipio_nome', p_municipio_nome), 'Criação manual via painel Super Admin', auth.uid());
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.super_admin_update_organization_scope(
  p_organization_id uuid, p_abrangencia text, p_uf text,
  p_municipio_ibge text, p_municipio_nome text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_old record;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado: requer super admin'; END IF;
  SELECT abrangencia_geografica, uf, municipio_ibge, municipio_nome INTO v_old
  FROM public.organizations WHERE id = p_organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organização não encontrada'; END IF;
  UPDATE public.organizations
  SET abrangencia_geografica = p_abrangencia, uf = p_uf,
      municipio_ibge = p_municipio_ibge, municipio_nome = p_municipio_nome,
      updated_at = now()
  WHERE id = p_organization_id;
  INSERT INTO public.subscription_history (organization_id, entity, action, old_value, new_value, reason, changed_by)
  VALUES (p_organization_id, 'organization', 'scope_updated', to_jsonb(v_old),
          jsonb_build_object('abrangencia_geografica', p_abrangencia, 'uf', p_uf, 'municipio_ibge', p_municipio_ibge, 'municipio_nome', p_municipio_nome),
          'Escopo territorial atualizado via painel Super Admin', auth.uid());
END;
$function$;