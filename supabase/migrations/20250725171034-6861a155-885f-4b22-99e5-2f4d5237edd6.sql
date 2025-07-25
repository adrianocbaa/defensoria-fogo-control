-- Criar bucket para fotos dos serviços de manutenção
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit) 
VALUES ('service-photos', 'service-photos', true, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'], 5242880);

-- Políticas para o bucket de fotos dos serviços
-- Permitir leitura pública das fotos
CREATE POLICY "Fotos dos serviços são visíveis publicamente"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-photos');

-- Permitir upload de fotos para usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload de fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-photos' 
  AND auth.uid() IS NOT NULL
);

-- Permitir que usuários gerenciem suas próprias fotos
CREATE POLICY "Usuários podem gerenciar suas próprias fotos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service-photos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Usuários podem deletar suas próprias fotos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-photos' 
  AND auth.uid() IS NOT NULL
);