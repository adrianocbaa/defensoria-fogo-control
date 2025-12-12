-- Corrigir registros de medicao_items salvos com códigos de banco ambíguos
-- que correspondem a múltiplos itens hierárquicos na mesma obra

-- Step 1: Identificar e excluir registros com códigos de banco que mapeiam para múltiplos itens
-- Isso é necessário porque não há como determinar o item correto automaticamente
DELETE FROM medicao_items mi
WHERE EXISTS (
  SELECT 1 FROM medicao_sessions ms 
  WHERE ms.id = mi.medicao_id
  AND EXISTS (
    -- Verifica se o item_code é um código de banco (apenas números ou padrão CP.DPMT.xxxx)
    -- e se há múltiplos orcamento_items com esse código para a mesma obra
    SELECT 1 FROM orcamento_items oi1
    WHERE oi1.obra_id = ms.obra_id
    AND oi1.codigo = mi.item_code
    AND (SELECT COUNT(*) FROM orcamento_items oi2 
         WHERE oi2.obra_id = ms.obra_id AND oi2.codigo = mi.item_code) > 1
  )
);