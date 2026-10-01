ALTER TABLE public.rdo_activities ENABLE TRIGGER rdo_block_administracao_trigger;
ALTER TABLE public.rdo_activities ENABLE TRIGGER rdo_block_excesso_quantidade_trigger;
ALTER TABLE public.rdo_activities ENABLE TRIGGER trg_rdo_block_administracao;

CREATE OR REPLACE FUNCTION public.set_rdo_organization_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.obra_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id FROM public.obras WHERE id = NEW.obra_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rdo_reports_org ON public.rdo_reports;
CREATE TRIGGER trg_rdo_reports_org BEFORE INSERT OR UPDATE OF obra_id ON public.rdo_reports FOR EACH ROW EXECUTE FUNCTION public.set_rdo_organization_id();
DROP TRIGGER IF EXISTS trg_rdo_activities_org ON public.rdo_activities;
CREATE TRIGGER trg_rdo_activities_org BEFORE INSERT OR UPDATE OF obra_id ON public.rdo_activities FOR EACH ROW EXECUTE FUNCTION public.set_rdo_organization_id();
DROP TRIGGER IF EXISTS trg_rdo_occurrences_org ON public.rdo_occurrences;
CREATE TRIGGER trg_rdo_occurrences_org BEFORE INSERT OR UPDATE OF obra_id ON public.rdo_occurrences FOR EACH ROW EXECUTE FUNCTION public.set_rdo_organization_id();
DROP TRIGGER IF EXISTS trg_rdo_comments_org ON public.rdo_comments;
CREATE TRIGGER trg_rdo_comments_org BEFORE INSERT OR UPDATE OF obra_id ON public.rdo_comments FOR EACH ROW EXECUTE FUNCTION public.set_rdo_organization_id();
DROP TRIGGER IF EXISTS trg_rdo_media_org ON public.rdo_media;
CREATE TRIGGER trg_rdo_media_org BEFORE INSERT OR UPDATE OF obra_id ON public.rdo_media FOR EACH ROW EXECUTE FUNCTION public.set_rdo_organization_id();

CREATE POLICY "Org members can view rdo_reports of own org" ON public.rdo_reports FOR SELECT TO authenticated USING (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can insert rdo_reports in own org" ON public.rdo_reports FOR INSERT TO authenticated WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can update rdo_reports of own org" ON public.rdo_reports FOR UPDATE TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can delete rdo_reports of own org" ON public.rdo_reports FOR DELETE TO authenticated USING (organization_id = public.user_organization_id(auth.uid()));

CREATE POLICY "Org members can view rdo_activities of own org" ON public.rdo_activities FOR SELECT TO authenticated USING (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can insert rdo_activities in own org" ON public.rdo_activities FOR INSERT TO authenticated WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can update rdo_activities of own org" ON public.rdo_activities FOR UPDATE TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can delete rdo_activities of own org" ON public.rdo_activities FOR DELETE TO authenticated USING (organization_id = public.user_organization_id(auth.uid()));

CREATE POLICY "Org members can view rdo_occurrences of own org" ON public.rdo_occurrences FOR SELECT TO authenticated USING (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can insert rdo_occurrences in own org" ON public.rdo_occurrences FOR INSERT TO authenticated WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can update rdo_occurrences of own org" ON public.rdo_occurrences FOR UPDATE TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can delete rdo_occurrences of own org" ON public.rdo_occurrences FOR DELETE TO authenticated USING (organization_id = public.user_organization_id(auth.uid()));

CREATE POLICY "Org members can view rdo_comments of own org" ON public.rdo_comments FOR SELECT TO authenticated USING (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can insert rdo_comments in own org" ON public.rdo_comments FOR INSERT TO authenticated WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can update rdo_comments of own org" ON public.rdo_comments FOR UPDATE TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can delete rdo_comments of own org" ON public.rdo_comments FOR DELETE TO authenticated USING (organization_id = public.user_organization_id(auth.uid()));

CREATE POLICY "Org members can view rdo_media of own org" ON public.rdo_media FOR SELECT TO authenticated USING (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can insert rdo_media in own org" ON public.rdo_media FOR INSERT TO authenticated WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can update rdo_media of own org" ON public.rdo_media FOR UPDATE TO authenticated USING (organization_id = public.user_organization_id(auth.uid())) WITH CHECK (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org members can delete rdo_media of own org" ON public.rdo_media FOR DELETE TO authenticated USING (organization_id = public.user_organization_id(auth.uid()));