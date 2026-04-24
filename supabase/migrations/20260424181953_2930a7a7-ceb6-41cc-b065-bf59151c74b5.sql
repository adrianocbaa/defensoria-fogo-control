ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS crea_cau text;

ALTER TABLE public.medicao_sessions
  ADD COLUMN IF NOT EXISTS periodo_inicio date,
  ADD COLUMN IF NOT EXISTS periodo_fim date,
  ADD COLUMN IF NOT EXISTS data_vistoria date,
  ADD COLUMN IF NOT EXISTS data_relatorio date;