
-- Criar função temporária para atualizar medicao_item específico
CREATE OR REPLACE FUNCTION update_medicao_item_66_manual()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE medicao_items 
  SET qtd = 10.17,
      pct = 116.896551724,
      total = 194.48,
      updated_at = now()
  WHERE id = '72957702-9280-445d-9f73-3669b09fcda4';
END;
$$;

-- Executar a função
SELECT update_medicao_item_66_manual();

-- Remover a função após uso
DROP FUNCTION update_medicao_item_66_manual();
