CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  member_type text NOT NULL DEFAULT 'internal' CHECK (member_type IN ('internal','external')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','suspended','removed')),
  invited_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
-- P1: no lançamento, cada usuário pertence a uma única organização
CREATE UNIQUE INDEX organization_members_one_org_per_user ON public.organization_members(user_id) WHERE status <> 'removed';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_organization_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = _user_id AND status IN ('active','invited') LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.user_organization_id(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.user_organization_id(uuid) TO authenticated;

CREATE POLICY "Members view own organization" ON public.organizations FOR SELECT TO authenticated
  USING (id = public.user_organization_id(auth.uid()));
CREATE POLICY "Members view own org members" ON public.organization_members FOR SELECT TO authenticated
  USING (organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Admins manage own org members" ON public.organization_members FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) AND organization_id = public.user_organization_id(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) AND organization_id = public.user_organization_id(auth.uid()));

CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_org_members_updated BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Organização 1 (UUID fixo)
INSERT INTO public.organizations (id, nome, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Defensoria Pública do Estado de Mato Grosso', 'dpe-mt');

INSERT INTO public.organization_members (organization_id, user_id, member_type, status, activated_at)
SELECT '00000000-0000-0000-0000-000000000001', p.user_id,
  CASE WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'contratada') THEN 'external' ELSE 'internal' END,
  CASE WHEN p.is_active IS FALSE THEN 'suspended' ELSE 'active' END,
  now()
FROM public.profiles p WHERE p.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Novos perfis entram na org 1 (modelo de organização única no lançamento)
CREATE OR REPLACE FUNCTION public.auto_assign_default_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = NEW.user_id) THEN
    INSERT INTO public.organization_members (organization_id, user_id, member_type, status, activated_at)
    VALUES ('00000000-0000-0000-0000-000000000001', NEW.user_id, 'internal', 'active', now())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.auto_assign_default_organization() FROM anon, authenticated, public;
CREATE TRIGGER trg_profiles_default_org AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_assign_default_organization();

-- organization_id nas tabelas-raiz
ALTER TABLE public.obras ADD COLUMN organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.organizations(id);
ALTER TABLE public.nuclei ADD COLUMN organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.organizations(id);
ALTER TABLE public.maintenance_tickets ADD COLUMN organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.organizations(id);
CREATE INDEX idx_obras_org ON public.obras(organization_id);
CREATE INDEX idx_nuclei_org ON public.nuclei(organization_id);
CREATE INDEX idx_maint_tickets_org ON public.maintenance_tickets(organization_id);