-- Adicionar novos valores ao enum sector_type
ALTER TYPE public.sector_type ADD VALUE IF NOT EXISTS 'dif';
ALTER TYPE public.sector_type ADD VALUE IF NOT EXISTS 'segunda_sub';
ALTER TYPE public.sector_type ADD VALUE IF NOT EXISTS 'contratada';