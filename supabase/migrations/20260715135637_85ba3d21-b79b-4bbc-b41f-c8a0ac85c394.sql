
CREATE TABLE public.maintenance_ticket_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  changed_by_name text
);

CREATE INDEX idx_mtsh_ticket ON public.maintenance_ticket_status_history(ticket_id, changed_at DESC);

GRANT SELECT, INSERT ON public.maintenance_ticket_status_history TO authenticated;
GRANT ALL ON public.maintenance_ticket_status_history TO service_role;

ALTER TABLE public.maintenance_ticket_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view status history"
  ON public.maintenance_ticket_status_history FOR SELECT
  USING (can_edit());

CREATE POLICY "System can insert status history"
  ON public.maintenance_ticket_status_history FOR INSERT
  WITH CHECK (true);

-- Trigger to auto-log status changes
CREATE OR REPLACE FUNCTION public.log_ticket_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT display_name INTO v_name FROM public.profiles WHERE user_id = auth.uid();
    INSERT INTO public.maintenance_ticket_status_history (ticket_id, from_status, to_status, changed_by, changed_by_name)
    VALUES (NEW.id, NULL, NEW.status, auth.uid(), v_name);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT display_name INTO v_name FROM public.profiles WHERE user_id = auth.uid();
    INSERT INTO public.maintenance_ticket_status_history (ticket_id, from_status, to_status, changed_by, changed_by_name)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), v_name);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_ticket_status_change
AFTER INSERT OR UPDATE OF status ON public.maintenance_tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_status_change();

-- Backfill: initial state for existing tickets
INSERT INTO public.maintenance_ticket_status_history (ticket_id, from_status, to_status, changed_at)
SELECT id, NULL, status, COALESCE(created_at, now())
FROM public.maintenance_tickets
WHERE NOT EXISTS (
  SELECT 1 FROM public.maintenance_ticket_status_history h WHERE h.ticket_id = maintenance_tickets.id
);
