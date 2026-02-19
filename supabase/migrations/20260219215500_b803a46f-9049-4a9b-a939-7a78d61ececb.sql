
-- Criar schema extensions se não existir
CREATE SCHEMA IF NOT EXISTS extensions;

-- Mover unaccent para o schema extensions
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- Recriar as funções wrapper para que unaccent continue funcionando no schema public
CREATE OR REPLACE FUNCTION public.unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public
AS $$
  SELECT extensions.unaccent($1);
$$;

CREATE OR REPLACE FUNCTION public.unaccent(regdictionary, text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public
AS $$
  SELECT extensions.unaccent($1, $2);
$$;
