-- 6e1: organization_id no módulo Recebimento
ALTER TABLE public.recebimento_vistorias ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.recebimento_ambientes ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.recebimento_ambiente_servicos ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.recebimento_verificacoes ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.recebimento_pendencias ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.recebimento_pendencia_historico ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.recebimento_fotos ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.recebimento_templates ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.recebimento_template_servicos ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_rv_org ON public.recebimento_vistorias(organization_id);
CREATE INDEX IF NOT EXISTS idx_ra_org ON public.recebimento_ambientes(organization_id);
CREATE INDEX IF NOT EXISTS idx_ras_org ON public.recebimento_ambiente_servicos(organization_id);
CREATE INDEX IF NOT EXISTS idx_rver_org ON public.recebimento_verificacoes(organization_id);
CREATE INDEX IF NOT EXISTS idx_rp_org ON public.recebimento_pendencias(organization_id);
CREATE INDEX IF NOT EXISTS idx_rph_org ON public.recebimento_pendencia_historico(organization_id);
CREATE INDEX IF NOT EXISTS idx_rf_org ON public.recebimento_fotos(organization_id);
CREATE INDEX IF NOT EXISTS idx_rt_org ON public.recebimento_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_rts_org ON public.recebimento_template_servicos(organization_id);

-- Backfill: primeiro os que têm obra_id, depois os filhos
UPDATE public.recebimento_vistorias r SET organization_id = o.organization_id FROM public.obras o WHERE r.obra_id = o.id AND r.organization_id IS NULL;
UPDATE public.recebimento_ambientes r SET organization_id = o.organization_id FROM public.obras o WHERE r.obra_id = o.id AND r.organization_id IS NULL;
UPDATE public.recebimento_ambiente_servicos r SET organization_id = o.organization_id FROM public.obras o WHERE r.obra_id = o.id AND r.organization_id IS NULL;
UPDATE public.recebimento_verificacoes r SET organization_id = o.organization_id FROM public.obras o WHERE r.obra_id = o.id AND r.organization_id IS NULL;
UPDATE public.recebimento_pendencias r SET organization_id = o.organization_id FROM public.obras o WHERE r.obra_id = o.id AND r.organization_id IS NULL;
UPDATE public.recebimento_pendencia_historico r SET organization_id = o.organization_id FROM public.obras o WHERE r.obra_id = o.id AND r.organization_id IS NULL;
UPDATE public.recebimento_fotos r SET organization_id = o.organization_id FROM public.obras o WHERE r.obra_id = o.id AND r.organization_id IS NULL;
UPDATE public.recebimento_templates r SET organization_id = o.organization_id FROM public.obras o WHERE r.obra_id = o.id AND r.organization_id IS NULL;
UPDATE public.recebimento_template_servicos s SET organization_id = t.organization_id FROM public.recebimento_templates t WHERE s.template_id = t.id AND s.organization_id IS NULL;
-- Qualquer restante recebe a org 1 (única existente)
UPDATE public.recebimento_vistorias SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.recebimento_ambientes SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.recebimento_ambiente_servicos SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.recebimento_verificacoes SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.recebimento_pendencias SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.recebimento_pendencia_historico SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.recebimento_fotos SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.recebimento_templates SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.recebimento_template_servicos SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Preenchimento automático no insert
CREATE OR REPLACE FUNCTION public.set_recebimento_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    IF TG_TABLE_NAME = 'recebimento_template_servicos' THEN
      SELECT t.organization_id INTO NEW.organization_id FROM public.recebimento_templates t WHERE t.id = NEW.template_id;
    ELSIF NEW.obra_id IS NOT NULL THEN
      SELECT o.organization_id INTO NEW.organization_id FROM public.obras o WHERE o.id = NEW.obra_id;
    END IF;
    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := public.user_organization_id(auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_recebimento_organization_id() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_rv_org BEFORE INSERT ON public.recebimento_vistorias FOR EACH ROW EXECUTE FUNCTION public.set_recebimento_organization_id();
CREATE TRIGGER trg_ra_org BEFORE INSERT ON public.recebimento_ambientes FOR EACH ROW EXECUTE FUNCTION public.set_recebimento_organization_id();
CREATE TRIGGER trg_ras_org BEFORE INSERT ON public.recebimento_ambiente_servicos FOR EACH ROW EXECUTE FUNCTION public.set_recebimento_organization_id();
CREATE TRIGGER trg_rver_org BEFORE INSERT ON public.recebimento_verificacoes FOR EACH ROW EXECUTE FUNCTION public.set_recebimento_organization_id();
CREATE TRIGGER trg_rp_org BEFORE INSERT ON public.recebimento_pendencias FOR EACH ROW EXECUTE FUNCTION public.set_recebimento_organization_id();
CREATE TRIGGER trg_rph_org BEFORE INSERT ON public.recebimento_pendencia_historico FOR EACH ROW EXECUTE FUNCTION public.set_recebimento_organization_id();
CREATE TRIGGER trg_rf_org BEFORE INSERT ON public.recebimento_fotos FOR EACH ROW EXECUTE FUNCTION public.set_recebimento_organization_id();
CREATE TRIGGER trg_rt_org BEFORE INSERT ON public.recebimento_templates FOR EACH ROW EXECUTE FUNCTION public.set_recebimento_organization_id();
CREATE TRIGGER trg_rts_org BEFORE INSERT ON public.recebimento_template_servicos FOR EACH ROW EXECUTE FUNCTION public.set_recebimento_organization_id();

-- Políticas restritivas de isolamento por órgão
CREATE POLICY org_isolation ON public.recebimento_vistorias AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.recebimento_ambientes AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.recebimento_ambiente_servicos AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.recebimento_verificacoes AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.recebimento_pendencias AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.recebimento_pendencia_historico AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.recebimento_fotos AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.recebimento_templates AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.recebimento_template_servicos AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));