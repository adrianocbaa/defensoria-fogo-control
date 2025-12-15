-- Corrigir views com SECURITY DEFINER para usar SECURITY INVOKER
-- Isso garante que as views respeitem as políticas RLS do usuário

-- 1. nucleos_central_public - alterar para SECURITY INVOKER
ALTER VIEW public.nucleos_central_public SET (security_invoker = true);

-- 2. orcamento_items_hierarquia - alterar para SECURITY INVOKER
ALTER VIEW public.orcamento_items_hierarquia SET (security_invoker = true);

-- 3. rdo_activities_acumulado - alterar para SECURITY INVOKER  
ALTER VIEW public.rdo_activities_acumulado SET (security_invoker = true);

-- 4. vw_planilha_hierarquia - alterar para SECURITY INVOKER
ALTER VIEW public.vw_planilha_hierarquia SET (security_invoker = true);