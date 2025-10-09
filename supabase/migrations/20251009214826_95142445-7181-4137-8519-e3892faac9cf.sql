-- Enable public viewing of nucleos_central
CREATE POLICY "Public can view nucleos_central"
ON public.nucleos_central
FOR SELECT
TO anon, authenticated
USING (true);

-- Enable public viewing of nucleo_module_visibility
CREATE POLICY "Public can view nucleo_module_visibility"
ON public.nucleo_module_visibility
FOR SELECT
TO anon, authenticated
USING (true);

-- Enable public viewing of nuclei (for preventivos)
CREATE POLICY "Public can view nuclei"
ON public.nuclei
FOR SELECT
TO anon, authenticated
USING (true);