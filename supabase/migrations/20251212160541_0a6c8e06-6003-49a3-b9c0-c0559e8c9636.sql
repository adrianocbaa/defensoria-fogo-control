-- Converter medicao_items que usam código de banco não-ambíguo para código hierárquico

-- Primeiro, excluir duplicados (quando já existe registro com código hierárquico)
DELETE FROM medicao_items mi
WHERE mi.item_code ~ '^[0-9]+$'
AND EXISTS (
  SELECT 1 FROM medicao_sessions ms 
  JOIN orcamento_items oi ON oi.obra_id = ms.obra_id AND oi.codigo = mi.item_code
  JOIN medicao_items mi2 ON mi2.medicao_id = ms.id AND mi2.item_code = oi.item
  WHERE ms.id = mi.medicao_id
  AND mi2.id != mi.id
);

-- Converter registros únicos não-ambíguos
UPDATE medicao_items mi
SET item_code = (
  SELECT oi.item 
  FROM medicao_sessions ms
  JOIN orcamento_items oi ON oi.obra_id = ms.obra_id AND oi.codigo = mi.item_code
  WHERE ms.id = mi.medicao_id
  LIMIT 1
)
WHERE mi.item_code ~ '^[0-9]+$'
AND EXISTS (
  SELECT 1 FROM medicao_sessions ms 
  WHERE ms.id = mi.medicao_id
  AND (SELECT COUNT(*) FROM orcamento_items oi 
       WHERE oi.obra_id = ms.obra_id AND oi.codigo = mi.item_code) = 1
)
AND NOT EXISTS (
  SELECT 1 FROM medicao_sessions ms 
  JOIN orcamento_items oi ON oi.obra_id = ms.obra_id AND oi.codigo = mi.item_code
  JOIN medicao_items mi2 ON mi2.medicao_id = ms.id AND mi2.item_code = oi.item
  WHERE ms.id = mi.medicao_id
);