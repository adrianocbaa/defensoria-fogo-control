-- Adicionar módulo 'orcamento' ao enum sector_type
ALTER TYPE sector_type ADD VALUE IF NOT EXISTS 'orcamento';