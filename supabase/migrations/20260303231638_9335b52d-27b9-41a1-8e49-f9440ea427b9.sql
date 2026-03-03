
-- 1. Reverter can_edit() removendo o papel demo
CREATE OR REPLACE FUNCTION public.can_edit(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(user_uuid, 'admin'::user_role) 
      OR public.has_role(user_uuid, 'editor'::user_role)
      OR public.has_role(user_uuid, 'gm'::user_role)
      OR public.has_role(user_uuid, 'prestadora'::user_role)
      OR public.has_role(user_uuid, 'contratada'::user_role);
$function$;

-- 2. Políticas isoladas para demo em obras (apenas is_demo=true)
DROP POLICY IF EXISTS "Demo users can view demo obras" ON public.obras;
CREATE POLICY "Demo users can view demo obras"
ON public.obras FOR SELECT
USING (public.has_role(auth.uid(), 'demo'::user_role) AND is_demo = true);

DROP POLICY IF EXISTS "Demo users can update demo obras" ON public.obras;
CREATE POLICY "Demo users can update demo obras"
ON public.obras FOR UPDATE
USING (public.has_role(auth.uid(), 'demo'::user_role) AND is_demo = true);

-- 3. Demo pode ver orcamento_items apenas de obras demo
DROP POLICY IF EXISTS "Demo users can view orcamento_items of demo obras" ON public.orcamento_items;
CREATE POLICY "Demo users can view orcamento_items of demo obras"
ON public.orcamento_items FOR SELECT
USING (
  public.has_role(auth.uid(), 'demo'::user_role) AND
  EXISTS (SELECT 1 FROM obras WHERE obras.id = orcamento_items.obra_id AND obras.is_demo = true)
);

-- 4. Demo pode ver/editar medicao_sessions apenas de obras demo
DROP POLICY IF EXISTS "Demo users can view medicao_sessions of demo obras" ON public.medicao_sessions;
CREATE POLICY "Demo users can view medicao_sessions of demo obras"
ON public.medicao_sessions FOR SELECT
USING (
  public.has_role(auth.uid(), 'demo'::user_role) AND
  EXISTS (SELECT 1 FROM obras WHERE obras.id = medicao_sessions.obra_id AND obras.is_demo = true)
);

DROP POLICY IF EXISTS "Demo users can insert medicao_sessions of demo obras" ON public.medicao_sessions;
CREATE POLICY "Demo users can insert medicao_sessions of demo obras"
ON public.medicao_sessions FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'demo'::user_role) AND
  EXISTS (SELECT 1 FROM obras WHERE obras.id = medicao_sessions.obra_id AND obras.is_demo = true)
);

DROP POLICY IF EXISTS "Demo users can update medicao_sessions of demo obras" ON public.medicao_sessions;
CREATE POLICY "Demo users can update medicao_sessions of demo obras"
ON public.medicao_sessions FOR UPDATE
USING (
  public.has_role(auth.uid(), 'demo'::user_role) AND
  EXISTS (SELECT 1 FROM obras WHERE obras.id = medicao_sessions.obra_id AND obras.is_demo = true)
);

-- 5. Demo pode ver/editar medicao_items apenas de obras demo
DROP POLICY IF EXISTS "Demo users can view medicao_items of demo obras" ON public.medicao_items;
CREATE POLICY "Demo users can view medicao_items of demo obras"
ON public.medicao_items FOR SELECT
USING (
  public.has_role(auth.uid(), 'demo'::user_role) AND
  EXISTS (
    SELECT 1 FROM medicao_sessions ms
    JOIN obras o ON o.id = ms.obra_id
    WHERE ms.id = medicao_items.medicao_id AND o.is_demo = true
  )
);

DROP POLICY IF EXISTS "Demo users can insert medicao_items of demo obras" ON public.medicao_items;
CREATE POLICY "Demo users can insert medicao_items of demo obras"
ON public.medicao_items FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'demo'::user_role) AND
  EXISTS (
    SELECT 1 FROM medicao_sessions ms
    JOIN obras o ON o.id = ms.obra_id
    WHERE ms.id = medicao_items.medicao_id AND o.is_demo = true
  )
);

DROP POLICY IF EXISTS "Demo users can update medicao_items of demo obras" ON public.medicao_items;
CREATE POLICY "Demo users can update medicao_items of demo obras"
ON public.medicao_items FOR UPDATE
USING (
  public.has_role(auth.uid(), 'demo'::user_role) AND
  EXISTS (
    SELECT 1 FROM medicao_sessions ms
    JOIN obras o ON o.id = ms.obra_id
    WHERE ms.id = medicao_items.medicao_id AND o.is_demo = true
  )
);

-- 6. Demo pode ver aditivos/aditivo_sessions/aditivo_items apenas de obras demo
DROP POLICY IF EXISTS "Demo users can view aditivo_sessions of demo obras" ON public.aditivo_sessions;
CREATE POLICY "Demo users can view aditivo_sessions of demo obras"
ON public.aditivo_sessions FOR SELECT
USING (
  public.has_role(auth.uid(), 'demo'::user_role) AND
  EXISTS (SELECT 1 FROM obras WHERE obras.id = aditivo_sessions.obra_id AND obras.is_demo = true)
);

DROP POLICY IF EXISTS "Demo users can view aditivos of demo obras" ON public.aditivos;
CREATE POLICY "Demo users can view aditivos of demo obras"
ON public.aditivos FOR SELECT
USING (
  public.has_role(auth.uid(), 'demo'::user_role) AND
  EXISTS (SELECT 1 FROM obras WHERE obras.id = aditivos.obra_id AND obras.is_demo = true)
);
