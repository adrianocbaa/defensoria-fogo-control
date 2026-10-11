import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PRIVATE_BUCKETS, PrivateBucket, storageRef, tenantPath } from '@/lib/privateStorage';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const uploadFile = async (
    file: File, 
    bucket: string = 'documents',
    folder?: string
  ): Promise<{ url?: string; error?: string }> => {
    if (!user) {
      return { error: 'Usuário não autenticado' };
    }

    setUploading(true);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExt}`;
      
      // Create path with user folder structure
      const isPrivate = (PRIVATE_BUCKETS as readonly string[]).includes(bucket);
      // Lote S1: buckets privados usam <org>/<modulo>/<...>/<usuario>/<arquivo>
      const filePath = isPrivate
        ? await tenantPath(folder || 'files', user.id, fileName)
        : folder
          ? `${user.id}/${folder}/${fileName}`
          : `${user.id}/${fileName}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return { error: error.message };
      }

      if (isPrivate) {
        // Referência persistível; exibição usa URL assinada temporária (privateStorage)
        return { url: storageRef(bucket as PrivateBucket, data.path) };
      }
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      return { url: publicUrl };
    } catch (error) {
      console.error('Upload error:', error);
      return { error: 'Erro no upload do arquivo' };
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (
    filePath: string, 
    bucket: string = 'documents'
  ): Promise<{ error?: string }> => {
    if (!user) {
      return { error: 'Usuário não autenticado' };
    }

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      console.error('Delete error:', error);
      return { error: 'Erro ao deletar arquivo' };
    }
  };

  return {
    uploadFile,
    deleteFile,
    uploading,
  };
}