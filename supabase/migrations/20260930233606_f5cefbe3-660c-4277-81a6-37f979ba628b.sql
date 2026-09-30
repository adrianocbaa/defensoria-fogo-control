-- Lote 1 — Catálogo comercial SiDIF SaaS

CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalogo publico: leitura de plans" ON public.plans FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.plan_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  valid_from DATE NOT NULL,
  valid_to DATE,
  internal_users_limit INTEGER NOT NULL,
  external_users_limit INTEGER NOT NULL,
  storage_limit_bytes BIGINT NOT NULL,
  sso_enabled BOOLEAN NOT NULL DEFAULT false,
  api_enabled BOOLEAN NOT NULL DEFAULT false,
  priority_support BOOLEAN NOT NULL DEFAULT false,
  personalizacao_institucional BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plan_versions TO anon, authenticated;
GRANT ALL ON public.plan_versions TO service_role;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalogo publico: leitura de plan_versions" ON public.plan_versions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.commercial_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commercial_modules TO anon, authenticated;
GRANT ALL ON public.commercial_modules TO service_role;
ALTER TABLE public.commercial_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalogo publico: leitura de commercial_modules" ON public.commercial_modules FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.module_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.commercial_modules(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  nome TEXT NOT NULL,
  includes_tier_id UUID REFERENCES public.module_tiers(id),
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, key)
);
GRANT SELECT ON public.module_tiers TO anon, authenticated;
GRANT ALL ON public.module_tiers TO service_role;
ALTER TABLE public.module_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalogo publico: leitura de module_tiers" ON public.module_tiers FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  unidade TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT addons_tipo_check CHECK (tipo IN ('storage', 'internal_users', 'external_users'))
);
GRANT SELECT ON public.addons TO anon, authenticated;
GRANT ALL ON public.addons TO service_role;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalogo publico: leitura de addons" ON public.addons FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.price_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT price_tables_status_check CHECK (status IN ('draft', 'active', 'archived'))
);
GRANT SELECT ON public.price_tables TO anon, authenticated;
GRANT ALL ON public.price_tables TO service_role;
ALTER TABLE public.price_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalogo publico: leitura de price_tables" ON public.price_tables FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.price_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_table_id UUID NOT NULL REFERENCES public.price_tables(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  module_tier_id UUID REFERENCES public.module_tiers(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES public.addons(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT price_items_exatamente_um_alvo CHECK (
    (CASE WHEN plan_id IS NOT NULL AND module_tier_id IS NULL AND addon_id IS NULL THEN 1 ELSE 0 END
   + CASE WHEN plan_id IS NOT NULL AND module_tier_id IS NOT NULL AND addon_id IS NULL THEN 1 ELSE 0 END
   + CASE WHEN plan_id IS NULL AND module_tier_id IS NULL AND addon_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  ),
  CONSTRAINT price_items_valor_nao_negativo CHECK (amount_cents >= 0)
);
GRANT SELECT ON public.price_items TO anon, authenticated;
GRANT ALL ON public.price_items TO service_role;
ALTER TABLE public.price_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalogo publico: leitura de price_items" ON public.price_items FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plan_versions_updated_at BEFORE UPDATE ON public.plan_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_commercial_modules_updated_at BEFORE UPDATE ON public.commercial_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_module_tiers_updated_at BEFORE UPDATE ON public.module_tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_addons_updated_at BEFORE UPDATE ON public.addons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_price_tables_updated_at BEFORE UPDATE ON public.price_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_price_items_updated_at BEFORE UPDATE ON public.price_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();