-- =====================================================================
-- SiDIF — LOTE 1 — ESTRUTURA-BASE DE HOMOLOGAÇÃO
-- Estado ANTERIOR à correção do Lote 1 (reproduz a vulnerabilidade A1).
--
-- APLICAR SOMENTE no projeto Supabase isolado (sidif-homologacao).
-- NÃO aplicar em produção (mmumfgxngzaivvyqfbed).
--
-- Origem das definições: migrations reais deste repositório
-- (supabase/migrations) consolidadas. Nenhum dado institucional,
-- usuário real, cron, webhook, Storage, chave ou integração externa.
--
-- Objetos nativos do Supabase (auth.users, auth.uid(), auth.jwt())
-- NÃO são recriados aqui — já existem em qualquer projeto Supabase.
--
-- ATENÇÃO — BLOCO 6 (public.user_roles / public.has_role / public.is_admin
-- atual) NÃO PÔDE SER COMPROVADO PELO REPOSITÓRIO. Ver instruções no
-- próprio bloco: sem essas definições reais o Lote 1 NÃO deve ser
-- homologado. O arquivo para até lá, de forma explícita.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. TIPOS
-- Fonte: 20250721030643 / 20250721030822 / 20260303143915 (user_role)
--        20250726154333 / 20250930031745 / 20251218182426 (sector_type)
-- Valores conforme o catálogo atual do sistema.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE n.nspname = 'public' AND t.typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM
      ('admin', 'editor', 'viewer', 'manutencao', 'gm', 'prestadora', 'contratada', 'demo');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE n.nspname = 'public' AND t.typname = 'sector_type') THEN
    CREATE TYPE public.sector_type AS ENUM
      ('manutencao', 'obra', 'preventivos', 'ar_condicionado', 'projetos', 'nucleos',
       'nucleos_central', 'dif', 'segunda_sub', 'contratada', 'orcamento', 'dimensionamento');
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. FUNÇÃO DE TIMESTAMP
-- Fonte: 20250716143313 (trigger update_profiles_updated_at depende dela)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. EMPRESAS (mínimo necessário para a FK profiles.empresa_id)
-- Fonte: 20251205174122. Apenas estrutura; nenhuma linha é inserida.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.empresas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj           text UNIQUE NOT NULL,
  razao_social   text NOT NULL,
  nome_fantasia  text,
  email          text,
  telefone       text,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 4. AUDIT_LOGS
-- Fonte: 20250717202340 + 20251009211625 (user_id passou a aceitar NULL)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      text NOT NULL,
  record_id       uuid NOT NULL,
  operation       text NOT NULL,
  old_values      jsonb,
  new_values      jsonb,
  changed_fields  text[],
  user_id         uuid,
  user_email      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can view audit logs" ON public.audit_logs;
CREATE POLICY "All authenticated users can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "All authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 5. PROFILES — estrutura consolidada, estado ANTERIOR ao Lote 1
-- Fontes: 20250716143906 (criação, policies, trigger updated_at),
--         20250721030643/030822/030911/0332xx (coluna role -> user_role),
--         20250726154333 + 20250930212837 (sectors),
--         20250929195120 (phone/position/department/language/theme),
--         20250929205522 (email),
--         20250930005206 (is_active),
--         20251118005640 (force_password_change),
--         20251205174122 (empresa_id),
--         20251218182929 (setores_atuantes),
--         20260424181953 (crea_cau),
--         20260713200116 (is_maintenance_responsible)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name                text,
  avatar_url                  text,
  email                       text,
  phone                       text,
  position                    text,
  department                  text,
  crea_cau                    text,
  language                    text DEFAULT 'pt-BR',
  theme                       text DEFAULT 'system',
  role                        public.user_role DEFAULT 'viewer'::public.user_role,
  sectors                     public.sector_type[] DEFAULT ARRAY['nucleos'::public.sector_type],
  setores_atuantes            text[] DEFAULT '{}'::text[],
  empresa_id                  uuid REFERENCES public.empresas(id),
  is_active                   boolean NOT NULL DEFAULT true,
  is_maintenance_responsible  boolean NOT NULL DEFAULT false,
  force_password_change       boolean DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger de timestamp (preexistente em produção)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GRANTS AMPLOS — reproduzem o estado anterior ao Lote 1 (relacl arwdDxtm).
-- É exatamente a superfície que a migration v3 reduz e que o rollback restaura.
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DO $$
BEGIN
  IF current_setting('server_version_num')::int >= 170000 THEN
    EXECUTE 'GRANT MAINTAIN ON public.profiles TO anon';
    EXECUTE 'GRANT MAINTAIN ON public.profiles TO authenticated';
  END IF;
END $$;

-- POLICIES — estado anterior ao Lote 1.
-- UPDATE sem WITH CHECK: é a falha A1 que o Lote 1 corrige.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- SELECT — fonte: 20260220125907 (policies vigentes)
DROP POLICY IF EXISTS "Internal staff can view all active profiles" ON public.profiles;
CREATE POLICY "Internal staff can view all active profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND NOT public.has_role(auth.uid(), 'contratada'::public.user_role)
  );

DROP POLICY IF EXISTS "Contratada can view own profile" ON public.profiles;
CREATE POLICY "Contratada can view own profile"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'contratada'::public.user_role)
    AND user_id = auth.uid()
  );

-- ---------------------------------------------------------------------
-- 6. CRIAÇÃO AUTOMÁTICA DE PERFIL
-- Fonte: 20250716143906 + 20250929205522 (versão vigente da função).
-- O trigger em auth.users é pré-requisito obrigatório da suíte.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'display_name', new.email);
  RETURN new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- =====================================================================
-- 7. BLOCO PENDENTE — NÃO PODE SER PREENCHIDO A PARTIR DESTE REPOSITÓRIO
-- =====================================================================
-- As definições abaixo NÃO existem em supabase/migrations e, portanto,
-- NÃO PODEM SER COMPROVADAS aqui. Elas são indispensáveis: o Lote 1
-- baseia toda a autorização administrativa em
--   public.is_admin(auth.uid()) -> public.has_role() -> public.user_roles
-- e as policies de SELECT de profiles (bloco 5) também usam has_role().
--
--   a) TABELA public.user_roles  — colunas, PK, FKs, UNIQUE, grants, RLS
--                                   e policies reais (5 colunas, 6 policies,
--                                   2 FKs, segundo o catálogo atual).
--   b) FUNÇÃO public.has_role(uuid, public.user_role)  — corpo real.
--   c) FUNÇÃO public.is_admin(uuid)  — corpo REAL ATUAL. A única versão
--      presente no repositório (20250721030911) lê public.profiles.role,
--      o que NÃO corresponde ao desenho atual baseado em user_roles.
--
-- NÃO invente versões simplificadas destas definições: isso faria a suíte
-- passar sem reproduzir o comportamento real e invalidaria a homologação.
--
-- COMO OBTER (leitura, sem alterar nada), no SQL Editor do projeto ATUAL:
--   ver docs/lote1/extrair_definicoes_autorizacao.sql
-- Cole o resultado neste arquivo, abaixo desta linha, antes de aplicar
-- a estrutura-base no projeto de homologação.
-- =====================================================================
