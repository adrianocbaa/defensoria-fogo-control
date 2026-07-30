CREATE OR REPLACE FUNCTION public.get_maintenance_ticket_by_token(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', t.id,
    'ticket_number', t.ticket_number,
    'title', t.title,
    'location', t.location,
    'status', t.status,
    'request_type', t.request_type,
    'process_number', t.process_number,
    'confirmed_at', t.confirmed_at,
    'finalized_at', t.finalized_at,
    'finalization_note', t.finalization_note,
    'completed_at', t.completed_at,
    'reference_photos', t.reference_photos,
    'executors', (
      SELECT COALESCE(jsonb_agg(DISTINCT p.display_name), '[]'::jsonb)
      FROM public.profiles p
      WHERE p.user_id IN (
        SELECT unnest(COALESCE(t.manager_ids, ARRAY[]::uuid[]))
        UNION
        SELECT t.manager_id WHERE t.manager_id IS NOT NULL
        UNION
        SELECT unnest(COALESCE(s2.manager_ids, ARRAY[]::uuid[]))
          FROM public.maintenance_ticket_services s2 WHERE s2.ticket_id = t.id
        UNION
        SELECT s3.manager_id FROM public.maintenance_ticket_services s3
          WHERE s3.ticket_id = t.id AND s3.manager_id IS NOT NULL
      )
    ),
    'services', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'title', s.title,
        'description', s.description,
        'execution_photos', s.execution_photos
      ) ORDER BY s.order_index), '[]'::jsonb)
      FROM public.maintenance_ticket_services s
      WHERE s.ticket_id = t.id
    )
  ) INTO v_result
  FROM public.maintenance_tickets t
  WHERE t.confirmation_token = p_token
  LIMIT 1;

  RETURN COALESCE(v_result, jsonb_build_object('error', 'not_found'));
END;
$function$;