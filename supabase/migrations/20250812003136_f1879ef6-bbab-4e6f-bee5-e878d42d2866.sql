-- Remove SECURITY DEFINER from the profile escalation prevention trigger function per linter guidance
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.sectors IS DISTINCT FROM OLD.sectors) THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente administradores podem alterar role ou setores do perfil.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it uses the latest function (no-op if unchanged)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_prevent_profile_privilege_escalation'
  ) THEN
    DROP TRIGGER trg_prevent_profile_privilege_escalation ON public.profiles;
  END IF;
END$$;

CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();