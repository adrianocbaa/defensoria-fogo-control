DO $$
DECLARE
  _org uuid := '00000000-0000-0000-0000-000000000002';
  _adm uuid := 'd1840b05-e2c5-4200-b273-db6ce61696df';
  _edt uuid := 'a744d415-2861-43e5-98bb-e4e753bba606';
  _ctr uuid := '1f54f9de-a0ab-4328-86af-fe00da5a1fee';
  _emp uuid; _obra uuid;
BEGIN
  UPDATE public.organization_members SET organization_id=_org,
    member_type = CASE WHEN user_id=_ctr THEN 'external' ELSE 'internal' END, status='active', activated_at=now()
   WHERE user_id IN (_adm,_edt,_ctr);

  INSERT INTO public.empresas (cnpj, razao_social, nome_fantasia, organization_id, email)
  VALUES ('00.000.000/0002-00','HOMOLOG Contratada Teste Ltda','HOMOLOG Contratada',_org,'contratada.homolog@sidif.test')
  RETURNING id INTO _emp;

  INSERT INTO public.user_roles (user_id, role) VALUES (_adm,'admin'),(_edt,'editor'),(_ctr,'contratada');
  UPDATE public.profiles SET role='admin', display_name='HOMOLOG Admin', email='admin.homolog@sidif.test' WHERE user_id=_adm;
  UPDATE public.profiles SET role='editor', display_name='HOMOLOG Editor', email='editor.homolog@sidif.test' WHERE user_id=_edt;
  UPDATE public.profiles SET role='contratada', display_name='HOMOLOG Contratada', email='contratada.homolog@sidif.test', empresa_id=_emp WHERE user_id=_ctr;

  INSERT INTO public.organization_entitlement_overrides (organization_id,key,value,motivo,valid_to,granted_by) VALUES
   (_org,'can_use_rdo','true'::jsonb,'H2 homologação temporária',current_date+7,NULL),
   (_org,'can_use_manutencao','true'::jsonb,'H2 homologação temporária',current_date+7,NULL);
  PERFORM public.recalculate_entitlements(_org);

  INSERT INTO public.obras (nome, municipio, status, tipo, valor_total, organization_id, is_demo)
  VALUES ('HOMOLOG Obra H2','Cuiabá','em_andamento','reforma',100000,_org,false) RETURNING id INTO _obra;
  INSERT INTO public.user_obra_access (user_id, obra_id, created_by) VALUES (_ctr,_obra,_adm) ON CONFLICT DO NOTHING;

  INSERT INTO public.maintenance_types (nome, ordem, ativo, organization_id) VALUES ('HOMOLOG Elétrica',1,true,_org);
  INSERT INTO public.maintenance_tickets (title, priority, type, location, assignee, status, user_id, organization_id, is_draft)
  VALUES ('HOMOLOG Chamado H2','Média','HOMOLOG Elétrica','Sede Teste','HOMOLOG Editor','Pendente',_edt,_org,false);
END $$;