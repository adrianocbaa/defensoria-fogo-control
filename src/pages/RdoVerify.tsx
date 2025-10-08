import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, CheckCircle2, FileText, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RdoVerify() {
  const { hash } = useParams();

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['rdo-verify', hash],
    queryFn: async () => {
      const { data: reportData, error } = await supabase
        .from('rdo_reports')
        .select(`
          *,
          obra:obras(nome, municipio, tipo)
        `)
        .eq('hash_verificacao', hash)
        .single();

      if (error) throw error;
      return reportData;
    },
    enabled: !!hash,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-destructive">RDO não encontrado</CardTitle>
            <CardDescription>
              O relatório que você está procurando não existe ou foi removido.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleDownload = () => {
    if (report.pdf_url) {
      window.open(report.pdf_url, '_blank');
    }
  };

  const statusColors: Record<string, string> = {
    rascunho: 'secondary',
    preenchendo: 'default',
    concluido: 'default',
    aprovado: 'default',
    reprovado: 'destructive',
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                RDO Nº {report.numero_seq}
              </CardTitle>
              <CardDescription>
                Relatório Diário de Obra - Verificação Pública
              </CardDescription>
            </div>
            <Badge variant={statusColors[report.status] as any}>
              {report.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Informações da Obra */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">{report.obra?.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {report.obra?.municipio} - {report.obra?.tipo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Data do Relatório</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(report.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {/* Assinaturas */}
          {(report.assinatura_fiscal_url || report.assinatura_contratada_url) && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Assinaturas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.assinatura_fiscal_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Fiscal/Gestor DPE-MT</p>
                    <img 
                      src={report.assinatura_fiscal_url} 
                      alt="Assinatura Fiscal"
                      className="h-20 object-contain border rounded"
                    />
                    <div className="text-xs text-muted-foreground">
                      <p>{report.assinatura_fiscal_nome}</p>
                      <p>{report.assinatura_fiscal_cargo}</p>
                      <p>{report.assinatura_fiscal_documento}</p>
                    </div>
                  </div>
                )}

                {report.assinatura_contratada_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Responsável Técnico</p>
                    <img 
                      src={report.assinatura_contratada_url} 
                      alt="Assinatura Contratada"
                      className="h-20 object-contain border rounded"
                    />
                    <div className="text-xs text-muted-foreground">
                      <p>{report.assinatura_contratada_nome}</p>
                      <p>{report.assinatura_contratada_cargo}</p>
                      <p>{report.assinatura_contratada_documento}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Download do PDF */}
          {report.pdf_url && (
            <div className="pt-4 border-t">
              <Button onClick={handleDownload} className="w-full" size="lg">
                <Download className="h-5 w-5 mr-2" />
                Baixar PDF Completo
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>Documento emitido pelo Sistema DIF – DPE-MT</p>
            <p className="mt-1">Hash de Verificação: {hash}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
