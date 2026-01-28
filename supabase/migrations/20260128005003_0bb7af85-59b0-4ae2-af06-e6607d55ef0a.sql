-- Atualizar política de SELECT em obra_action_logs para incluir contratadas
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar logs de obras que têm " ON public.obra_action_logs;

CREATE POLICY "Usuários autenticados podem visualizar logs de obras acessíveis"
ON public.obra_action_logs
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin(auth.uid()) 
    OR can_edit_obra(obra_id, auth.uid()) 
    OR is_fiscal_of_obra(obra_id, auth.uid())
    OR (
      -- Contratadas podem ver logs de obras que têm acesso
      has_role(auth.uid(), 'contratada'::user_role) 
      AND user_has_obra_access(auth.uid(), obra_id)
    )
  )
);