-- Atualizar função para incluir search_path (correção de segurança)
CREATE OR REPLACE FUNCTION public.rdo_block_administracao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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