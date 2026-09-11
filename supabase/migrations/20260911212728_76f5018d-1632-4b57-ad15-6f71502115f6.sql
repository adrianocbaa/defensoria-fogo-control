ALTER TABLE public.rdo_reports
  ALTER COLUMN numero_seq SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.rdo_prepare_daily_sequence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.obra_id::text, 0));

  NEW.numero_seq := COALESCE((
    SELECT MAX(r.numero_seq)
    FROM public.rdo_reports r
    WHERE r.obra_id = NEW.obra_id
  ), 0) + 1;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.rdo_lock_sequence_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(OLD.obra_id::text, 0));
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.rdo_resequence_daily_reports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obra_id uuid;
BEGIN
  v_obra_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.obra_id ELSE NEW.obra_id END;

  WITH ordered AS (
    SELECT
      r.id,
      ROW_NUMBER() OVER (ORDER BY r.data, r.created_at, r.id)::integer AS expected_seq
    FROM public.rdo_reports r
    WHERE r.obra_id = v_obra_id
  )
  UPDATE public.rdo_reports r
  SET numero_seq = ordered.expected_seq
  FROM ordered
  WHERE r.id = ordered.id
    AND r.numero_seq IS DISTINCT FROM ordered.expected_seq;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.rdo_protect_sequence_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() = 1 AND (
    NEW.obra_id IS DISTINCT FROM OLD.obra_id
    OR NEW.data IS DISTINCT FROM OLD.data
    OR NEW.numero_seq IS DISTINCT FROM OLD.numero_seq
  ) THEN
    RAISE EXCEPTION 'A obra, a data e o número sequencial de um RDO existente não podem ser alterados';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.rdo_prepare_daily_sequence() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rdo_lock_sequence_on_delete() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rdo_resequence_daily_reports() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rdo_protect_sequence_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_rdo_prepare_daily_sequence ON public.rdo_reports;
CREATE TRIGGER trg_rdo_prepare_daily_sequence
BEFORE INSERT ON public.rdo_reports
FOR EACH ROW
EXECUTE FUNCTION public.rdo_prepare_daily_sequence();

DROP TRIGGER IF EXISTS trg_rdo_lock_sequence_on_delete ON public.rdo_reports;
CREATE TRIGGER trg_rdo_lock_sequence_on_delete
BEFORE DELETE ON public.rdo_reports
FOR EACH ROW
EXECUTE FUNCTION public.rdo_lock_sequence_on_delete();

DROP TRIGGER IF EXISTS trg_rdo_resequence_daily_reports ON public.rdo_reports;
CREATE TRIGGER trg_rdo_resequence_daily_reports
AFTER INSERT OR DELETE ON public.rdo_reports
FOR EACH ROW
EXECUTE FUNCTION public.rdo_resequence_daily_reports();

DROP TRIGGER IF EXISTS trg_rdo_protect_sequence_fields ON public.rdo_reports;
CREATE TRIGGER trg_rdo_protect_sequence_fields
BEFORE UPDATE ON public.rdo_reports
FOR EACH ROW
EXECUTE FUNCTION public.rdo_protect_sequence_fields();