ALTER TABLE public.orcamento_items ADD COLUMN IF NOT EXISTS valor_unitario_bruto numeric;
ALTER TABLE public.aditivo_items ADD COLUMN IF NOT EXISTS valor_unitario_bruto numeric;

UPDATE public.orcamento_items
SET valor_unitario_bruto = CASE
  WHEN quantidade IS NOT NULL AND quantidade <> 0 AND valor_total_sem_desconto IS NOT NULL AND valor_total_sem_desconto <> 0
    THEN valor_total_sem_desconto / quantidade
  ELSE valor_unitario
END
WHERE valor_unitario_bruto IS NULL;

ALTER TABLE public.aditivo_items DISABLE TRIGGER USER;

UPDATE public.aditivo_items ai
SET valor_unitario_bruto = COALESCE(
  (
    SELECT oi.valor_unitario_bruto
    FROM public.aditivo_sessions s
    JOIN public.orcamento_items oi
      ON oi.obra_id = s.obra_id AND oi.item = TRIM(ai.item_code)
    WHERE s.id = ai.aditivo_id
    LIMIT 1
  ),
  NULLIF(ai.valor_unitario, 0)
)
WHERE ai.valor_unitario_bruto IS NULL;

ALTER TABLE public.aditivo_items ENABLE TRIGGER USER;