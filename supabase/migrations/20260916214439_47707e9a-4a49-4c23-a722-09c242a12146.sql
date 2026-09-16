CREATE OR REPLACE FUNCTION public.trg_limpar_snapshot_on_reabertura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'bloqueada' AND COALESCE(OLD.status, '') = 'bloqueada' THEN
    UPDATE public.medicao_items
    SET qtd_congelado = NULL,
        pct_congelado = NULL,
        total_congelado = NULL,
        congelado_em = NULL
    WHERE medicao_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS medicao_sessions_limpar_snapshot_reabertura ON public.medicao_sessions;
CREATE TRIGGER medicao_sessions_limpar_snapshot_reabertura
AFTER UPDATE OF status ON public.medicao_sessions
FOR EACH ROW
EXECUTE FUNCTION public.trg_limpar_snapshot_on_reabertura();

UPDATE public.medicao_items i
SET qtd_congelado = NULL,
    pct_congelado = NULL,
    total_congelado = NULL,
    congelado_em = NULL
FROM public.medicao_sessions s
WHERE s.id = i.medicao_id
  AND s.status <> 'bloqueada'
  AND i.congelado_em IS NOT NULL;