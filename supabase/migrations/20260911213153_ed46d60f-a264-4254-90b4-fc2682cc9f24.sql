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

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.rdo_expected_sequence (
    id uuid PRIMARY KEY,
    expected_seq integer NOT NULL
  ) ON COMMIT DROP;

  TRUNCATE pg_temp.rdo_expected_sequence;

  INSERT INTO pg_temp.rdo_expected_sequence (id, expected_seq)
  SELECT
    r.id,
    ROW_NUMBER() OVER (ORDER BY r.data, r.created_at, r.id)::integer
  FROM public.rdo_reports r
  WHERE r.obra_id = v_obra_id;

  UPDATE public.rdo_reports r
  SET numero_seq = -expected.expected_seq
  FROM pg_temp.rdo_expected_sequence expected
  WHERE r.id = expected.id
    AND r.numero_seq IS DISTINCT FROM expected.expected_seq;

  UPDATE public.rdo_reports r
  SET numero_seq = expected.expected_seq
  FROM pg_temp.rdo_expected_sequence expected
  WHERE r.id = expected.id
    AND r.numero_seq IS DISTINCT FROM expected.expected_seq;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.rdo_resequence_daily_reports() FROM PUBLIC, anon, authenticated, service_role;