CREATE OR REPLACE FUNCTION public.rdo_block_administracao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item text;
  v_obra uuid;
  v_codes text[];
  v_parts text[];
  i int;
BEGIN
  IF NEW.tipo = 'planilha' AND NEW.orcamento_item_id IS NOT NULL AND COALESCE(NEW.executado_dia, 0) > 0 THEN
    SELECT item, obra_id INTO v_item, v_obra
    FROM public.orcamento_items WHERE id = NEW.orcamento_item_id;

    IF v_item IS NULL THEN
      RETURN NEW;
    END IF;

    -- Item e todos os seus ancestrais (ex.: 6.7.25 -> 6, 6.7, 6.7.25)
    v_parts := string_to_array(v_item, '.');
    v_codes := ARRAY[]::text[];
    FOR i IN 1..array_length(v_parts, 1) LOOP
      v_codes := v_codes || array_to_string(v_parts[1:i], '.');
    END LOOP;

    IF EXISTS (
      SELECT 1 FROM public.orcamento_items oi
      WHERE oi.obra_id = v_obra
        AND oi.item = ANY(v_codes)
        AND lower(public.unaccent(trim(oi.descricao))) = 'administracao'
    ) THEN
      RAISE EXCEPTION 'Itens sob ADMINISTRAÇÃO não podem receber execução no RDO.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rdo_block_administracao() FROM PUBLIC, anon, authenticated;

-- Gatilho duplicado (a mesma validação rodava duas vezes por linha)
DROP TRIGGER IF EXISTS trg_rdo_block_administracao ON public.rdo_activities;