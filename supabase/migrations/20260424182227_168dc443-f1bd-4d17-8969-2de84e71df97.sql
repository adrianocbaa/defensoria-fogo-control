DROP VIEW IF EXISTS public.profiles_secure;
CREATE VIEW public.profiles_secure AS
SELECT id, user_id, display_name, avatar_url, phone, "position", department,
       language, theme, email, crea_cau, created_at, updated_at
FROM public.profiles
WHERE auth.uid() = user_id OR has_role(auth.uid(), 'admin'::user_role);