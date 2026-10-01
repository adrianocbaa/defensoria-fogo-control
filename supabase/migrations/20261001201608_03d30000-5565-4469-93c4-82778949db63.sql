CREATE INDEX IF NOT EXISTS idx_rdo_activities_obra_item_tipo ON public.rdo_activities (obra_id, orcamento_item_id, tipo);
ALTER FUNCTION public.rdo_block_excesso_quantidade() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.rdo_block_excesso_quantidade() FROM PUBLIC, anon, authenticated;