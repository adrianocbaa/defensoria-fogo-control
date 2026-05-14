UPDATE public.rdo_activity_notes n
SET created_by = r.created_by
FROM public.rdo_reports r
WHERE n.report_id = r.id
  AND n.created_by IS NULL
  AND r.created_by IS NOT NULL;