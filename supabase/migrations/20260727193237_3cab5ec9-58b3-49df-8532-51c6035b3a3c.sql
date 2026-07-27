CREATE POLICY "Authenticated users can view nuclei"
ON public.nuclei
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);