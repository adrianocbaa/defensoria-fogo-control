-- Adjust medicoes uniqueness to allow multiple items per medição
-- Drop existing unique constraint or index if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'medicoes_obra_numero_unique'
  ) THEN
    ALTER TABLE public.medicoes DROP CONSTRAINT medicoes_obra_numero_unique;
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Also attempt to drop index with same name if it exists
DROP INDEX IF EXISTS public.medicoes_obra_numero_unique;

-- Create a new unique index that includes servico_codigo
CREATE UNIQUE INDEX IF NOT EXISTS medicoes_obra_numero_servico_unique
ON public.medicoes (obra_id, numero_medicao, servico_codigo);
