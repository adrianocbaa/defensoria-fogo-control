-- Adicionar política de leitura pública para nuclei
CREATE POLICY "Public can view nuclei" 
ON public.nuclei 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Adicionar política de leitura pública para fire_extinguishers
CREATE POLICY "Public can view fire extinguishers" 
ON public.fire_extinguishers 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Adicionar política de leitura pública para hydrants
CREATE POLICY "Public can view hydrants" 
ON public.hydrants 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Adicionar política de leitura pública para documents
CREATE POLICY "Public can view documents" 
ON public.documents 
FOR SELECT 
TO anon, authenticated
USING (true);