-- 1) Trigger para impedir alterações em itens quando o aditivo estiver bloqueado
CREATE OR REPLACE FUNCTION public.prevent_changes_on_blocked_aditivo_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_aditivo_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_aditivo_id := NEW.aditivo_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_aditivo_id := NEW.aditivo_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_aditivo_id := OLD.aditivo_id;
  END IF;

  SELECT status INTO v_status
  FROM public.aditivo_sessions
  WHERE id = v_aditivo_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Sessão de aditivo não encontrada para o item';
  END IF;

  -- Permitir apenas quando a sessão estiver aberta
  IF v_status <> 'aberta' THEN
    RAISE EXCEPTION 'Aditivo bloqueado: itens não podem ser modificados quando a sessão está %', v_status;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_changes_on_blocked_aditivo_items ON public.aditivo_items;
CREATE TRIGGER trg_prevent_changes_on_blocked_aditivo_items
BEFORE INSERT OR UPDATE OR DELETE ON public.aditivo_items
FOR EACH ROW
EXECUTE FUNCTION public.prevent_changes_on_blocked_aditivo_items();

-- 2) View que calcula o contrato total atual por item para cada medição
CREATE OR REPLACE VIEW public.medicao_contrato_atual_por_item AS
WITH base_contratual AS (
  SELECT
    oi.obra_id,
    oi.codigo AS item_code,
    SUM(oi.valor_total) AS total_contratual
  FROM public.orcamento_items oi
  WHERE oi.origem = 'contratual'
  GROUP BY oi.obra_id, oi.codigo
),

aditivos_bloqueados AS (
  SELECT
    s.obra_id,
    s.sequencia AS aditivo_seq,
    ai.item_code,
    SUM(ai.total) AS total_aditivos
  FROM public.aditivo_items ai
  JOIN public.aditivo_sessions s ON s.id = ai.aditivo_id
  WHERE s.status = 'bloqueada'
  GROUP BY s.obra_id, s.sequencia, ai.item_code
)
SELECT
  ms.obra_id,
  ms.sequencia AS medicao_sequencia,
  b.item_code,
  b.total_contratual
  + COALESCE(
      (
        SELECT SUM(ab.total_aditivos)
        FROM aditivos_bloqueados ab
        WHERE ab.obra_id = ms.obra_id
          AND ab.item_code = b.item_code
          AND ab.aditivo_seq < ms.sequencia -- passa a valer a partir da próxima medição
      ),
      0
    ) AS contrato_total_atual
FROM public.medicao_sessions ms
JOIN base_contratual b ON b.obra_id = ms.obra_id;

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_aditivo_sessions_status_seq_obra ON public.aditivo_sessions (obra_id, status, sequencia);
CREATE INDEX IF NOT EXISTS idx_aditivo_items_aditivo_id_item_code ON public.aditivo_items (aditivo_id, item_code);
CREATE INDEX IF NOT EXISTS idx_orcamento_items_obra_codigo ON public.orcamento_items (obra_id, codigo);
CREATE INDEX IF NOT EXISTS idx_medicao_sessions_obra_seq ON public.medicao_sessions (obra_id, sequencia);