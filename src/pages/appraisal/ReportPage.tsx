import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FileText, Eye, Loader2, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, Project, comparablesApi, Comparable } from '@/services/appraisalApi';
import { ReportsService, Report } from '@/services/reportsApi';
import { PDFService, ReportData } from '@/services/pdfService';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<ReportData | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    try {
      const [projectData, reportsData] = await Promise.all([
        projectsApi.getById(id),
        ReportsService.getProjectReports(id)
      ]);
      
      setProject(projectData);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do projeto',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!id || !project) return;

    setGenerating(true);
    
    try {
      // Load comparables and mock model results for demo
      const comparables = await comparablesApi.list();
      
      // Mock model results - in real app this would come from saved model runs
      const mockModelResults = {
        coefficients: {
          intercept: 8.5234,
          built_area: 0.8456,
          land_area: 0.2341,
          age: -0.0234,
          quality_alto: 0.1234,
          quality_baixo: -0.0987
        },
        standardErrors: {
          intercept: 0.1234,
          built_area: 0.0456,
          land_area: 0.0341,
          age: 0.0134,
          quality_alto: 0.0234,
          quality_baixo: 0.0187
        },
        tStats: {
          intercept: 69.12,
          built_area: 18.53,
          land_area: 6.87,
          age: -1.75,
          quality_alto: 5.27,
          quality_baixo: -5.28
        },
        pValues: {
          intercept: 0.0000,
          built_area: 0.0000,
          land_area: 0.0012,
          age: 0.0923,
          quality_alto: 0.0001,
          quality_baixo: 0.0001
        },
        confidenceIntervals: {
          intercept: [8.28, 8.77],
          built_area: [0.76, 0.93],
          land_area: [0.17, 0.30],
          age: [-0.05, 0.00],
          quality_alto: [0.08, 0.17],
          quality_baixo: [-0.14, -0.06]
        },
        rSquared: 0.8756,
        rSquaredAdjusted: 0.8634,
        rmse: 0.1234,
        mae: 0.0987,
        vif: {
          built_area: 2.34,
          land_area: 1.87,
          age: 1.23,
          quality_alto: 1.45,
          quality_baixo: 1.56
        },
        elasticities: {
          built_area: 0.8456,
          land_area: 0.2341,
          age: -0.0234,
          quality_alto: 0.1234,
          quality_baixo: -0.0987
        }
      };

      const reportData: ReportData = {
        project,
        comparables: comparables.slice(0, 12), // Use first 12 comparables
        modelResults: mockModelResults,
        estimatedValue: 2750, // Mock estimated value per m²
        confidenceInterval: [2520, 2980],
        chartUrls: [] // Would contain actual chart URLs from model run
      };

      setPreviewData(reportData);
      
      toast({
        title: 'Sucesso',
        description: 'Preview do relatório gerado com sucesso!',
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar relatório',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveReport = async () => {
    if (!previewData || !id) return;

    setGenerating(true);
    
    try {
      // Generate PDF
      const pdfBlob = await PDFService.generatePDF(previewData, id);
      
      // Calculate hash
      const hash = await PDFService.calculateHash(pdfBlob);
      
      // Get next version
      const nextVersion = Math.max(...reports.map(r => r.version), 0) + 1;
      
      // Upload to storage
      const pdfUrl = await PDFService.uploadToStorage(id, nextVersion, pdfBlob);
      
      // Save to database
      await ReportsService.createReport(id, pdfUrl, hash);
      
      // Reload reports
      await loadData();
      
      // Clear preview
      setPreviewData(null);
      
      toast({
        title: 'Sucesso',
        description: `Relatório v${nextVersion} salvo com sucesso!`,
      });

    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar relatório',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (report: Report) => {
    try {
      const filename = `laudo-v${report.version}-${new Date(report.published_at).toISOString().split('T')[0]}.pdf`;
      await ReportsService.downloadReport(report.pdf_url, filename);
      
      toast({
        title: 'Sucesso',
        description: 'Download iniciado!',
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao baixar relatório',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Carregando...</div>
        </div>
      </SimpleHeader>
    );
  }

  if (!project) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Projeto não encontrado</div>
        </div>
      </SimpleHeader>
    );
  }

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/avaliacao-imoveis/projects/${id}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Projeto
          </Button>
          
          <PageHeader
            title="Laudo de Avaliação"
            subtitle={`${project.purpose || 'Projeto de Avaliação'}`}
          />
        </div>

        {/* Generate Report Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gerar Novo Laudo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Gere um laudo completo em PDF com análise estatística, gráficos e QR code para verificação.
              </p>
              
              <div className="flex gap-3">
                <Button 
                  onClick={generateReport}
                  disabled={generating}
                  className="flex items-center gap-2"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  Gerar Preview
                </Button>
                
                {previewData && (
                  <Button 
                    onClick={saveReport}
                    disabled={generating}
                    variant="default"
                    className="flex items-center gap-2"
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Salvar PDF
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        {previewData && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Preview do Relatório
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Amostra:</span> {previewData.comparables.length} comparáveis
                  </div>
                  <div>
                    <span className="font-medium">R² Ajustado:</span> {(previewData.modelResults.rSquaredAdjusted * 100).toFixed(1)}%
                  </div>
                  <div>
                    <span className="font-medium">Valor Estimado:</span> {formatCurrency(previewData.estimatedValue)}/m²
                  </div>
                </div>
                
                <p className="text-sm text-green-700">
                  Preview gerado com sucesso! Clique em "Salvar PDF" para criar o arquivo final.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico de Laudos ({reports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nenhum laudo gerado ainda.
                </p>
                <p className="text-sm text-muted-foreground">
                  Use o botão "Gerar Preview" acima para criar o primeiro laudo.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div 
                    key={report.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{report.version}</Badge>
                        <span className="font-medium">Laudo de Avaliação</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Gerado em {new Date(report.published_at).toLocaleDateString('pt-BR')} às {new Date(report.published_at).toLocaleTimeString('pt-BR')}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        Hash: {report.signature_hash.substring(0, 16)}...
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadReport(report)}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SimpleHeader>
  );
}