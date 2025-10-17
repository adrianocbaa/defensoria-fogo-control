-- Criar extensão para normalização de texto (remover acentos)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Drop view antiga se existir
DROP VIEW IF EXISTS public.vw_planilha_hierarquia;

-- Criar view hierárquica com detecção de itens sob ADMINISTRAÇÃO
CREATE OR REPLACE VIEW public.vw_planilha_hierarquia AS
WITH RECURSIVE hierarchy AS (
  -- Base: itens sem parent (raiz)
  SELECT 
    id,
    obra_id,
    item,
    codigo,
    descricao,
    unidade,
    quantidade as quantidade_total,
    total_contrato,
    nivel,
    origem,
    aditivo_num,
    calculated_level,
    parent_code,
    is_macro,
    ordem,
    ARRAY[item] as ancestors,
    ARRAY[descricao] as ancestors_desc,
    1 as depth
  FROM public.orcamento_items_hierarquia
  WHERE parent_code IS NULL OR parent_code = ''
  
  UNION ALL
  
  -- Recursivo: itens com parent
  SELECT 
    o.id,
    o.obra_id,
    o.item,
    o.codigo,
    o.descricao,
    o.unidade,
    o.quantidade as quantidade_total,
    o.total_contrato,
    o.nivel,
    o.origem,
    o.aditivo_num,
    o.calculated_level,
    o.parent_code,
    o.is_macro,
    o.ordem,
    h.ancestors || o.item,
    h.ancestors_desc || o.descricao,
    h.depth + 1
  FROM public.orcamento_items_hierarquia o
  INNER JOIN hierarchy h ON o.parent_code = h.item
  WHERE h.depth < 20  -- limite de segurança
)
SELECT 
  id,
  obra_id,
  item,
  codigo,
  descricao,
  unidade,
  quantidade_total,
  total_contrato,
  nivel,
  origem,
  aditivo_num,
  calculated_level,
  parent_code,
  is_macro,
  ordem,
  ancestors,
  ancestors_desc,
  -- Verificar se qualquer ancestral tem descrição = "ADMINISTRAÇÃO" (ignorar acentos/caixa)
  EXISTS (
    SELECT 1 
    FROM unnest(ancestors_desc) d
    WHERE lower(unaccent(d)) = 'administracao'
  ) as is_under_administracao
FROM hierarchy
ORDER BY obra_id, ordem;

-- Criar trigger para bloquear inserções/atualizações em itens sob ADMINISTRAÇÃO
CREATE OR REPLACE FUNCTION public.rdo_block_administracao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_blocked boolean;
BEGIN
  -- Apenas aplicar para atividades do tipo 'planilha'
  IF NEW.tipo = 'planilha' AND NEW.orcamento_item_id IS NOT NULL THEN
    -- Verificar se o item está sob ADMINISTRAÇÃO
    SELECT is_under_administracao
    INTO v_blocked
    FROM public.vw_planilha_hierarquia
    WHERE id = NEW.orcamento_item_id
    LIMIT 1;
    
    -- Bloquear se for item sob ADMINISTRAÇÃO
    IF COALESCE(v_blocked, false) = true THEN
      RAISE EXCEPTION 'Itens sob ADMINISTRAÇÃO não podem receber execução no RDO.'
        USING ERRCODE = '22023';  -- invalid_parameter_value
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trg_rdo_block_administracao ON public.rdo_activities;

-- Criar trigger
CREATE TRIGGER trg_rdo_block_administracao
  BEFORE INSERT OR UPDATE ON public.rdo_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.rdo_block_administracao();