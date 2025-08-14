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
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
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