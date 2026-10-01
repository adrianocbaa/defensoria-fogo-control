DROP POLICY "Contratada can delete rdo_activities of assigned obras" ON public.rdo_activities;
DROP POLICY "Contratada can insert rdo_activities for assigned obras" ON public.rdo_activities;
DROP POLICY "Contratada can update rdo_activities of assigned obras" ON public.rdo_activities;
DROP POLICY "Contratada can view rdo_activities of assigned obras" ON public.rdo_activities;
DROP POLICY "Contratada users can manage rdo_activities of assigned obras" ON public.rdo_activities;
DROP POLICY "Org members can delete rdo_activities of own org" ON public.rdo_activities;
DROP POLICY "Org members can insert rdo_activities in own org" ON public.rdo_activities;
DROP POLICY "Org members can update rdo_activities of own org" ON public.rdo_activities;
DROP POLICY "Org members can view rdo_activities of own org" ON public.rdo_activities;
DROP POLICY "Users with edit permission can delete rdo_activities" ON public.rdo_activities;
DROP POLICY "Users with edit permission can insert rdo_activities" ON public.rdo_activities;
DROP POLICY "Users with edit permission can update rdo_activities" ON public.rdo_activities;
DROP POLICY "Users with edit permission can view rdo_activities" ON public.rdo_activities;
DROP POLICY rdo_activities_delete_boundary ON public.rdo_activities;
DROP POLICY rdo_activities_read_boundary ON public.rdo_activities;
DROP POLICY rdo_activities_update_boundary ON public.rdo_activities;
DROP POLICY rdo_activities_write_boundary ON public.rdo_activities;

CREATE POLICY "Contratada users can manage rdo_activities of assigned obras" ON public.rdo_activities FOR ALL TO authenticated
 USING ((SELECT public.has_role((SELECT auth.uid()), 'contratada'::user_role)) AND public.user_has_obra_access((SELECT auth.uid()), obra_id))
 WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'contratada'::user_role)) AND public.user_has_obra_access((SELECT auth.uid()), obra_id));
CREATE POLICY "Org members can manage rdo_activities of own org" ON public.rdo_activities FOR ALL TO authenticated
 USING (organization_id = (SELECT public.user_organization_id((SELECT auth.uid()))))
 WITH CHECK (organization_id = (SELECT public.user_organization_id((SELECT auth.uid()))));
CREATE POLICY "Users with edit permission can manage rdo_activities" ON public.rdo_activities FOR ALL TO authenticated
 USING ((SELECT public.can_edit_rdo())) WITH CHECK ((SELECT public.can_edit_rdo()));

CREATE POLICY rdo_activities_read_boundary ON public.rdo_activities AS RESTRICTIVE FOR SELECT TO authenticated
 USING (organization_id = (SELECT public.user_organization_id((SELECT auth.uid()))) OR EXISTS (SELECT 1 FROM public.obras o WHERE o.id = rdo_activities.obra_id AND o.is_demo IS NOT TRUE));
CREATE POLICY rdo_activities_write_boundary ON public.rdo_activities AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (organization_id = (SELECT public.user_organization_id((SELECT auth.uid()))));
CREATE POLICY rdo_activities_update_boundary ON public.rdo_activities AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (organization_id = (SELECT public.user_organization_id((SELECT auth.uid()))))
 WITH CHECK (organization_id = (SELECT public.user_organization_id((SELECT auth.uid()))));
CREATE POLICY rdo_activities_delete_boundary ON public.rdo_activities AS RESTRICTIVE FOR DELETE TO authenticated
 USING (organization_id = (SELECT public.user_organization_id((SELECT auth.uid()))));

CREATE INDEX IF NOT EXISTS idx_rdo_activities_report_exec ON public.rdo_activities (report_id, executado_dia);