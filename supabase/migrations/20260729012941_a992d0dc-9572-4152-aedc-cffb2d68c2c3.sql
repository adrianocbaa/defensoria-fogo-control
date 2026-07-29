DROP FUNCTION IF EXISTS public.confirm_maintenance_service(text);
DROP FUNCTION IF EXISTS public.confirm_maintenance_service(uuid);

CREATE OR REPLACE FUNCTION public.confirm_maintenance_service(
  p_token uuid,
  p_accept boolean DEFAULT true,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket record;
BEGIN
  SELECT id, ticket_number, status, requester_email, title, confirmed_at
    INTO v_ticket
  FROM public.maintenance_tickets
  WHERE confirmation_token = p_token
  LIMIT 1;

  IF v_ticket.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  IF v_ticket.confirmed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  IF p_accept THEN
    UPDATE public.maintenance_tickets
       SET confirmed_at = now(),
           status = 'Concluído'
     WHERE id = v_ticket.id;
  ELSE
    UPDATE public.maintenance_tickets
       SET status = 'Em andamento',
           completed_at = NULL,
           confirmation_token = NULL,
           confirmation_sent_at = NULL,
           confirmation_reminder_sent_at = NULL
     WHERE id = v_ticket.id;
  END IF;

  IF p_note IS NOT NULL AND length(trim(p_note)) > 0 THEN
    INSERT INTO public.maintenance_ticket_emails
      (ticket_id, direction, from_addr, to_addrs, subject, body_text)
    VALUES (
      v_ticket.id,
      'inbound',
      v_ticket.requester_email,
      ARRAY[]::text[],
      CASE WHEN p_accept THEN 'Confirmação do solicitante' ELSE 'Reabertura pelo solicitante' END,
      p_note
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'accepted', p_accept);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_maintenance_service(uuid, boolean, text) TO anon, authenticated;