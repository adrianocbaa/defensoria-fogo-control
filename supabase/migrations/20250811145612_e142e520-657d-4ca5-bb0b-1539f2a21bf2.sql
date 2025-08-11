-- Ensure FK relationship so PostgREST can embed aditivo_items under aditivo_sessions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'aditivo_items_aditivo_id_fkey'
  ) THEN
    ALTER TABLE public.aditivo_items
      ADD CONSTRAINT aditivo_items_aditivo_id_fkey
      FOREIGN KEY (aditivo_id)
      REFERENCES public.aditivo_sessions(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure unique constraint to support upsert on (aditivo_id, item_code)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'aditivo_items_aditivo_id_item_code_key'
  ) THEN
    ALTER TABLE public.aditivo_items
      ADD CONSTRAINT aditivo_items_aditivo_id_item_code_key
      UNIQUE (aditivo_id, item_code);
  END IF;
END $$;

-- Helpful index for queries by aditivo_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'idx_aditivo_items_aditivo_id'
  ) THEN
    CREATE INDEX idx_aditivo_items_aditivo_id ON public.aditivo_items (aditivo_id);
  END IF;
END $$;

-- Update updated_at automatically on changes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_aditivo_items_updated_at'
  ) THEN
    CREATE TRIGGER trg_aditivo_items_updated_at
    BEFORE UPDATE ON public.aditivo_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_aditivo_sessions_updated_at'
  ) THEN
    CREATE TRIGGER trg_aditivo_sessions_updated_at
    BEFORE UPDATE ON public.aditivo_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;