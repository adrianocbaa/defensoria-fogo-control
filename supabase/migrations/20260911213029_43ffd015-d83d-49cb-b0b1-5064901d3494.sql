REVOKE ALL ON FUNCTION public.rdo_prepare_daily_sequence() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rdo_lock_sequence_on_delete() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rdo_resequence_daily_reports() FROM anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rdo_protect_sequence_fields() FROM anon, authenticated, service_role;

ALTER TABLE public.rdo_reports DISABLE TRIGGER trg_rdo_protect_sequence_fields;

WITH ordered AS (
  SELECT
    r.id,
    ROW_NUMBER() OVER (
      PARTITION BY r.obra_id
      ORDER BY r.data, r.created_at, r.id
    )::integer AS expected_seq
  FROM public.rdo_reports r
)
UPDATE public.rdo_reports r
SET numero_seq = -ordered.expected_seq
FROM ordered
WHERE r.id = ordered.id;

UPDATE public.rdo_reports
SET numero_seq = -numero_seq
WHERE numero_seq < 0;

ALTER TABLE public.rdo_reports ENABLE TRIGGER trg_rdo_protect_sequence_fields;

ALTER TABLE public.rdo_reports
  ADD CONSTRAINT rdo_reports_obra_id_numero_seq_key UNIQUE (obra_id, numero_seq);