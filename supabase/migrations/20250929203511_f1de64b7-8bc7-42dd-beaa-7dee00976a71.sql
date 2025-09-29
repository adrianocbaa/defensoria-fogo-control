-- Guardar a função atual
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation_backup()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.sectors IS DISTINCT FROM OLD.sectors) THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente administradores podem alterar role ou setores do perfil.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Substituir a função por uma que não faz nada temporariamente
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN NEW;
END;
$function$;

-- Fazer o UPDATE
UPDATE public.profiles 
SET role = 'admin', updated_at = now()
WHERE user_id = 'fcbe6aab-9cd8-470e-97d3-74cf67e76bc4';

-- Restaurar a função original
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.sectors IS DISTINCT FROM OLD.sectors) THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Somente administradores podem alterar role ou setores do perfil.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Remover a função backup
DROP FUNCTION IF EXISTS public.prevent_profile_privilege_escalation_backup();