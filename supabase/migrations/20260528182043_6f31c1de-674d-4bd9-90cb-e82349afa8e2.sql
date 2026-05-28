ALTER TABLE public.aditivo_items DISABLE TRIGGER USER;
UPDATE public.aditivo_items SET total = ROUND(total::numeric, 2) WHERE total IS NOT NULL AND total::numeric <> ROUND(total::numeric, 2);
ALTER TABLE public.aditivo_items ENABLE TRIGGER USER;