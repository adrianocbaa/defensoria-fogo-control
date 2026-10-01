-- 6c: organization_id nas tabelas filhas de manutenção
ALTER TABLE public.maintenance_ticket_services ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.maintenance_ticket_impediments ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.maintenance_ticket_status_history ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.maintenance_ticket_emails ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.maintenance_ticket_email_outbox ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_mts_org ON public.maintenance_ticket_services(organization_id);
CREATE INDEX IF NOT EXISTS idx_mti_org ON public.maintenance_ticket_impediments(organization_id);
CREATE INDEX IF NOT EXISTS idx_mtsh_org ON public.maintenance_ticket_status_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_mte_org ON public.maintenance_ticket_emails(organization_id);
CREATE INDEX IF NOT EXISTS idx_mteo_org ON public.maintenance_ticket_email_outbox(organization_id);

-- Backfill a partir do chamado pai
UPDATE public.maintenance_ticket_services s SET organization_id = t.organization_id FROM public.maintenance_tickets t WHERE s.ticket_id = t.id AND s.organization_id IS NULL;
UPDATE public.maintenance_ticket_impediments i SET organization_id = t.organization_id FROM public.maintenance_tickets t WHERE i.ticket_id = t.id AND i.organization_id IS NULL;
UPDATE public.maintenance_ticket_status_history h SET organization_id = t.organization_id FROM public.maintenance_tickets t WHERE h.ticket_id = t.id AND h.organization_id IS NULL;
UPDATE public.maintenance_ticket_emails e SET organization_id = t.organization_id FROM public.maintenance_tickets t WHERE e.ticket_id = t.id AND e.organization_id IS NULL;
UPDATE public.maintenance_ticket_email_outbox o SET organization_id = t.organization_id FROM public.maintenance_tickets t WHERE o.ticket_id = t.id AND o.organization_id IS NULL;

-- Preenchimento automático no insert (filhas herdam do chamado; chamado herda da org do usuário)
CREATE OR REPLACE FUNCTION public.set_maintenance_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    IF TG_TABLE_NAME = 'maintenance_tickets' THEN
      NEW.organization_id := public.user_organization_id(auth.uid());
    ELSE
      SELECT t.organization_id INTO NEW.organization_id
      FROM public.maintenance_tickets t WHERE t.id = NEW.ticket_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_maintenance_organization_id() FROM anon, authenticated;

CREATE TRIGGER trg_mts_org BEFORE INSERT ON public.maintenance_ticket_services FOR EACH ROW EXECUTE FUNCTION public.set_maintenance_organization_id();
CREATE TRIGGER trg_mti_org BEFORE INSERT ON public.maintenance_ticket_impediments FOR EACH ROW EXECUTE FUNCTION public.set_maintenance_organization_id();
CREATE TRIGGER trg_mtsh_org BEFORE INSERT ON public.maintenance_ticket_status_history FOR EACH ROW EXECUTE FUNCTION public.set_maintenance_organization_id();
CREATE TRIGGER trg_mte_org BEFORE INSERT ON public.maintenance_ticket_emails FOR EACH ROW EXECUTE FUNCTION public.set_maintenance_organization_id();
CREATE TRIGGER trg_mteo_org BEFORE INSERT ON public.maintenance_ticket_email_outbox FOR EACH ROW EXECUTE FUNCTION public.set_maintenance_organization_id();
CREATE TRIGGER trg_mt_org BEFORE INSERT ON public.maintenance_tickets FOR EACH ROW EXECUTE FUNCTION public.set_maintenance_organization_id();

-- Políticas restritivas de isolamento por órgão (adicionais às existentes)
CREATE POLICY org_isolation ON public.maintenance_tickets AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.maintenance_ticket_services AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.maintenance_ticket_impediments AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.maintenance_ticket_status_history AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.maintenance_ticket_emails AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY org_isolation ON public.maintenance_ticket_email_outbox AS RESTRICTIVE FOR ALL TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));