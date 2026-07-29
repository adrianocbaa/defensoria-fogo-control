
UPDATE public.maintenance_tickets
SET requester_email = 'adriano.eng.mt@gmail.com',
    confirmation_sent_at = NULL,
    confirmation_reminder_sent_at = NULL
WHERE ticket_number = 49;

INSERT INTO public.maintenance_ticket_email_outbox (ticket_id, kind, scheduled_for, status, attempts)
SELECT id, 'confirmation', now(), 'pending', 0
FROM public.maintenance_tickets
WHERE ticket_number = 49;
