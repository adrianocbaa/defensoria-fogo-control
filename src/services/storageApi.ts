import { supabase } from '@/integrations/supabase/client';

export interface UploadResult {
  data: {
    id: string;
    url: string;
    path: string;
  } | null;
  error: any;
}

export interface AttachmentMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export const storageApi = {
  async uploadFile(
    file: File,
    bucket: string = 'artifacts',
    projectId?: string
  ): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const fileName = file.name;
      const path = projectId 
        ? `${projectId}/${timestamp}-${fileName}`
        : `uploads/${timestamp}-${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get signed URL for 1 hour access
      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour

      if (urlError) {
        throw urlError;
      }

      // Save attachment metadata
      const metadata = {
        name: fileName,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      };

      const { data: attachmentId, error: attachmentError } = await supabase.rpc('create_attachment', {
        p_owner_type: projectId ? 'project' : 'general',
        p_owner_id: projectId || null,
        p_url: uploadData.path,
        p_kind: file.type.startsWith('image/') ? 'image' : 'document',
        p_meta_json: metadata as any
      });

      if (attachmentError) {
        throw attachmentError;
      }

      return {
        data: {
          id: attachmentId,
          url: urlData.signedUrl,
          path: uploadData.path
        },
        error: null
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        data: null,
        error
      };
    }
  },

  async getSignedUrl(path: string, bucket: string = 'artifacts', expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  },

  async deleteFile(path: string, bucket: string = 'artifacts'): Promise<{ error: any }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      return { error };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { error };
    }
  },

  async listFiles(projectId: string, bucket: string = 'artifacts') {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(projectId);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error listing files:', error);
      return { data: null, error };
    }
  }
};

// CSV Processing utilities
export const csvUtils = {
  validateComparableRow(row: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredFields = ['source', 'date', 'deal_type', 'price_total', 'land_area', 'built_area', 'quality', 'age', 'condition', 'lat', 'lon'];

    requiredFields.forEach(field => {
      if (!row[field] || row[field] === '') {
        errors.push(`Campo obrigatório ausente: ${field}`);
      }
    });

    // Validate enums
    if (row.deal_type && !['sale', 'rent', 'offer'].includes(row.deal_type)) {
      errors.push('deal_type deve ser: sale, rent ou offer');
    }

    if (row.kind && !['urban', 'rural'].includes(row.kind)) {
      errors.push('kind deve ser: urban ou rural');
    }

    // Validate numbers
    const numberFields = ['price_total', 'price_unit', 'land_area', 'built_area', 'age', 'lat', 'lon'];
    numberFields.forEach(field => {
      if (row[field] && isNaN(Number(row[field]))) {
        errors.push(`${field} deve ser um número válido`);
      }
    });

    // Validate date format
    if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      errors.push('date deve estar no formato YYYY-MM-DD');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  normalizeComparableRow(row: any): Omit<import('./appraisalApi').Comparable, 'id' | 'created_at'> {
    // Convert string numbers to actual numbers
    const numberFields = ['price_total', 'price_unit', 'land_area', 'built_area', 'age', 'lat', 'lon', 'exposure_time'];
    numberFields.forEach(field => {
      if (row[field]) {
        const value = String(row[field]).replace(',', '.'); // Handle comma decimal separator
        row[field] = parseFloat(value);
      }
    });

    // Normalize date format
    if (row.date) {
      const date = new Date(row.date);
      row.date = date.toISOString().split('T')[0];
    }

    return {
      kind: row.kind || 'urban',
      source: row.source || '',
      date: row.date,
      deal_type: row.deal_type || 'sale',
      price_total: row.price_total || 0,
      price_unit: row.price_unit,
      land_area: row.land_area,
      built_area: row.built_area,
      quality: row.quality,
      age: row.age,
      condition: row.condition,
      payment_terms: row.payment_terms,
      exposure_time: row.exposure_time,
      lat: row.lat,
      lon: row.lon,
      notes: row.notes
    };
  }
};