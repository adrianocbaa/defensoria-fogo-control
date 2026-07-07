
CREATE TABLE public.maintenance_ticket_impediments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  motivo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_by_name text,
  resolved_at timestamptz,
  resolved_by uuid,
  resolved_by_name text
);

CREATE INDEX idx_mti_ticket ON public.maintenance_ticket_impediments(ticket_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_ticket_impediments TO authenticated;
GRANT ALL ON public.maintenance_ticket_impediments TO service_role;

ALTER TABLE public.maintenance_ticket_impediments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view impediments"
  ON public.maintenance_ticket_impediments FOR SELECT
  USING (can_edit());

CREATE POLICY "Authorized users can insert impediments"
  ON public.maintenance_ticket_impediments FOR INSERT
  WITH CHECK (can_edit());

CREATE POLICY "Authorized users can update impediments"
  ON public.maintenance_ticket_impediments FOR UPDATE
  USING (can_edit());

CREATE POLICY "Authorized users can delete impediments"
  ON public.maintenance_ticket_impediments FOR DELETE
  USING (can_edit());
