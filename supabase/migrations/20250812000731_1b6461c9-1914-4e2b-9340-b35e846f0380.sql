-- Fix linter error: remove SECURITY DEFINER from trigger function
CREATE OR REPLACE FUNCTION public.prevent_changes_on_blocked_aditivo_items()
RETURNS trigger
LANGUAGE plpgsql
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