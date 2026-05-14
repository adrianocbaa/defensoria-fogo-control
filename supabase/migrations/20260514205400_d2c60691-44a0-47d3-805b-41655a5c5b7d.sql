INSERT INTO public.orcamento_items
SELECT * FROM jsonb_populate_recordset(
  NULL::public.orcamento_items,
  (
    SELECT jsonb_agg(old_values)
    FROM public.audit_logs
    WHERE table_name = 'orcamento_items'
      AND operation = 'DELETE'
      AND created_at >= '2026-05-14 19:57:00+00'
      AND created_at <  '2026-05-14 19:58:00+00'
      AND (old_values->>'obra_id')::uuid = 'a12d1e1c-ca96-45f1-abd7-8630c61c94ed'
  )
)
ON CONFLICT (id) DO NOTHING;