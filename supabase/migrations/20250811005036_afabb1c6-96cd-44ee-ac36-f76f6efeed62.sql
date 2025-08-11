-- Retry migration without referencing unknown columns
-- 1) Add column numero_medicao to medicoes (idempotent)
ALTER TABLE public.medicoes 
ADD COLUMN IF NOT EXISTS numero_medicao INTEGER;

-- 2) Backfill numero_medicao per obra using stable order by id
WITH numbered AS (
  SELECT 
    id,
    obra_id,
    ROW_NUMBER() OVER (
      PARTITION BY obra_id 
      ORDER BY id
    ) AS num
  FROM public.medicoes
)
UPDATE public.medicoes m
SET numero_medicao = n.num
FROM numbered n
WHERE m.id = n.id AND m.numero_medicao IS NULL;

-- 3) Enforce NOT NULL after backfill
ALTER TABLE public.medicoes 
ALTER COLUMN numero_medicao SET NOT NULL;

-- 4) Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_medicoes_obra_numero 
ON public.medicoes (obra_id, numero_medicao);

-- 5) Ensure uniqueness per obra
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'medicoes_obra_numero_unique'
  ) THEN
    ALTER TABLE public.medicoes
    ADD CONSTRAINT medicoes_obra_numero_unique UNIQUE (obra_id, numero_medicao);
  END IF;
END $$;