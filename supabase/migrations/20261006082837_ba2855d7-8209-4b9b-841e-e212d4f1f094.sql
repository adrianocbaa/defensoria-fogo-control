DROP POLICY obras_select_v2 ON public.obras;
CREATE POLICY obras_select_v2 ON public.obras FOR SELECT
USING ((NOT has_role(auth.uid(), 'contratada'::user_role)) AND ((is_demo_user(auth.uid()) AND is_demo = true) OR ((NOT is_demo_user(auth.uid())) AND (is_demo = false OR is_demo IS NULL))));