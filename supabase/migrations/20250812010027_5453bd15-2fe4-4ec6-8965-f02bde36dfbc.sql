-- Secure the view to run with the querying user's privileges instead of the view owner's
-- This resolves the Security Advisor error: Security Definer View

-- Ensure Postgres 15+ syntax is used (Supabase default)
ALTER VIEW public.medicao_contrato_atual_por_item SET (security_invoker = on);
-- Add a security barrier as an extra hardening step to prevent data leaks via functions
ALTER VIEW public.medicao_contrato_atual_por_item SET (security_barrier = on);
