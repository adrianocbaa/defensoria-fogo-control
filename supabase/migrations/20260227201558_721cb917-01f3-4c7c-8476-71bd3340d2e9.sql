
-- Corrigir o JOIN incorreto no trigger rdo_block_excesso_quantidade
-- O bug: "JOIN aditivo_sessions s ON s.id = a.obra_id" deveria ser baseado em obra_id
-- Como aditivos já têm obra_id diretamente, o JOIN com aditivo_sessions é desnecessário e estava bugado

CREATE OR REPLACE FUNCTION public.rdo_block_excesso_quantidade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_quantidade_original numeric;
  v_ajuste_aditivo numeric;
  v_quantidade_ajustada numeric;
  v_acumulado_anterior numeric;
  v_saldo_disponivel numeric;
  v_item_code text;
  v_item_codigo text;
BEGIN
  -- Apenas aplicar para atividades do tipo 'planilha' com orcamento_item_id
  IF NEW.tipo = 'planilha' AND NEW.orcamento_item_id IS NOT NULL AND COALESCE(NEW.executado_dia, 0) > 0 THEN
    
    -- Buscar quantidade original e código do orçamento
    SELECT quantidade, item, codigo INTO v_quantidade_original, v_item_code, v_item_codigo
    FROM public.orcamento_items
    WHERE id = NEW.orcamento_item_id;
    
    IF v_quantidade_original IS NULL THEN
      RETURN NEW; -- Item não encontrado, deixar passar
    END IF;
    
    -- Calcular ajuste de aditivos (acréscimos e supressões)
    -- CORREÇÃO: remover JOIN incorreto com aditivo_sessions; usar apenas obra_id e servico_codigo
    SELECT COALESCE(SUM(
      CASE 
        WHEN a.tipo = 'supressao' THEN -a.quantidade
        ELSE a.quantidade
      END
    ), 0) INTO v_ajuste_aditivo
    FROM public.aditivos a
    WHERE a.obra_id = NEW.obra_id
      AND a.servico_codigo = v_item_codigo;
    
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
    
    -- Bloquear se o valor excede o saldo (com tolerância para ponto flutuante)
    IF NEW.executado_dia > v_saldo_disponivel + 0.0001 THEN
      RAISE EXCEPTION 'Quantidade executada (%) excede o saldo disponível (%). Item: %',
        NEW.executado_dia, v_saldo_disponivel, v_item_code
        USING ERRCODE = '22023';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
