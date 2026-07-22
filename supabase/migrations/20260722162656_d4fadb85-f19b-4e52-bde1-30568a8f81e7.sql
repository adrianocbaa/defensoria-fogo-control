
-- 1) Sequential ticket number
CREATE SEQUENCE IF NOT EXISTS public.maintenance_ticket_number_seq;

ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS ticket_number BIGINT;

-- Backfill existing rows using created_at order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM public.maintenance_tickets
  WHERE ticket_number IS NULL
)
UPDATE public.maintenance_tickets t
SET ticket_number = ordered.rn
FROM ordered
WHERE t.id = ordered.id;

-- Advance sequence past current max
SELECT setval(
  'public.maintenance_ticket_number_seq',
  GREATEST(COALESCE((SELECT MAX(ticket_number) FROM public.maintenance_tickets), 0), 1)
);

ALTER TABLE public.maintenance_tickets
  ALTER COLUMN ticket_number SET DEFAULT nextval('public.maintenance_ticket_number_seq');

ALTER TABLE public.maintenance_tickets
  ALTER COLUMN ticket_number SET NOT NULL;

ALTER SEQUENCE public.maintenance_ticket_number_seq OWNED BY public.maintenance_tickets.ticket_number;

CREATE UNIQUE INDEX IF NOT EXISTS maintenance_tickets_ticket_number_key
  ON public.maintenance_tickets(ticket_number);

-- 2) Trigger to auto-set/clear completed_at based on status
CREATE OR REPLACE FUNCTION public.maintenance_tickets_sync_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Concluído' THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintenance_tickets_sync_completed_at ON public.maintenance_tickets;
CREATE TRIGGER trg_maintenance_tickets_sync_completed_at
  BEFORE INSERT OR UPDATE OF status ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.maintenance_tickets_sync_completed_at();

-- Backfill completed_at for existing Concluído tickets
UPDATE public.maintenance_tickets
SET completed_at = COALESCE(completed_at, updated_at)
WHERE status = 'Concluído' AND completed_at IS NULL;
