-- Criar política para administradores poderem atualizar qualquer perfil
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin(auth.uid()));