CREATE TABLE public.commercial_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_orgao text NOT NULL,
  cnpj text,
  contato_nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  plan_key text,
  module_tier_keys text[] DEFAULT '{}',
  addon_keys text[] DEFAULT '{}',
  mensagem text,
  status text NOT NULL DEFAULT 'novo',
  notas_internas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.commercial_leads TO anon;
GRANT SELECT, UPDATE ON public.commercial_leads TO authenticated;
GRANT ALL ON public.commercial_leads TO service_role;

ALTER TABLE public.commercial_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visitantes enviam pedidos de proposta"
ON public.commercial_leads FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Super admin le pedidos de proposta"
ON public.commercial_leads FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin atualiza pedidos de proposta"
ON public.commercial_leads FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_commercial_leads_updated_at BEFORE UPDATE ON public.commercial_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();