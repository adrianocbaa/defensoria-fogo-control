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
-- ATENÇÃO — STATUS: E1 (funções), E2 (colunas), E3 (chaves), E4-1 (RLS),
-- E4-2 (grants), E4-3 (policies) e E6 (is_maintenance_responsible)
-- CONFIRMADOS e registrados abaixo. ARQUIVO PRONTO para o preflight no
-- projeto sidif-homologacao.
-- Pendente (opcional, não bloqueia): E7 — grants de EXECUTE das funções.
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
-- As policies de profiles são criadas no bloco 10-A, DEPOIS de
-- has_role/is_admin existirem — o PostgreSQL valida as expressões das
-- policies na criação, e funções inexistentes falhariam aqui.

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
-- 7. USER_ROLES — TABELA (E2 + E3 + E4-1 + E4-2 CONFIRMADOS)
-- =====================================================================
-- Reproduz o catálogo do projeto ATUAL, sem alteração.
-- E2 (colunas), E3 (restrições), E4-1 (RLS ativa, FORCE RLS desligado —
-- padrão), E4-2 (grants amplos para anon, authenticated, postgres e
-- service_role). Os grants amplos são exatamente o estado que o Lote 1
-- audita; não são reduzidos aqui.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.user_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON public.user_roles TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON public.user_roles TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON public.user_roles TO postgres;
GRANT ALL ON public.user_roles TO service_role;

-- =====================================================================
-- 8. FUNÇÕES DE AUTORIZAÇÃO EXTRAÍDAS DO PROJETO ATUAL (E1 CONFIRMADO)
-- =====================================================================
-- As duas funções abaixo foram extraídas do catálogo do projeto ATUAL
-- (consulta E1 de extrair_definicoes_autorizacao.sql, resultado colado
-- e conferido). Elas representam o estado real vigente e devem ser
-- reproduzidas aqui SEM ALTERAÇÃO. Ficam DEPOIS da tabela (o PostgreSQL
-- valida o corpo na criação).
-- =====================================================================

-- FUNÇÃO CONFIRMADA (E1) — public.has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$function$;

-- FUNÇÃO CONFIRMADA (E1) — public.is_admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(user_uuid, 'admin'::user_role);
$function$;

-- =====================================================================
-- 10-A. POLICIES DE PROFILES — estado anterior ao Lote 1
-- =====================================================================
-- Movidas para cá: dependem de has_role/is_admin (bloco 8).
-- UPDATE sem WITH CHECK: é a falha A1 que o Lote 1 corrige.
-- SELECT — fonte: 20260220125907 (policies vigentes)

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

-- =====================================================================
-- 9. FUNÇÃO EXTRAÍDA DO PROJETO ATUAL (E6 CONFIRMADO)
-- =====================================================================
-- Definição real de public.is_maintenance_responsible(uuid), extraída do
-- catálogo do projeto ATUAL (consulta E6, resultado colado e conferido).
-- Referenciada pela policy "Maintenance responsibles can view all roles"
-- (bloco 11). Fica DEPOIS da tabela profiles (bloco 5) — o PostgreSQL
-- valida o corpo na criação.
-- =====================================================================

-- FUNÇÃO CONFIRMADA (E6) — public.is_maintenance_responsible
CREATE OR REPLACE FUNCTION public.is_maintenance_responsible(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND is_maintenance_responsible = true
  );
$function$;

-- =====================================================================
-- 11. POLICIES DE USER_ROLES — E4-3 CONFIRMADO (6 policies)
-- =====================================================================
-- Reproduz o catálogo do projeto ATUAL, sem alteração (pg_policies).
-- Observação fiel ao estado anterior ao Lote 1: a policy de UPDATE tem
-- USING mas WITH CHECK NULL; a de INSERT tem WITH CHECK mas USING NULL.
--
-- ATENÇÃO: depende do bloco 9 (is_maintenance_responsible) existir antes.

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role));

DROP POLICY IF EXISTS "Maintenance responsibles can view all roles" ON public.user_roles;
CREATE POLICY "Maintenance responsibles can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_maintenance_responsible(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

COMMIT;

-- =====================================================================
-- STATUS FINAL DO ARQUIVO (não remover):
--   CONFIRMADO: tipos, empresas, audit_logs, profiles, handle_new_user
--   + trigger, user_roles (E2/E3/E4-1/E4-2), has_role e is_admin (E1),
--   policies de user_roles (E4-3), is_maintenance_responsible (E6).
--   ARQUIVO PRONTO para aplicação no projeto sidif-homologacao.
--   Pendente (opcional, não bloqueia): E7 — grants de EXECUTE das
--   funções (o default do PostgreSQL já concede EXECUTE ao PUBLIC).
-- =====================================================================
