-- Criar política para permitir acesso público de leitura à tabela obras
CREATE POLICY "Public read access to obras"
ON public.obras
FOR SELECT
TO anon, authenticated
USING (true);

-- Criar política para permitir acesso público de leitura à tabela orcamento_items
-- (necessário para visualizar detalhes das obras)
CREATE POLICY "Public read access to orcamento_items"
ON public.orcamento_items
FOR SELECT
TO anon, authenticated
USING (true);

-- Criar política para permitir acesso público de leitura à tabela medicoes
-- (necessário para visualizar medições das obras)
CREATE POLICY "Public read access to medicoes"
ON public.medicoes
FOR SELECT
TO anon, authenticated
USING (true);

-- Criar política para permitir acesso público de leitura às views de medição
CREATE POLICY "Public read access to medicao_sessions"
ON public.medicao_sessions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public read access to medicao_items"
ON public.medicao_items
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public read access to aditivo_sessions"
ON public.aditivo_sessions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public read access to aditivo_items"
ON public.aditivo_items
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public read access to aditivos"
ON public.aditivos
FOR SELECT
TO anon, authenticated
USING (true);