-- =====================================================================
-- LOTE 4c — REPARO DO PORTAL PÚBLICO (/public/...)
-- =====================================================================
-- Diagnóstico (confirmado ao vivo, como visitante anônimo, em 29/09/2026):
--   /public/obras      -> 42501 permission denied for function has_role
--   /public/nucleos    -> 42501 permission denied for function can_edit
--   /public/preventivos-> 42501 permission denied for function can_edit
--   /public/* (mapa)   -> 42501 permission denied for table nuclei (visão nuclei_public)
--   /public/*          -> 42501 permission denied for function cleanup_old_login_attempts
--
-- Causa: uma revisão de segurança de julho/2026 revogou o direito de EXECUTAR
-- (para visitantes anônimos) das funções usadas nas regras de linha dessas
-- tabelas e da visão pública. Sem isso, qualquer consulta anônima a essas
-- tabelas falha com erro. As páginas públicas já estavam quebradas para
-- visitantes desde então; o Lote 4 não causou, mas o teste anônimo revelou.
--
-- O que este reparo faz:
--   1. Devolve a visitantes anônimos APENAS o direito de executar as funções
--      booleanas de verificação (respondem "sim/não" e não retornam dados).
--   2. Cria regras de leitura anônima para as tabelas do portal que só têm
--      regras para usuários logados (nucleos_central, hydrants, fire_extinguishers).
--   3. Repõe a visão pública nuclei_public em modo "dono" (ela foi desenhada
--      para expor apenas os campos não sensíveis de núcleos) e garante a
--      permissão de leitura anônima sobre ela.
--   4. Permite que visitantes anônimos executem a rotina de limpeza de
--      tentativas de login expiradas, que as próprias páginas chamam.
--
-- NÃO altera: dados de qualquer tabela; acesso de usuários logados;
-- gravação/edição anônima (continua fechada); as demais visões.
-- Reversão: docs/lote4/lote4c_rollback.sql
-- Verificação: docs/lote4/lote4c_verificacao.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Funções booleanas de verificação: EXECUTÁVEL por visitantes anônimos.
--    São funções SECURITY DEFINER que respondem apenas true/false sobre um
--    identificador informado; não retornam listas nem dados de usuários.
--    (Identificadores de usuário são UUIDs aleatórios, não enumeráveis.)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  fn text;
  funcs text[] := ARRAY[
    'public.has_role(uuid, public.user_role)',
    'public.can_edit(uuid)',
    'public.can_edit_obra(uuid, uuid)',
    'public.is_demo_user(uuid)',
    'public.is_fiscal_of_obra(uuid, uuid)',
    'public.user_has_obra_access(uuid, uuid)',
    'public.can_view_sensitive_data(uuid)',
    'public.is_admin(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY funcs LOOP
    BEGIN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', fn);
    EXCEPTION WHEN OTHERS THEN
      -- Assinatura não existe neste banco: ignora (não é erro).
      RAISE NOTICE 'Função não encontrada (ignorada): %', fn;
    END;
  END LOOP;
END $$;

-- Rotina de limpeza chamada pelas próprias páginas públicas:
DO $$
BEGIN
  BEGIN
    GRANT EXECUTE ON FUNCTION public.cleanup_old_login_attempts() TO anon;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'cleanup_old_login_attempts não encontrada (ignorada)';
  END;
END $$;

-- ---------------------------------------------------------------------
-- 2) Regras de leitura anônima para tabelas do portal que só tinham
--    regras para usuários logados. Somente leitura (SELECT); escrever
--    continua impossível para visitantes.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY['nucleos_central', 'hydrants', 'fire_extinguishers'];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
        AND ('anon' = ANY (roles) OR 'public' = ANY (roles))
        AND cmd IN ('SELECT', 'ALL')
    ) THEN
      EXECUTE format(
        'CREATE POLICY "Portal publico leitura %s" ON public.%I FOR SELECT TO anon USING (true)', t, t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3) Visão pública de núcleos: volta ao modo "dono" (desenho original do
--    portal — expõe apenas os campos não sensíveis) com leitura anônima.
--    A tabela subjacente (nuclei) continua FECHADA para anônimos.
-- ---------------------------------------------------------------------
ALTER VIEW public.nuclei_public SET (security_invoker = false);
GRANT SELECT ON public.nuclei_public TO anon;

-- ---------------------------------------------------------------------
-- 4) Resultado: lista o que um visitante anônimo consegue LER agora.
--    Tabelas do portal devem aparecer com SELECT; as outras 94 continuam
--    ausentes (fechadas).
-- ---------------------------------------------------------------------
SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios_anon
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
