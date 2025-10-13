-- ============================================
-- VIEW: orcamento_items_hierarquia
-- Calcula hierarquia, parent, level e is_macro
-- ============================================

CREATE OR REPLACE VIEW orcamento_items_hierarquia AS
WITH item_data AS (
  SELECT 
    id,
    obra_id,
    item,
    codigo,
    descricao,
    unidade,
    quantidade,
    total_contrato,
    valor_unitario,
    valor_total,
    banco,
    nivel,
    origem,
    aditivo_num,
    eh_administracao_local,
    ordem,
    created_at,
    updated_at,
    -- Calcular level baseado nos pontos no item
    array_length(string_to_array(item, '.'), 1) as calculated_level,
    -- Calcular parent_code removendo o último segmento
    CASE 
      WHEN item ~ '\.' THEN 
        regexp_replace(item, '\.[^.]+$', '')
      ELSE 
        NULL
    END as parent_code
  FROM orcamento_items
),
macro_items AS (
  -- Items que têm filhos são MACRO
  SELECT DISTINCT
    parent_code as item_code,
    obra_id
  FROM item_data
  WHERE parent_code IS NOT NULL
)
SELECT 
  id.*,
  COALESCE(mi.item_code IS NOT NULL, false) as is_macro
FROM item_data id
LEFT JOIN macro_items mi ON id.item = mi.item_code AND id.obra_id = mi.obra_id;

-- ============================================
-- Índices para melhorar performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orcamento_items_item_obra 
ON orcamento_items(obra_id, item);

CREATE INDEX IF NOT EXISTS idx_orcamento_items_ordem 
ON orcamento_items(obra_id, ordem);

COMMENT ON VIEW orcamento_items_hierarquia IS 
'View que adiciona informações de hierarquia aos itens orçamentários: calculated_level, parent_code e is_macro';