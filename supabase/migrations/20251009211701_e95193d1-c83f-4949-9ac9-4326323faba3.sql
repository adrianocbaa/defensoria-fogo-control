-- Primeiro, tornar a coluna user_id nullable temporariamente em audit_logs
ALTER TABLE public.audit_logs
ALTER COLUMN user_id DROP NOT NULL;

-- Adicionar coluna is_public à tabela obras
ALTER TABLE public.obras
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Remover as políticas públicas antigas
DROP POLICY IF EXISTS "Public read access to obras" ON public.obras;
DROP POLICY IF EXISTS "Public can view public obras" ON public.obras;
DROP POLICY IF EXISTS "Public read access to orcamento_items" ON public.orcamento_items;
DROP POLICY IF EXISTS "Public can view orcamento_items of public obras" ON public.orcamento_items;
DROP POLICY IF EXISTS "Public read access to medicoes" ON public.medicoes;
DROP POLICY IF EXISTS "Public can view medicoes of public obras" ON public.medicoes;
DROP POLICY IF EXISTS "Public read access to medicao_sessions" ON public.medicao_sessions;
DROP POLICY IF EXISTS "Public can view medicao_sessions of public obras" ON public.medicao_sessions;
DROP POLICY IF EXISTS "Public read access to medicao_items" ON public.medicao_items;
DROP POLICY IF EXISTS "Public can view medicao_items of public medicao_sessions" ON public.medicao_items;
DROP POLICY IF EXISTS "Public read access to aditivo_sessions" ON public.aditivo_sessions;
DROP POLICY IF EXISTS "Public can view aditivo_sessions of public obras" ON public.aditivo_sessions;
DROP POLICY IF EXISTS "Public read access to aditivo_items" ON public.aditivo_items;
DROP POLICY IF EXISTS "Public can view aditivo_items of public aditivo_sessions" ON public.aditivo_items;
DROP POLICY IF EXISTS "Public read access to aditivos" ON public.aditivos;
DROP POLICY IF EXISTS "Public can view aditivos of public obras" ON public.aditivos;

-- Criar nova política pública apenas para obras marcadas como públicas
CREATE POLICY "Public can view public obras"
ON public.obras
FOR SELECT
TO anon, authenticated
USING (is_public = true);

-- Criar políticas para tabelas relacionadas apenas quando a obra é pública
CREATE POLICY "Public can view orcamento_items of public obras"
ON public.orcamento_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.obras
    WHERE obras.id = orcamento_items.obra_id
    AND obras.is_public = true
  )
);

CREATE POLICY "Public can view medicoes of public obras"
ON public.medicoes
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.obras
    WHERE obras.id = medicoes.obra_id
    AND obras.is_public = true
  )
);

CREATE POLICY "Public can view medicao_sessions of public obras"
ON public.medicao_sessions
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.obras
    WHERE obras.id = medicao_sessions.obra_id
    AND obras.is_public = true
  )
);

CREATE POLICY "Public can view medicao_items of public medicao_sessions"
ON public.medicao_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.medicao_sessions
    JOIN public.obras ON obras.id = medicao_sessions.obra_id
    WHERE medicao_sessions.id = medicao_items.medicao_id
    AND obras.is_public = true
  )
);

CREATE POLICY "Public can view aditivo_sessions of public obras"
ON public.aditivo_sessions
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.obras
    WHERE obras.id = aditivo_sessions.obra_id
    AND obras.is_public = true
  )
);

CREATE POLICY "Public can view aditivo_items of public aditivo_sessions"
ON public.aditivo_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.aditivo_sessions
    JOIN public.obras ON obras.id = aditivo_sessions.obra_id
    WHERE aditivo_sessions.id = aditivo_items.aditivo_id
    AND obras.is_public = true
  )
);

CREATE POLICY "Public can view aditivos of public obras"
ON public.aditivos
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.obras
    WHERE obras.id = aditivos.obra_id
    AND obras.is_public = true
  )
);

-- Marcar a obra "Almoxarifado Santa Cruz - Reforma 02" como pública
UPDATE public.obras
SET is_public = true
WHERE nome LIKE '%Almoxarifado Santa Cruz - Reforma 02%';