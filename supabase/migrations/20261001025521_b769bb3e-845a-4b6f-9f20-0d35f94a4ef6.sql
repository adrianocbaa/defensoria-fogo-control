-- 6e3: organization_id em Checklist, Documentos, Biblioteca e Dimensionamento
ALTER TABLE public.checklist_pdfs ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.checklist_ambientes ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.checklist_servicos ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.checklist_ocorrencias ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.documentos_encerramento ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.documento_assinantes ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.biblioteca_servicos ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.biblioteca_verificacoes ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.dimensionamento_calhas ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_cp_org ON public.checklist_pdfs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ca_org ON public.checklist_ambientes(organization_id);
CREATE INDEX IF NOT EXISTS idx_cs_org ON public.checklist_servicos(organization_id);
CREATE INDEX IF NOT EXISTS idx_co_org ON public.checklist_ocorrencias(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_org ON public.documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_de_org ON public.documentos_encerramento(organization_id);
CREATE INDEX IF NOT EXISTS idx_da_org ON public.documento_assinantes(organization_id);
CREATE INDEX IF NOT EXISTS idx_bs_org ON public.biblioteca_servicos(organization_id);
CREATE INDEX IF NOT EXISTS idx_bv_org ON public.biblioteca_verificacoes(organization_id);
CREATE INDEX IF NOT EXISTS idx_dc_org ON public.dimensionamento_calhas(organization_id);

-- Backfill: pais primeiro, filhos depois
UPDATE public.checklist_pdfs c SET organization_id = o.organization_id FROM public.obras o WHERE c.obra_id = o.id AND c.organization_id IS NULL;
UPDATE public.checklist_pdfs SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.checklist_ambientes c SET organization_id = p.organization_id FROM public.checklist_pdfs p WHERE c.pdf_id = p.id AND c.organization_id IS NULL;
UPDATE public.checklist_ambientes SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.checklist_servicos c SET organization_id = a.organization_id FROM public.checklist_ambientes a WHERE c.ambiente_id = a.id AND c.organization_id IS NULL;
UPDATE public.checklist_servicos SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.checklist_ocorrencias c SET organization_id = s.organization_id FROM public.checklist_servicos s WHERE c.servico_id = s.id AND c.organization_id IS NULL;
UPDATE public.checklist_ocorrencias SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.documents d SET organization_id = n.organization_id FROM public.nuclei n WHERE d.nucleus_id = n.id AND d.organization_id IS NULL;
UPDATE public.documents SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.documentos_encerramento d SET organization_id = o.organization_id FROM public.obras o WHERE d.obra_id = o.id AND d.organization_id IS NULL;
UPDATE public.documentos_encerramento SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.documento_assinantes a SET organization_id = d.organization_id FROM public.documentos_encerramento d WHERE a.documento_id = d.id AND a.organization_id IS NULL;
UPDATE public.documento_assinantes SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.biblioteca_servicos b SET organization_id = o.organization_id FROM public.obras o WHERE b.obra_id = o.id AND b.organization_id IS NULL;
UPDATE public.biblioteca_servicos SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.biblioteca_verificacoes v SET organization_id = s.organization_id FROM public.biblioteca_servicos s WHERE v.servico_id = s.id AND v.organization_id IS NULL;
UPDATE public.biblioteca_verificacoes SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.dimensionamento_calhas d SET organization_id = o.organization_id FROM public.obras o WHERE d.obra_id = o.id AND d.organization_id IS NULL;
UPDATE public.dimensionamento_calhas SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Preenchimento automático no insert
CREATE OR REPLACE FUNCTION public.set_checklist_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    IF TG_TABLE_NAME IN ('checklist_pdfs','documentos_encerramento','biblioteca_servicos','dimensionamento_calhas') AND NEW.obra_id IS NOT NULL THEN
      SELECT o.organization_id INTO NEW.organization_id FROM public.obras o WHERE o.id = NEW.obra_id;
    ELSIF TG_TABLE_NAME = 'checklist_ambientes' THEN
      SELECT p.organization_id INTO NEW.organization_id FROM public.checklist_pdfs p WHERE p.id = NEW.pdf_id;
    ELSIF TG_TABLE_NAME = 'checklist_servicos' THEN
      SELECT a.organization_id INTO NEW.organization_id FROM public.checklist_ambientes a WHERE a.id = NEW.ambiente_id;
    ELSIF TG_TABLE_NAME = 'checklist_ocorrencias' THEN
      SELECT s.organization_id INTO NEW.organization_id FROM public.checklist_servicos s WHERE s.id = NEW.servico_id;
    ELSIF TG_TABLE_NAME = 'documents' AND NEW.nucleus_id IS NOT NULL THEN
      SELECT n.organization_id INTO NEW.organization_id FROM public.nuclei n WHERE n.id = NEW.nucleus_id;
    ELSIF TG_TABLE_NAME = 'documento_assinantes' THEN
      SELECT d.organization_id INTO NEW.organization_id FROM public.documentos_encerramento d WHERE d.id = NEW.documento_id;
    ELSIF TG_TABLE_NAME = 'biblioteca_verificacoes' THEN
      SELECT s.organization_id INTO NEW.organization_id FROM public.biblioteca_servicos s WHERE s.id = NEW.servico_id;
    END IF;
    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := public.user_organization_id(auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_checklist_organization_id() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_cp_org BEFORE INSERT ON public.checklist_pdfs FOR EACH ROW EXECUTE FUNCTION public.set_checklist_organization_id();
CREATE TRIGGER trg_ca_org BEFORE INSERT ON public.checklist_ambientes FOR EACH ROW EXECUTE FUNCTION public.set_checklist_organization_id();
CREATE TRIGGER trg_cs_org BEFORE INSERT ON public.checklist_servicos FOR EACH ROW EXECUTE FUNCTION public.set_checklist_organization_id();
CREATE TRIGGER trg_co_org BEFORE INSERT ON public.checklist_ocorrencias FOR EACH ROW EXECUTE FUNCTION public.set_checklist_organization_id();
CREATE TRIGGER trg_doc_org BEFORE INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_checklist_organization_id();
CREATE TRIGGER trg_de_org BEFORE INSERT ON public.documentos_encerramento FOR EACH ROW EXECUTE FUNCTION public.set_checklist_organization_id();
CREATE TRIGGER trg_da_org BEFORE INSERT ON public.documento_assinantes FOR EACH ROW EXECUTE FUNCTION public.set_checklist_organization_id();
CREATE TRIGGER trg_bs_org BEFORE INSERT ON public.biblioteca_servicos FOR EACH ROW EXECUTE FUNCTION public.set_checklist_organization_id();
CREATE TRIGGER trg_bv_org BEFORE INSERT ON public.biblioteca_verificacoes FOR EACH ROW EXECUTE FUNCTION public.set_checklist_organization_id();
CREATE TRIGGER trg_dc_org BEFORE INSERT ON public.dimensionamento_calhas FOR EACH ROW EXECUTE FUNCTION public.set_checklist_organization_id();

-- Políticas restritivas de isolamento por órgão
CREATE POLICY org_isolation ON public.checklist_pdfs AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.checklist_ambientes AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.checklist_servicos AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.checklist_ocorrencias AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.documents AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.documentos_encerramento AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.documento_assinantes AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.biblioteca_servicos AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.biblioteca_verificacoes AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.dimensionamento_calhas AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));