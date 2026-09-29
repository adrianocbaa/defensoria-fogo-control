-- =====================================================================
-- LOTE 4d — Leitura pública da lista de núcleos (nucleos_central)
-- Motivo: /public/nucleos e /public/preventivos mostram 0 núcleos porque
-- a tabela só tem regra de leitura para usuários logados. O lote4c pulou
-- a criação da regra anônima nesta tabela.
-- Efeito: visitante sem login passa a LER núcleos (nome, cidade, endereço,
-- contatos institucionais). Gravar/editar/apagar continua proibido.
-- Reversão: DROP POLICY "Portal publico leitura nucleos_central" ON public.nucleos_central;
-- =====================================================================
DROP POLICY IF EXISTS "Portal publico leitura nucleos_central" ON public.nucleos_central;
CREATE POLICY "Portal publico leitura nucleos_central"
  ON public.nucleos_central FOR SELECT TO anon USING (true);
GRANT SELECT ON public.nucleos_central TO anon;

-- Conferência: deve listar as regras de leitura, incluindo a nova para anon.
SELECT policyname, roles, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'nucleos_central'
ORDER BY policyname;
