-- Adicionar 'nucleos_central' ao enum sector_type
ALTER TYPE sector_type ADD VALUE IF NOT EXISTS 'nucleos_central';