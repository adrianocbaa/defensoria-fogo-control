
CREATE OR REPLACE FUNCTION public.rdo_block_excesso_quantidade()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_quantidade_original numeric;
  v_ajuste_aditivo numeric;
  v_quantidade_ajustada numeric;
  v_acumulado_anterior numeric;
  v_saldo_disponivel numeric;
  v_item_code text;
BEGIN
  -- Apenas aplicar para atividades do tipo 'planilha' com orcamento_item_id
  IF NEW.tipo = 'planilha' AND NEW.orcamento_item_id IS NOT NULL AND COALESCE(NEW.executado_dia, 0) > 0 THEN
    
    -- Buscar quantidade original do orçamento
    SELECT quantidade, item INTO v_quantidade_original, v_item_code
    FROM public.orcamento_items
    WHERE id = NEW.orcamento_item_id;
    
    IF v_quantidade_original IS NULL THEN
      RETURN NEW; -- Item não encontrado, deixar passar
    END IF;
    
    -- Calcular ajuste de aditivos (acréscimos e supressões)
    SELECT COALESCE(SUM(
      CASE 
        WHEN a.tipo = 'supressao' THEN -a.quantidade
        ELSE a.quantidade
      END
    ), 0) INTO v_ajuste_aditivo
    FROM public.aditivos a
    JOIN public.aditivo_sessions s ON s.id = a.obra_id -- verificar se há aditivos bloqueados
    WHERE a.obra_id = NEW.obra_id
      AND a.servico_codigo = (SELECT codigo FROM public.orcamento_items WHERE id = NEW.orcamento_item_id);
    
    v_quantidade_ajustada := GREATEST(0, v_quantidade_original + v_ajuste_aditivo);
    
    -- Calcular acumulado anterior (excluindo o RDO atual)
    SELECT COALESCE(SUM(executado_dia), 0) INTO v_acumulado_anterior
    FROM public.rdo_activities
    WHERE obra_id = NEW.obra_id
      AND orcamento_item_id = NEW.orcamento_item_id
      AND tipo = 'planilha'
      AND id != NEW.id
      AND report_id != NEW.report_id;
    
    v_saldo_disponivel := GREATEST(0, v_quantidade_ajustada - v_acumulado_anterior);
    
    -- Bloquear se o valor excede o saldo
    IF NEW.executado_dia > v_saldo_disponivel THEN
      RAISE EXCEPTION 'Quantidade executada (%) excede o saldo disponível (%). Item: %',
        NEW.executado_dia, v_saldo_disponivel, v_item_code
        USING ERRCODE = '22023';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger para INSERT e UPDATE
DROP TRIGGER IF EXISTS rdo_block_excesso_quantidade_trigger ON public.rdo_activities;
CREATE TRIGGER rdo_block_excesso_quantidade_trigger
  BEFORE INSERT OR UPDATE ON public.rdo_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.rdo_block_excesso_quantidade();
