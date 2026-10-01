CREATE OR REPLACE FUNCTION public.obra_in_user_org(_obra_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.obras o
    WHERE o.id = _obra_id AND o.organization_id = public.user_organization_id(auth.uid()))
$$;
REVOKE EXECUTE ON FUNCTION public.obra_in_user_org(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.obra_in_user_org(uuid) TO authenticated;

CREATE POLICY "org_isolation" ON public.obras AS RESTRICTIVE FOR ALL TO authenticated
  USING (organization_id = public.user_organization_id(auth.uid()))
  WITH CHECK (organization_id = public.user_organization_id(auth.uid()));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['medicao_sessions','medicoes','aditivo_sessions','aditivos','orcamento_items','cronograma_financeiro',
    'medicao_rdo_imports','obra_arts','obra_checklist_items','obra_fiscal_substitutos','obra_inicio_alteracoes','obra_action_logs','user_obra_access']
  LOOP
    EXECUTE format('CREATE POLICY "org_isolation" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.obra_in_user_org(obra_id)) WITH CHECK (public.obra_in_user_org(obra_id))', t);
  END LOOP;
END $$;

CREATE POLICY "org_isolation" ON public.medicao_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.medicao_sessions s WHERE s.id = medicao_id AND public.obra_in_user_org(s.obra_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.medicao_sessions s WHERE s.id = medicao_id AND public.obra_in_user_org(s.obra_id)));
CREATE POLICY "org_isolation" ON public.aditivo_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.aditivo_sessions s WHERE s.id = aditivo_id AND public.obra_in_user_org(s.obra_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.aditivo_sessions s WHERE s.id = aditivo_id AND public.obra_in_user_org(s.obra_id)));
CREATE POLICY "org_isolation" ON public.cronograma_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cronograma_financeiro c WHERE c.id = cronograma_id AND public.obra_in_user_org(c.obra_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cronograma_financeiro c WHERE c.id = cronograma_id AND public.obra_in_user_org(c.obra_id)));
CREATE POLICY "org_isolation" ON public.cronograma_periodos AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cronograma_items i JOIN public.cronograma_financeiro c ON c.id = i.cronograma_id WHERE i.id = item_id AND public.obra_in_user_org(c.obra_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cronograma_items i JOIN public.cronograma_financeiro c ON c.id = i.cronograma_id WHERE i.id = item_id AND public.obra_in_user_org(c.obra_id)));