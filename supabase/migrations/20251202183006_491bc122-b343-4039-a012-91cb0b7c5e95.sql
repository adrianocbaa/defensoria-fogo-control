-- Add RLS policy for Contratada users to view rdo_config of assigned obras
CREATE POLICY "Contratada users can view rdo_config of assigned obras"
ON public.rdo_config
FOR SELECT
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);