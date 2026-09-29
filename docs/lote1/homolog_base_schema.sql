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
-- E4-2 (grants) e E4-3 (policies) CONFIRMADOS e registrados abaixo.
-- NOVA DEPENDÊNCIA DESCOBERTA NA E4-3: a policy "Maintenance responsibles
-- can view all roles" referencia public.is_maintenance_responsible(uuid),
-- cuja definição ainda NÃO foi extraída (consulta E6 de
-- extrair_definicoes_autorizacao.sql). Sem E6 este arquivo NÃO deve ser
-- aplicado — a criação das policies falhará sem a função. O arquivo para
-- até lá, de forma explícita.
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
-- 7. DEFINIÇÕES DE AUTORIZAÇÃO EXTRAÍDAS DO PROJETO ATUAL (E1)
-- =====================================================================
-- As duas funções abaixo foram extraídas do catálogo do projeto ATUAL
-- (consulta E1 de extrair_definicoes_autorizacao.sql, resultado colado
-- e conferido). Elas representam o estado real vigente e devem ser
-- reproduzidas aqui SEM ALTERAÇÃO.
--
-- PENDENTE: a TABELA public.user_roles ainda não foi comprovada
-- (colunas: E2; chaves: E3; grants/policies: E4). Ela é pré-requisito
-- destas funções (o corpo delas referencia a tabela). NÃO aplique este
-- arquivo enquanto E2–E4 não forem coladas no sub-bloco 8 abaixo.
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
-- 8. BLOCO PENDENTE — TABELA public.user_roles (aguardando E4)
-- =====================================================================
-- E2 — RESULTADO CONFIRMADO (colado pelo usuário, catálogo do projeto
-- ATUAL, 5 linhas — reproduzir sem alteração):
--
--   column_name | data_type                | udt_name   | is_nullable | column_default
--   ------------+--------------------------+------------+-------------+------------------
--   id          | uuid                     | uuid       | NO          | gen_random_uuid()
--   user_id     | uuid                     | uuid       | NO          | NULL
--   role        | USER-DEFINED             | user_role  | NO          | NULL
--   created_at  | timestamp with time zone | timestamptz| NO          | now()
--   created_by  | uuid                     | uuid       | YES         | NULL
--
-- E3 — RESULTADO CONFIRMADO (colado pelo usuário, 4 linhas — reproduzir
-- sem alteração):
--
--   conname                   | definicao
--   --------------------------+--------------------------------------------------------------
--   user_roles_created_by_fkey | FOREIGN KEY (created_by) REFERENCES auth.users(id)
--   user_roles_pkey            | PRIMARY KEY (id)
--   user_roles_user_id_fkey    | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
--   user_roles_user_id_role_key| UNIQUE (user_id, role)
--
-- E4 — RESULTADO PARCIALMENTE CONFIRMADO (colado pelo usuário):
--
--   a) RLS: relrowsecurity = true, relforcerowsecurity = false (E4-1)
--
--   b) GRANTS CONFIRMADOS (E4-2, 4 linhas — todos com o conjunto completo
--      DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE):
--
--     grantee       | privilegios
--     --------------+----------------------------------------------------------
--     anon          | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--     authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--     postgres      | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--     service_role  | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--
-- AINDA PENDENTE (bloqueia a aplicação deste arquivo):
--   E4-3 — policies reais de public.user_roles (6 policies, segundo o catálogo)
--
-- Com a E4 em mãos, inserir no corpo do arquivo (ordenado):
--   a) CREATE TABLE public.user_roles ...  ANTES das funções do bloco 7
--      (o corpo delas referencia a tabela e o PostgreSQL valida na criação);
--   b) os GRANTs e policies de user_roles logo após a tabela;
--   c) só então as funções has_role e is_admin.
-- Enquanto a E4 não chegar, ESTE ARQUIVO NÃO DEVE SER APLICADO em
-- nenhum banco — o Lote 1 baseia toda a autorização administrativa em
-- user_roles/has_role/is_admin.
-- =====================================================================
