
-- Confirma o serviço via token (uso público, sem login)
CREATE OR REPLACE FUNCTION public.confirm_maintenance_service(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
BEGIN
  SELECT id, ticket_number, status, confirmed_at, title
    INTO v_ticket
  FROM public.maintenance_tickets
  WHERE confirmation_token = p_token
  LIMIT 1;

  IF v_ticket.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  IF v_ticket.confirmed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_confirmed', true, 'ticket_number', v_ticket.ticket_number);
  END IF;

  UPDATE public.maintenance_tickets
     SET confirmed_at = now(),
         confirmed_source = 'solicitante',
         finalized_at = COALESCE(finalized_at, now())
   WHERE id = v_ticket.id;

  -- Enfileira geração do PDF de arquivamento
  INSERT INTO public.maintenance_ticket_email_outbox (ticket_id, kind, payload)
  VALUES (v_ticket.id, 'auto_finalize', jsonb_build_object('reason', 'confirmed_by_requester'));

  RETURN jsonb_build_object('ok', true, 'ticket_number', v_ticket.ticket_number, 'title', v_ticket.title);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_maintenance_service(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_maintenance_service(uuid) TO anon, authenticated;

-- Retorna dados públicos do ticket via token (para a página de confirmação)
CREATE OR REPLACE FUNCTION public.get_maintenance_ticket_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', t.id,
    'ticket_number', t.ticket_number,
    'title', t.title,
    'location', t.location,
    'status', t.status,
    'confirmed_at', t.confirmed_at,
    'finalized_at', t.finalized_at,
    'finalization_note', t.finalization_note,
    'completed_at', t.completed_at,
    'reference_photos', t.reference_photos,
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
$$;

REVOKE ALL ON FUNCTION public.get_maintenance_ticket_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_maintenance_ticket_by_token(uuid) TO anon, authenticated;
