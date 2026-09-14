-- =====================================================================
-- SiDIF — LOTE 1 (public.profiles) — v3 — REVERSÃO
-- Restaura exatamente o estado confirmado no catálogo em 2026-09-14.
-- NÃO aplicar em produção sem decisão expressa.
-- =====================================================================

BEGIN;

-- 1. Remover triggers e funções criadas pelo Lote 1
DROP TRIGGER IF EXISTS profiles_audit_privileged_changes_trg ON public.profiles;
DROP TRIGGER IF EXISTS profiles_guard_privileged_columns_trg ON public.profiles;
DROP FUNCTION IF EXISTS public.profiles_audit_privileged_changes();
DROP FUNCTION IF EXISTS public.profiles_guard_privileged_columns();

-- 2. Restaurar as policies originais
--    Originais (catálogo): UPDATE sem WITH CHECK e sem cláusula TO
--    (equivalente a role "public"); INSERT próprio com WITH CHECK.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Restaurar somente os grants efetivamente modificados
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.profiles TO authenticated;
-- Observação: service_role não foi alterado (permanece ALL).

COMMIT;

-- =====================================================================
-- NOTAS DE REVERSÃO
--
-- a) UPDATE sem WITH CHECK: no PostgreSQL, quando uma policy de UPDATE não
--    define WITH CHECK, a expressão de USING é reutilizada como WITH CHECK.
--    Ou seja, a linha resultante também precisa satisfazer USING. Isso NÃO
--    restringe colunas: como USING/WITH CHECK aqui é (auth.uid() = user_id),
--    o usuário pode alterar QUALQUER coluna da própria linha, inclusive role,
--    is_active e is_maintenance_responsible. É exatamente a falha A1.
--
-- b) GRANT para anon: conceder INSERT/UPDATE a anon não autoriza escrita por
--    si só enquanto existir uma policy que exija auth.uid(); a RLS continua
--    avaliando. O grant amplo é, porém, superfície desnecessária — se uma
--    policy permissiva com USING/WITH CHECK (true) for criada por engano,
--    a escrita anônima passa a valer imediatamente.
--
-- c) Auditoria: os registros já gravados em public.audit_logs pelo trigger
--    de auditoria PERMANECEM após a reversão. A reversão remove o trigger,
--    não apaga histórico. Isso é intencional.
--
-- d) Vulnerabilidades reabertas por esta reversão:
--    - A1 (Crítica): autoconcessão de is_maintenance_responsible, role,
--      is_active, empresa_id, email, setores_atuantes, force_password_change.
--    - Perda da imutabilidade de id, user_id e created_at.
--    - Retorno do INSERT direto de profiles por usuário comum.
--    - Retorno dos grants amplos (DELETE/TRUNCATE/REFERENCES/TRIGGER) a
--      anon e authenticated.
--    - Fim do registro de auditoria de alterações administrativas.
-- =====================================================================
