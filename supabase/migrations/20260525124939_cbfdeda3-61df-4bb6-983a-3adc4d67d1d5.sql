-- Remover item órfão de medicao que não existe na planilha orçamentária
-- Obra Nobres, 1ª medição, item_code 'EE-INSTE-C800' (R$ 21,72)
-- Causa divergência de R$ 21,72 no acumulado financeiro
DELETE FROM public.medicao_items
WHERE id = '251581c3-5b93-4cb2-bb0d-a8987cd3fb51';

-- Registrar no audit_logs
INSERT INTO public.audit_logs (table_name, record_id, operation, old_values, user_id, user_email)
VALUES (
  'medicao_items',
  '251581c3-5b93-4cb2-bb0d-a8987cd3fb51',
  'DELETE',
  jsonb_build_object(
    'item_code', 'EE-INSTE-C800',
    'total', 21.72,
    'total_congelado', 21.72,
    'motivo', 'Item órfão sem correspondência em orcamento_items causando divergência de R$ 21,72 no acumulado da obra Nobres'
  ),
  NULL,
  'system'
);