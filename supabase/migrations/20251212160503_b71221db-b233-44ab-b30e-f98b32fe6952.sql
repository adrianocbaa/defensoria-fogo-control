-- Desabilitar triggers de bloqueio
ALTER TABLE aditivo_items DISABLE TRIGGER prevent_changes_aditivo_items;
ALTER TABLE aditivo_items DISABLE TRIGGER trg_prevent_changes_on_blocked_aditivo_items;

-- Corrigir aditivo_items - excluir duplicados
DELETE FROM aditivo_items ai
WHERE ai.item_code ~ '^[0-9]+$'
AND EXISTS (
  SELECT 1 FROM aditivo_sessions ads 
  JOIN orcamento_items oi ON oi.obra_id = ads.obra_id AND oi.codigo = ai.item_code
  JOIN aditivo_items ai2 ON ai2.aditivo_id = ads.id AND ai2.item_code = oi.item
  WHERE ads.id = ai.aditivo_id
  AND ai2.id != ai.id
);

-- Excluir registros com códigos de banco ambíguos
DELETE FROM aditivo_items ai
WHERE EXISTS (
  SELECT 1 FROM aditivo_sessions ads 
  WHERE ads.id = ai.aditivo_id
  AND EXISTS (
    SELECT 1 FROM orcamento_items oi1
    WHERE oi1.obra_id = ads.obra_id
    AND oi1.codigo = ai.item_code
    AND (SELECT COUNT(*) FROM orcamento_items oi2 
         WHERE oi2.obra_id = ads.obra_id AND oi2.codigo = ai.item_code) > 1
  )
);

-- Converter códigos de banco para hierárquicos (quando sem conflito e sem ambiguidade)
UPDATE aditivo_items ai
SET item_code = (
  SELECT oi.item 
  FROM aditivo_sessions ads
  JOIN orcamento_items oi ON oi.obra_id = ads.obra_id AND oi.codigo = ai.item_code
  WHERE ads.id = ai.aditivo_id
  LIMIT 1
)
WHERE ai.item_code ~ '^[0-9]+$'
AND EXISTS (
  SELECT 1 FROM aditivo_sessions ads 
  WHERE ads.id = ai.aditivo_id
  AND (SELECT COUNT(*) FROM orcamento_items oi 
       WHERE oi.obra_id = ads.obra_id AND oi.codigo = ai.item_code) = 1
)
AND NOT EXISTS (
  SELECT 1 FROM aditivo_sessions ads 
  JOIN orcamento_items oi ON oi.obra_id = ads.obra_id AND oi.codigo = ai.item_code
  JOIN aditivo_items ai2 ON ai2.aditivo_id = ads.id AND ai2.item_code = oi.item
  WHERE ads.id = ai.aditivo_id
);

-- Reabilitar triggers
ALTER TABLE aditivo_items ENABLE TRIGGER prevent_changes_aditivo_items;
ALTER TABLE aditivo_items ENABLE TRIGGER trg_prevent_changes_on_blocked_aditivo_items;