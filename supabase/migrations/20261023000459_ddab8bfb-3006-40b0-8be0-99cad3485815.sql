-- Formalize the timestamp column already added manually in production.
-- Preserve its existing nullable, no-default definition; do not backfill data.
-- The existing update_stock_movements_updated_at trigger remains unchanged.
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;