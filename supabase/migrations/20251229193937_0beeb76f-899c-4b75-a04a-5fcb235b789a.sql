-- Atualizar bucket service-photos para aceitar vídeos
UPDATE storage.buckets 
SET 
  allowed_mime_types = ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/3gpp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  file_size_limit = 104857600  -- 100MB para suportar vídeos
WHERE name = 'service-photos';