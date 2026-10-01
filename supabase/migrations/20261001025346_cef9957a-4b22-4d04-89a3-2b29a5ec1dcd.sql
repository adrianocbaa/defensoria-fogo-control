-- 6e2: organization_id no módulo Entrega
ALTER TABLE public.entrega_vistorias ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_ambientes ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_ambiente_grupos ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_verificacoes ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_pendencias ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_pendencia_historico ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_reinspecoes ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_reinspecao_itens ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_fotos ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_participantes ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_templates ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_template_grupos ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_biblioteca_grupos ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.entrega_biblioteca_verificacoes ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_ev_org ON public.entrega_vistorias(organization_id);
CREATE INDEX IF NOT EXISTS idx_ea_org ON public.entrega_ambientes(organization_id);
CREATE INDEX IF NOT EXISTS idx_eag_org ON public.entrega_ambiente_grupos(organization_id);
CREATE INDEX IF NOT EXISTS idx_ever_org ON public.entrega_verificacoes(organization_id);
CREATE INDEX IF NOT EXISTS idx_ep_org ON public.entrega_pendencias(organization_id);
CREATE INDEX IF NOT EXISTS idx_eph_org ON public.entrega_pendencia_historico(organization_id);
CREATE INDEX IF NOT EXISTS idx_er_org ON public.entrega_reinspecoes(organization_id);
CREATE INDEX IF NOT EXISTS idx_eri_org ON public.entrega_reinspecao_itens(organization_id);
CREATE INDEX IF NOT EXISTS idx_ef_org ON public.entrega_fotos(organization_id);
CREATE INDEX IF NOT EXISTS idx_epa_org ON public.entrega_participantes(organization_id);
CREATE INDEX IF NOT EXISTS idx_et_org ON public.entrega_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_etg_org ON public.entrega_template_grupos(organization_id);
CREATE INDEX IF NOT EXISTS idx_ebg_org ON public.entrega_biblioteca_grupos(organization_id);
CREATE INDEX IF NOT EXISTS idx_ebv_org ON public.entrega_biblioteca_verificacoes(organization_id);

-- Backfill: raiz pela obra, filhos pelos pais (pais primeiro)
UPDATE public.entrega_vistorias e SET organization_id = o.organization_id FROM public.obras o WHERE e.obra_id = o.id AND e.organization_id IS NULL;
UPDATE public.entrega_vistorias SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_ambientes e SET organization_id = v.organization_id FROM public.entrega_vistorias v WHERE e.entrega_id = v.id AND e.organization_id IS NULL;
UPDATE public.entrega_participantes e SET organization_id = v.organization_id FROM public.entrega_vistorias v WHERE e.entrega_id = v.id AND e.organization_id IS NULL;
UPDATE public.entrega_reinspecoes e SET organization_id = v.organization_id FROM public.entrega_vistorias v WHERE e.entrega_id = v.id AND e.organization_id IS NULL;
UPDATE public.entrega_ambientes SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_ambiente_grupos e SET organization_id = a.organization_id FROM public.entrega_ambientes a WHERE e.ambiente_id = a.id AND e.organization_id IS NULL;
UPDATE public.entrega_verificacoes e SET organization_id = a.organization_id FROM public.entrega_ambientes a WHERE e.ambiente_id = a.id AND e.organization_id IS NULL;
UPDATE public.entrega_pendencias e SET organization_id = a.organization_id FROM public.entrega_ambientes a WHERE e.ambiente_id = a.id AND e.organization_id IS NULL;
UPDATE public.entrega_fotos e SET organization_id = a.organization_id FROM public.entrega_ambientes a WHERE e.ambiente_id = a.id AND e.organization_id IS NULL;
UPDATE public.entrega_pendencia_historico e SET organization_id = p.organization_id FROM public.entrega_pendencias p WHERE e.pendencia_id = p.id AND e.organization_id IS NULL;
UPDATE public.entrega_reinspecao_itens e SET organization_id = r.organization_id FROM public.entrega_reinspecoes r WHERE e.reinspecao_id = r.id AND e.organization_id IS NULL;
-- Modelos/biblioteca globais recebem a org 1 (única existente)
UPDATE public.entrega_templates SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_biblioteca_grupos SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_template_grupos g SET organization_id = t.organization_id FROM public.entrega_templates t WHERE g.template_id = t.id AND g.organization_id IS NULL;
UPDATE public.entrega_biblioteca_verificacoes v SET organization_id = g.organization_id FROM public.entrega_biblioteca_grupos g WHERE v.grupo_id = g.id AND v.organization_id IS NULL;
-- Rede de segurança para qualquer restante
UPDATE public.entrega_ambiente_grupos SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_verificacoes SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_pendencias SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_pendencia_historico SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_reinspecoes SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_reinspecao_itens SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_fotos SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_participantes SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_template_grupos SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.entrega_biblioteca_verificacoes SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Preenchimento automático no insert
CREATE OR REPLACE FUNCTION public.set_entrega_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    IF TG_TABLE_NAME = 'entrega_vistorias' AND NEW.obra_id IS NOT NULL THEN
      SELECT o.organization_id INTO NEW.organization_id FROM public.obras o WHERE o.id = NEW.obra_id;
    ELSIF TG_TABLE_NAME IN ('entrega_ambientes','entrega_participantes','entrega_reinspecoes') THEN
      SELECT v.organization_id INTO NEW.organization_id FROM public.entrega_vistorias v WHERE v.id = NEW.entrega_id;
    ELSIF TG_TABLE_NAME IN ('entrega_ambiente_grupos','entrega_verificacoes','entrega_pendencias','entrega_fotos') THEN
      SELECT a.organization_id INTO NEW.organization_id FROM public.entrega_ambientes a WHERE a.id = NEW.ambiente_id;
    ELSIF TG_TABLE_NAME = 'entrega_pendencia_historico' THEN
      SELECT p.organization_id INTO NEW.organization_id FROM public.entrega_pendencias p WHERE p.id = NEW.pendencia_id;
    ELSIF TG_TABLE_NAME = 'entrega_reinspecao_itens' THEN
      SELECT r.organization_id INTO NEW.organization_id FROM public.entrega_reinspecoes r WHERE r.id = NEW.reinspecao_id;
    ELSIF TG_TABLE_NAME = 'entrega_template_grupos' THEN
      SELECT t.organization_id INTO NEW.organization_id FROM public.entrega_templates t WHERE t.id = NEW.template_id;
    ELSIF TG_TABLE_NAME = 'entrega_biblioteca_verificacoes' THEN
      SELECT g.organization_id INTO NEW.organization_id FROM public.entrega_biblioteca_grupos g WHERE g.id = NEW.grupo_id;
    END IF;
    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := public.user_organization_id(auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_entrega_organization_id() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_ev_org BEFORE INSERT ON public.entrega_vistorias FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_ea_org BEFORE INSERT ON public.entrega_ambientes FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_eag_org BEFORE INSERT ON public.entrega_ambiente_grupos FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_ever_org BEFORE INSERT ON public.entrega_verificacoes FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_ep_org BEFORE INSERT ON public.entrega_pendencias FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_eph_org BEFORE INSERT ON public.entrega_pendencia_historico FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_er_org BEFORE INSERT ON public.entrega_reinspecoes FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_eri_org BEFORE INSERT ON public.entrega_reinspecao_itens FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_ef_org BEFORE INSERT ON public.entrega_fotos FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_epa_org BEFORE INSERT ON public.entrega_participantes FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_et_org BEFORE INSERT ON public.entrega_templates FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_etg_org BEFORE INSERT ON public.entrega_template_grupos FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_ebg_org BEFORE INSERT ON public.entrega_biblioteca_grupos FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();
CREATE TRIGGER trg_ebv_org BEFORE INSERT ON public.entrega_biblioteca_verificacoes FOR EACH ROW EXECUTE FUNCTION public.set_entrega_organization_id();

-- Políticas restritivas de isolamento por órgão
CREATE POLICY org_isolation ON public.entrega_vistorias AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_ambientes AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_ambiente_grupos AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_verificacoes AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_pendencias AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_pendencia_historico AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_reinspecoes AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_reinspecao_itens AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_fotos AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_participantes AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_templates AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_template_grupos AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_biblioteca_grupos AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.entrega_biblioteca_verificacoes AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));