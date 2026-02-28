
UPDATE medicao_items SET total = ROUND(qtd * (
  SELECT oi.valor_unitario FROM orcamento_items oi
  JOIN medicao_sessions ms ON ms.obra_id = oi.obra_id
  WHERE ms.id = medicao_items.medicao_id AND oi.item = medicao_items.item_code
  LIMIT 1
), 2)
WHERE id IN (
  '3a66b0bc-32c4-4eb5-9bdd-3d273d8b757b',
  'dd760951-89f5-4490-93f0-a889139d21c5',
  'da27b1a5-d622-412d-bf64-609e36285593'
);
