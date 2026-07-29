
-- 1) Tabela de threads de e-mail
CREATE TABLE IF NOT EXISTS public.maintenance_ticket_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  from_addr TEXT,
  to_addrs TEXT[] DEFAULT '{}',
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  message_id TEXT,
  in_reply_to TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  meta JSONB DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_ticket_emails TO authenticated;
GRANT ALL ON public.maintenance_ticket_emails TO service_role;

ALTER TABLE public.maintenance_ticket_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mte_view" ON public.maintenance_ticket_emails
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_maintenance_responsible(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.maintenance_tickets t
      WHERE t.id = ticket_id
        AND public.can_view_maintenance_ticket(t.manager_ids, t.user_id, auth.uid())
    )
  );

CREATE POLICY "mte_admin_manage" ON public.maintenance_ticket_emails
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_maintenance_responsible(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_maintenance_responsible(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS mte_message_id_uniq
  ON public.maintenance_ticket_emails(message_id)
  WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mte_ticket_idx
  ON public.maintenance_ticket_emails(ticket_id, received_at DESC);

-- 2) Novas colunas em maintenance_tickets
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmation_token UUID,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_source TEXT,
  ADD COLUMN IF NOT EXISTS archive_pdf_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS maintenance_tickets_confirmation_token_uniq
  ON public.maintenance_tickets(confirmation_token)
  WHERE confirmation_token IS NOT NULL;

-- 3) Fila de envios (outbox) processada pelo cron/edge function
CREATE TABLE IF NOT EXISTS public.maintenance_ticket_email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('confirmation','reminder','auto_finalize','custom')),
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.maintenance_ticket_email_outbox TO authenticated;
GRANT ALL ON public.maintenance_ticket_email_outbox TO service_role;

ALTER TABLE public.maintenance_ticket_email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outbox_admin_view" ON public.maintenance_ticket_email_outbox
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_maintenance_responsible(auth.uid()));

-- 4) Trigger: quando status vira 'Concluído', gera token e enfileira confirmação
CREATE OR REPLACE FUNCTION public.enqueue_maintenance_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Concluído' AND COALESCE(OLD.status,'') <> 'Concluído' THEN
    IF NEW.confirmation_token IS NULL THEN
      NEW.confirmation_token := gen_random_uuid();
    END IF;

    -- Só enfileira se houver e-mail do solicitante e ainda não confirmado
    IF NEW.confirmed_at IS NULL AND COALESCE(NEW.requester_email,'') <> '' THEN
      INSERT INTO public.maintenance_ticket_email_outbox (ticket_id, kind, payload)
      VALUES (NEW.id, 'confirmation', jsonb_build_object('token', NEW.confirmation_token));
    END IF;
  END IF;

  -- Se sair de 'Concluído' antes de confirmar, limpa o token e datas
  IF OLD.status = 'Concluído' AND NEW.status <> 'Concluído' AND NEW.confirmed_at IS NULL THEN
    NEW.confirmation_token := NULL;
    NEW.confirmation_sent_at := NULL;
    NEW.confirmation_reminder_sent_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_maintenance_confirmation ON public.maintenance_tickets;
CREATE TRIGGER trg_enqueue_maintenance_confirmation
BEFORE UPDATE ON public.maintenance_tickets
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_maintenance_confirmation();
