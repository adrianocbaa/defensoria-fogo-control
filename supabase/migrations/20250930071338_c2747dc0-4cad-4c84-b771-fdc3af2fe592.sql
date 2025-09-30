-- Adicionar campos específicos de teletrabalho à tabela nucleos_central
ALTER TABLE public.nucleos_central 
ADD COLUMN IF NOT EXISTS horario_atendimento TEXT,
ADD COLUMN IF NOT EXISTS membro_coordenador TEXT,
ADD COLUMN IF NOT EXISTS coordenador_substituto TEXT,
ADD COLUMN IF NOT EXISTS auxiliar_coordenador TEXT;