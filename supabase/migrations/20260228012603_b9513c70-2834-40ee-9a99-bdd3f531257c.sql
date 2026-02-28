
CREATE OR REPLACE FUNCTION rdo_block_excesso_quantidade()
RETURNS TRIGGER AS $$
DECLARE
  v_quantidade_original numeric;
  v_ajuste_aditivo numeric;
  v_quantidade_ajustada numeric;
  v_acumulado_anterior numeric;
  v_saldo_disponivel numeric;
  v_item_code text;
  v_origem text;
BEGIN
  -- Apenas aplicar para atividades do tipo 'planilha' com orcamento_item_id
  IF NEW.tipo = 'planilha' AND NEW.orcamento_item_id IS NOT NULL AND COALESCE(NEW.executado_dia, 0) > 0 THEN
    
    -- Buscar quantidade original, código hierárquico e origem do orçamento
    SELECT quantidade, item, origem INTO v_quantidade_original, v_item_code, v_origem
    FROM public.orcamento_items
    WHERE id = NEW.orcamento_item_id;
    
    IF v_quantidade_original IS NULL THEN
      RETURN NEW; -- Item não encontrado, deixar passar
    END IF;
    
    -- Calcular ajuste de aditivos usando aditivo_sessions + aditivo_items (estrutura correta)
    -- Apenas para itens contratuais (não extracontratuais, que já têm a qtd correta)
    IF v_origem != 'extracontratual' THEN
      SELECT COALESCE(SUM(ai.qtd), 0) INTO v_ajuste_aditivo
      FROM public.aditivo_items ai
      JOIN public.aditivo_sessions a ON a.id = ai.aditivo_id
      WHERE a.obra_id = NEW.obra_id
        AND a.status = 'bloqueada'
        AND ai.item_code = v_item_code;
    ELSE
      v_ajuste_aditivo := 0;
    END IF;
    
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
$$ LANGUAGE plpgsql;
