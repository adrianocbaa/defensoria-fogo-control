-- =====================================================================
-- SiDIF — LOTE 1 (public.profiles) — v3
-- PROPOSTA. NÃO APLICAR EM PRODUÇÃO (projeto mmumfgxngzaivvyqfbed).
-- Destino: projeto Supabase isolado de homologação.
--
-- Objetivo: impedir que um usuário comum conceda privilégios a si mesmo
-- alterando colunas sensíveis de public.profiles, mantendo a guarda como
-- SECURITY INVOKER e a autorização administrativa apenas em
-- public.is_admin(auth.uid()) -> public.has_role() -> public.user_roles.
--
-- Catálogo confirmado em 2026-09-14 (somente leitura, produção):
--   role                        user_role  NULL     default 'viewer'::user_role
--   is_active                   boolean    NOT NULL default true
--   is_maintenance_responsible  boolean    NOT NULL default false
--   force_password_change       boolean    NULL     default false
--   empresa_id                  uuid       NULL     default NULL
--   email                       text       NULL     (NULLABLE)
--   setores_atuantes            text[]     NULL     default '{}'::text[]
--   sectors                     sector_type[] NULL  default ARRAY['nucleos'::sector_type]
--   id                          uuid       NOT NULL default gen_random_uuid()
--   user_id                     uuid       NOT NULL
--   created_at                  timestamptz NOT NULL default now()
--   relacl profiles: anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm
--   owner da tabela: postgres
--   triggers existentes: update_profiles_updated_at (BEFORE UPDATE) — nenhuma auditoria
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. GUARDA — SECURITY INVOKER (explícito). Sem SECURITY DEFINER.
--    current_user aqui é a role real da sessão:
--      'authenticated' | 'anon'  -> usuário final via PostgREST
--      'service_role'            -> chamada com service key
--      'postgres'/'supabase_admin'/'supabase_auth_admin'
--                                -> statement originado dentro de função
--                                   SECURITY DEFINER do sistema (handle_new_user)
--    Não há caminho para um usuário final assumir essas roles via PostgREST.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_guard_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_dbrole  text := current_user;
  v_actor   uuid := auth.uid();
  v_admin   boolean;
BEGIN
  -- Contexto de serviço / criação automática de perfil (handle_new_user).
  IF v_dbrole IN ('service_role', 'postgres', 'supabase_admin', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  -- Qualquer outra role (authenticated, anon, roles desconhecidas) é tratada
  -- como usuário comum até prova em contrário (fail-closed).
  v_admin := COALESCE(public.is_admin(v_actor), false);

  IF TG_OP = 'INSERT' THEN
    -- INSERT direto por usuário comum não é usado por nenhum fluxo do SiDIF
    -- (a policy de INSERT é removida abaixo). Caso algum caminho residual
    -- exista, os campos privilegiados são neutralizados, nunca herdados do payload.
    IF NOT v_admin THEN
      IF NEW.user_id IS DISTINCT FROM v_actor OR v_actor IS NULL THEN
        RAISE EXCEPTION 'profiles: criação de perfil de terceiro não permitida'
          USING ERRCODE = '42501';
      END IF;
      NEW.role                       := 'viewer'::user_role;
      NEW.is_active                  := true;
      NEW.is_maintenance_responsible := false;
      NEW.force_password_change      := false;
      NEW.empresa_id                 := NULL;
      NEW.setores_atuantes           := '{}'::text[];
      NEW.created_at                 := now();
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE ------------------------------------------------------------
  -- Imutáveis para todos, inclusive administradores.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'profiles: colunas id, user_id e created_at são imutáveis'
      USING ERRCODE = '42501';
  END IF;

  IF v_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_maintenance_responsible IS DISTINCT FROM OLD.is_maintenance_responsible
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.empresa_id IS DISTINCT FROM OLD.empresa_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.setores_atuantes IS DISTINCT FROM OLD.setores_atuantes
     OR NEW.force_password_change IS DISTINCT FROM OLD.force_password_change THEN
    RAISE EXCEPTION 'profiles: alteração de coluna privilegiada requer administrador'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profiles_guard_privileged_columns() IS
  'Lote 1: guarda SECURITY INVOKER. Bloqueia autoconcessão de privilégios em public.profiles. Autorização admin exclusivamente por public.is_admin(auth.uid()).';

DROP TRIGGER IF EXISTS profiles_guard_privileged_columns_trg ON public.profiles;
CREATE TRIGGER profiles_guard_privileged_columns_trg
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_privileged_columns();

-- ---------------------------------------------------------------------
-- 2. AUDITORIA — AFTER UPDATE, SECURITY DEFINER apenas para gravar.
--    Não participa de nenhuma decisão de autorização.
--    Executor = auth.uid(); chamadas de serviço gravam user_id NULL.
--    current_user NÃO é usado como identidade do executor.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_audit_privileged_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fields  text[] := '{}';
  v_actor   uuid := auth.uid();
  v_email   text;
  v_old     jsonb;
  v_new     jsonb;
  v_f       text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN v_fields := v_fields || 'role'; END IF;
  IF NEW.is_maintenance_responsible IS DISTINCT FROM OLD.is_maintenance_responsible THEN v_fields := v_fields || 'is_maintenance_responsible'; END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN v_fields := v_fields || 'is_active'; END IF;
  IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN v_fields := v_fields || 'empresa_id'; END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN v_fields := v_fields || 'email'; END IF;
  IF NEW.setores_atuantes IS DISTINCT FROM OLD.setores_atuantes THEN v_fields := v_fields || 'setores_atuantes'; END IF;
  IF NEW.force_password_change IS DISTINCT FROM OLD.force_password_change THEN v_fields := v_fields || 'force_password_change'; END IF;

  IF COALESCE(array_length(v_fields, 1), 0) = 0 THEN
    RETURN NULL;  -- alterações pessoais não geram auditoria privilegiada
  END IF;

  v_old := '{}'::jsonb;
  v_new := '{}'::jsonb;
  FOREACH v_f IN ARRAY v_fields LOOP
    v_old := v_old || jsonb_build_object(v_f, to_jsonb(OLD) -> v_f);
    v_new := v_new || jsonb_build_object(v_f, to_jsonb(NEW) -> v_f);
  END LOOP;

  IF v_actor IS NOT NULL THEN
    SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_actor;
  END IF;

  INSERT INTO public.audit_logs
    (table_name, record_id, operation, old_values, new_values, changed_fields, user_id, user_email)
  VALUES
    ('profiles', NEW.id, 'UPDATE', v_old, v_new, v_fields, v_actor, v_email);

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.profiles_audit_privileged_changes() IS
  'Lote 1: auditoria AFTER UPDATE dos 7 campos privilegiados de profiles. SECURITY DEFINER apenas para gravar em audit_logs; sem papel de autorização. Executor = auth.uid() (NULL em chamadas service_role).';

DROP TRIGGER IF EXISTS profiles_audit_privileged_changes_trg ON public.profiles;
CREATE TRIGGER profiles_audit_privileged_changes_trg
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_audit_privileged_changes();

-- ---------------------------------------------------------------------
-- 3. POLICIES
--    Nenhum fluxo do SiDIF (frontend ou Edge Function) insere em profiles:
--    a criação é feita por public.handle_new_user() (SECURITY DEFINER,
--    trigger em auth.users). Logo, a policy de INSERT para usuários comuns
--    é removida.
--    As policies de UPDATE existentes ("Users can update their own profile"
--    e "Admins can update any profile") são recriadas com WITH CHECK
--    explícito, para não depender da reutilização implícita do USING.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 4. GRANTS
--    Estado atual (confirmado): anon e authenticated possuem arwdDxtm
--    (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN).
--    anon não lê nada hoje apenas porque a policy de SELECT é USING(false);
--    a RLS é a única barreira. Reduzimos a superfície ao necessário.
-- ---------------------------------------------------------------------
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM authenticated;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

COMMIT;

-- ---------------------------------------------------------------------
-- PÓS-MIGRATION (verificação manual, não executada aqui):
--   SELECT p.proname, p.prosecdef, r.rolname AS owner
--     FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
--     JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname='public'
--      AND p.proname IN ('profiles_guard_privileged_columns','profiles_audit_privileged_changes');
--   -- Esperado: guard prosecdef = false; audit prosecdef = true.
--   -- Esta migration NÃO contém ALTER FUNCTION ... OWNER TO ...: o proprietário
--   -- será a role que executar a migration. Para a guarda isso é irrelevante
--   -- (INVOKER). Para a auditoria (DEFINER) o proprietário deve ser verificado
--   -- e documentado após a execução.
--   SELECT relacl FROM pg_class WHERE oid='public.profiles'::regclass;
-- ---------------------------------------------------------------------
