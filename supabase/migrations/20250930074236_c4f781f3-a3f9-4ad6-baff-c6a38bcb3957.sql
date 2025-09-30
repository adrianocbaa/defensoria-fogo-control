-- Adicionar campos de telefone para os coordenadores
ALTER TABLE public.nucleos_central 
ADD COLUMN IF NOT EXISTS telefone_membro_coordenador TEXT,
ADD COLUMN IF NOT EXISTS telefone_coordenador_substituto TEXT,
ADD COLUMN IF NOT EXISTS telefone_auxiliar_coordenador TEXT;