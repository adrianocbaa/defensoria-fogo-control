-- Fix Security Advisor: view should not run as definer
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' AND viewname = 'medicao_acumulado_por_item'
  ) THEN
    ALTER VIEW public.medicao_acumulado_por_item SET (security_invoker = on);
  END IF;
END $$;