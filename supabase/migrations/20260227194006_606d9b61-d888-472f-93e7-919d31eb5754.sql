-- Drop the slow trigger that causes timeout on every rdo_activities INSERT
-- The check for "administração" items is overly broad and causes vw_planilha_hierarquia
-- to be queried on every single insert, even when executado_dia = 0
DROP TRIGGER IF EXISTS rdo_block_administracao_trigger ON public.rdo_activities;

-- Recreate it to only fire when executado_dia > 0 (saves unnecessary view queries)
CREATE OR REPLACE FUNCTION public.rdo_block_administracao()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_blocked boolean;
BEGIN
  -- Apenas aplicar para atividades do tipo 'planilha' com executado_dia > 0
  IF NEW.tipo = 'planilha' AND NEW.orcamento_item_id IS NOT NULL AND COALESCE(NEW.executado_dia, 0) > 0 THEN
    SELECT is_under_administracao
    INTO v_blocked
    FROM public.vw_planilha_hierarquia
    WHERE id = NEW.orcamento_item_id
    LIMIT 1;

    IF COALESCE(v_blocked, false) = true THEN
      RAISE EXCEPTION 'Itens sob ADMINISTRAÇÃO não podem receber execução no RDO.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER rdo_block_administracao_trigger
  BEFORE INSERT OR UPDATE ON public.rdo_activities
  FOR EACH ROW EXECUTE FUNCTION public.rdo_block_administracao();