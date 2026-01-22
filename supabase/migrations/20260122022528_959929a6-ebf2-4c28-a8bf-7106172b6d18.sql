-- Adicionar campo responsável pelo projeto (arquiteto) na tabela obras
ALTER TABLE public.obras 
ADD COLUMN responsavel_projeto_id UUID REFERENCES auth.users(id);