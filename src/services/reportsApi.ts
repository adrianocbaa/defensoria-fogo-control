import { supabase } from '@/integrations/supabase/client';

export interface Report {
  id: string;
  version: number;
  pdf_url: string;
  signature_hash: string;
  published_at: string;
}

export class ReportsService {
  static async getProjectReports(projectId: string): Promise<Report[]> {
    const { data, error } = await supabase.rpc('get_project_reports', {
      project_id: projectId
    });

    if (error) {
      throw new Error(`Error fetching reports: ${error.message}`);
    }

    return data || [];
  }

  static async createReport(
    projectId: string, 
    pdfUrl: string, 
    signatureHash: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('create_report', {
      p_project_id: projectId,
      p_pdf_url: pdfUrl,
      p_signature_hash: signatureHash
    });

    if (error) {
      throw new Error(`Error creating report: ${error.message}`);
    }

    return data;
  }

  static async downloadReport(url: string, filename: string): Promise<void> {
    try {
      // Extract bucket and path from Supabase storage URL
      const urlParts = url.split('/storage/v1/object/public/');
      if (urlParts.length !== 2) {
        throw new Error('Invalid storage URL format');
      }
      
      const [bucket, path] = urlParts[1].split('/', 2);
      const filePath = urlParts[1].substring(bucket.length + 1);
      
      // Download from Supabase storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);
      
      if (error) {
        throw new Error(`Storage download error: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No data received from storage');
      }
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(data);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }
}