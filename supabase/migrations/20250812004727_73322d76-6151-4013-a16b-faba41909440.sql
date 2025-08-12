-- Add missing SELECT policies to fix RLS errors when creating/viewing medições (sessions and items)

-- Medição sessions: allow all authenticated users to view
CREATE POLICY "All authenticated users can view medicao_sessions"
ON public.medicao_sessions
FOR SELECT
USING (true);

-- Medição items: allow all authenticated users to view
CREATE POLICY "All authenticated users can view medicao_items"
ON public.medicao_items
FOR SELECT
USING (true);
