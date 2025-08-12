-- 1) Restrict audit logs visibility to admins only
DROP POLICY IF EXISTS "All authenticated users can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Keep existing insert policy as-is

-- 2) Remove overly broad public SELECT policies on sensitive tables not intended for anonymous access
DROP POLICY IF EXISTS "Public can view medicoes" ON public.medicoes;
DROP POLICY IF EXISTS "Public can view medicao_items" ON public.medicao_items;
DROP POLICY IF EXISTS "Public can view medicao_sessions" ON public.medicao_sessions;
DROP POLICY IF EXISTS "Public can view aditivos" ON public.aditivos;
DROP POLICY IF EXISTS "Public can view aditivo_sessions" ON public.aditivo_sessions;
DROP POLICY IF EXISTS "Public can view orcamento items" ON public.orcamento_items;
-- Note: We intentionally keep public SELECT on nuclei, fire_extinguishers, hydrants, and documents to avoid breaking the current PublicView. We can replace these with curated public views later if desired.

-- 3) Prevent privilege escalation on profiles (role / sectors) by non-admins
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Block changes to role or sectors unless the actor is an admin
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.sectors IS DISTINCT FROM OLD.sectors) THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente administradores podem alterar role ou setores do perfil.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_prevent_profile_privilege_escalation'
  ) THEN
    -- drop and recreate to ensure latest definition
    DROP TRIGGER trg_prevent_profile_privilege_escalation ON public.profiles;
  END IF;
END$$;

CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();