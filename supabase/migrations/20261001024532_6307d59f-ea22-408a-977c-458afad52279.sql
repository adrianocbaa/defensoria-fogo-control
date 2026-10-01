-- 6d: organization_id em Preventivos/Núcleos
ALTER TABLE public.nucleos_central ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.nucleo_teletrabalho ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.nucleo_module_visibility ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.fire_extinguishers ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.hydrants ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.travels ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.atas ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.ata_polos ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.dpg_gestao ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_nc_org ON public.nucleos_central(organization_id);
CREATE INDEX IF NOT EXISTS idx_nt_org ON public.nucleo_teletrabalho(organization_id);
CREATE INDEX IF NOT EXISTS idx_nmv_org ON public.nucleo_module_visibility(organization_id);
CREATE INDEX IF NOT EXISTS idx_fe_org ON public.fire_extinguishers(organization_id);
CREATE INDEX IF NOT EXISTS idx_hy_org ON public.hydrants(organization_id);
CREATE INDEX IF NOT EXISTS idx_tr_org ON public.travels(organization_id);
CREATE INDEX IF NOT EXISTS idx_atas_org ON public.atas(organization_id);
CREATE INDEX IF NOT EXISTS idx_ap_org ON public.ata_polos(organization_id);
CREATE INDEX IF NOT EXISTS idx_dpg_org ON public.dpg_gestao(organization_id);

-- Backfill: filhos herdam do pai; raízes recebem a org 1 (única existente)
UPDATE public.fire_extinguishers f SET organization_id = n.organization_id FROM public.nuclei n WHERE f.nucleus_id = n.id AND f.organization_id IS NULL;
UPDATE public.hydrants h SET organization_id = n.organization_id FROM public.nuclei n WHERE h.nucleus_id = n.id AND h.organization_id IS NULL;
UPDATE public.nucleo_teletrabalho t SET organization_id = c.organization_id FROM public.nucleos_central c WHERE t.nucleo_id = c.id AND t.organization_id IS NULL;
UPDATE public.nucleo_module_visibility v SET organization_id = c.organization_id FROM public.nucleos_central c WHERE v.nucleo_id = c.id AND v.organization_id IS NULL;
UPDATE public.ata_polos p SET organization_id = a.organization_id FROM public.atas a WHERE p.ata_id = a.id AND p.organization_id IS NULL;
UPDATE public.travels t SET organization_id = m.organization_id FROM public.maintenance_tickets m WHERE t.ticket_id = m.id AND t.organization_id IS NULL;
UPDATE public.nucleos_central SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.atas SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.dpg_gestao SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.travels SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.fire_extinguishers SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.hydrants SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Preenchimento automático no insert
CREATE OR REPLACE FUNCTION public.set_preventivos_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    IF TG_TABLE_NAME IN ('fire_extinguishers','hydrants') THEN
      SELECT n.organization_id INTO NEW.organization_id FROM public.nuclei n WHERE n.id = NEW.nucleus_id;
    ELSIF TG_TABLE_NAME IN ('nucleo_teletrabalho','nucleo_module_visibility') THEN
      SELECT c.organization_id INTO NEW.organization_id FROM public.nucleos_central c WHERE c.id = NEW.nucleo_id;
    ELSIF TG_TABLE_NAME = 'ata_polos' THEN
      SELECT a.organization_id INTO NEW.organization_id FROM public.atas a WHERE a.id = NEW.ata_id;
    ELSIF TG_TABLE_NAME = 'travels' THEN
      SELECT m.organization_id INTO NEW.organization_id FROM public.maintenance_tickets m WHERE m.id = NEW.ticket_id;
    END IF;
    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := public.user_organization_id(auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_preventivos_organization_id() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_fe_org BEFORE INSERT ON public.fire_extinguishers FOR EACH ROW EXECUTE FUNCTION public.set_preventivos_organization_id();
CREATE TRIGGER trg_hy_org BEFORE INSERT ON public.hydrants FOR EACH ROW EXECUTE FUNCTION public.set_preventivos_organization_id();
CREATE TRIGGER trg_nt_org BEFORE INSERT ON public.nucleo_teletrabalho FOR EACH ROW EXECUTE FUNCTION public.set_preventivos_organization_id();
CREATE TRIGGER trg_nmv_org BEFORE INSERT ON public.nucleo_module_visibility FOR EACH ROW EXECUTE FUNCTION public.set_preventivos_organization_id();
CREATE TRIGGER trg_ap_org BEFORE INSERT ON public.ata_polos FOR EACH ROW EXECUTE FUNCTION public.set_preventivos_organization_id();
CREATE TRIGGER trg_tr_org BEFORE INSERT ON public.travels FOR EACH ROW EXECUTE FUNCTION public.set_preventivos_organization_id();
CREATE TRIGGER trg_nc_org BEFORE INSERT ON public.nucleos_central FOR EACH ROW EXECUTE FUNCTION public.set_preventivos_organization_id();
CREATE TRIGGER trg_atas_org BEFORE INSERT ON public.atas FOR EACH ROW EXECUTE FUNCTION public.set_preventivos_organization_id();
CREATE TRIGGER trg_dpg_org BEFORE INSERT ON public.dpg_gestao FOR EACH ROW EXECUTE FUNCTION public.set_preventivos_organization_id();

-- Políticas restritivas de isolamento por órgão (adicionais às existentes)
CREATE POLICY org_isolation ON public.nuclei AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.nucleos_central AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.nucleo_teletrabalho AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.nucleo_module_visibility AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.fire_extinguishers AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.hydrants AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.travels AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.atas AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.ata_polos AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.dpg_gestao AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));