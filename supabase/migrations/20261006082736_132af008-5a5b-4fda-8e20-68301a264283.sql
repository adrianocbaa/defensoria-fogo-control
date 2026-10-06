DROP POLICY "Public can view medicao_items of public medicao_sessions" ON public.medicao_items;
CREATE POLICY "Authenticated can view medicao_items of non-demo obras" ON public.medicao_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM medicao_sessions ms JOIN obras o ON o.id = ms.obra_id WHERE ms.id = medicao_items.medicao_id AND o.is_demo IS NOT TRUE));
DROP POLICY "Public can view public obras" ON public.obras;
CREATE POLICY "Public can view public obras" ON public.obras FOR SELECT TO anon, authenticated
USING (is_public = true AND is_demo IS NOT TRUE AND NOT has_role(auth.uid(), 'contratada'::user_role));