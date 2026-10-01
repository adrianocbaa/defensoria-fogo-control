DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orcamentos','orcamento_itens','empresas','contratos_licitacao','base_composicoes','materials','stock_movements','plano_expansao_metas','plano_expansao_revisoes','plano_expansao_historico','config_institucional'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid NOT NULL DEFAULT ''00000000-0000-0000-0000-000000000001''::uuid REFERENCES public.organizations(id)', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(organization_id)', 'idx_'||t||'_org', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.set_gestao_organization_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  IF TG_TABLE_NAME = 'orcamento_itens' THEN
    SELECT organization_id INTO v FROM public.orcamentos WHERE id = NEW.orcamento_id;
  ELSIF TG_TABLE_NAME = 'contratos_licitacao' THEN
    SELECT organization_id INTO v FROM public.empresas WHERE id = NEW.empresa_id;
  ELSIF TG_TABLE_NAME = 'stock_movements' THEN
    SELECT organization_id INTO v FROM public.materials WHERE id = NEW.material_id;
  ELSIF TG_TABLE_NAME = 'plano_expansao_historico' THEN
    SELECT organization_id INTO v FROM public.plano_expansao_metas WHERE id = NEW.meta_id;
  ELSIF TG_TABLE_NAME = 'plano_expansao_metas' THEN
    SELECT organization_id INTO v FROM public.plano_expansao_revisoes WHERE id = NEW.revisao_id;
  END IF;
  IF v IS NULL THEN v := public.user_organization_id(auth.uid()); END IF;
  NEW.organization_id := COALESCE(v, NEW.organization_id, '00000000-0000-0000-0000-000000000001'::uuid);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_gestao_organization_id() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orcamentos','orcamento_itens','empresas','contratos_licitacao','base_composicoes','materials','stock_movements','plano_expansao_metas','plano_expansao_revisoes','plano_expansao_historico','config_institucional'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_org ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_org BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_gestao_organization_id()', t);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation ON public.%I', t);
    EXECUTE format('CREATE POLICY org_isolation ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()))', t);
  END LOOP;
END $$;