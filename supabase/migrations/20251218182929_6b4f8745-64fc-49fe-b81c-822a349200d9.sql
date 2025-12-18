-- Adicionar coluna setores_atuantes na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN setores_atuantes text[] DEFAULT '{}'::text[];