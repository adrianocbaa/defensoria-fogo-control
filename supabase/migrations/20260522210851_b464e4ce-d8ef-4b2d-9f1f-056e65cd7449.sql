-- 1. Adicionar colunas de snapshot em medicao_items
ALTER TABLE public.medicao_items
  ADD COLUMN IF NOT EXISTS qtd_congelado numeric,
  ADD COLUMN IF NOT EXISTS pct_congelado numeric,
  ADD COLUMN IF NOT EXISTS total_congelado numeric,
  ADD COLUMN IF NOT EXISTS congelado_em timestamp with time zone;

COMMENT ON COLUMN public.medicao_items.qtd_congelado IS 'Snapshot da quantidade no momento do bloqueio da medição. Usado para preservar o valor exato impresso/pago, imune a mudanças retroativas de fórmula.';
COMMENT ON COLUMN public.medicao_items.pct_congelado IS 'Snapshot do percentual no momento do bloqueio.';
COMMENT ON COLUMN public.medicao_items.total_congelado IS 'Snapshot do valor total no momento do bloqueio. Quando preenchido, deve ser exibido em vez do total dinâmico.';
COMMENT ON COLUMN public.medicao_items.congelado_em IS 'Timestamp do snapshot.';

-- 2. Função que faz o snapshot dos itens de uma medição
CREATE OR REPLACE FUNCTION public.snapshot_medicao_items(p_medicao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.medicao_items
  SET qtd_congelado = qtd,
      pct_congelado = pct,
      total_congelado = total,
      congelado_em = now()
  WHERE medicao_id = p_medicao_id
    AND congelado_em IS NULL; -- nunca sobrescreve snapshot já feito
END;
$$;

-- 3. Trigger: ao mudar status para 'bloqueada', dispara o snapshot
CREATE OR REPLACE FUNCTION public.trg_snapshot_on_bloqueio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'bloqueada' AND COALESCE(OLD.status, '') <> 'bloqueada' THEN
    PERFORM public.snapshot_medicao_items(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS medicao_sessions_snapshot_trigger ON public.medicao_sessions;
CREATE TRIGGER medicao_sessions_snapshot_trigger
AFTER UPDATE OF status ON public.medicao_sessions
FOR EACH ROW
EXECUTE FUNCTION public.trg_snapshot_on_bloqueio();

-- 4. Backfill: todas as medições já bloqueadas recebem snapshot agora
DO $$
DECLARE
  v_rec record;
BEGIN
  FOR v_rec IN
    SELECT id FROM public.medicao_sessions WHERE status = 'bloqueada'
  LOOP
    PERFORM public.snapshot_medicao_items(v_rec.id);
  END LOOP;
END $$;

-- 5. Função auxiliar para permitir ajuste manual (admin) dos valores congelados
CREATE OR REPLACE FUNCTION public.ajustar_medicao_congelada(
  p_medicao_item_id uuid,
  p_qtd numeric,
  p_pct numeric,
  p_total numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem ajustar valores congelados de medições.';
  END IF;

  UPDATE public.medicao_items
  SET qtd_congelado = p_qtd,
      pct_congelado = p_pct,
      total_congelado = p_total,
      congelado_em = COALESCE(congelado_em, now())
  WHERE id = p_medicao_item_id;
END;
$$;