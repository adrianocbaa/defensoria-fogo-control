import React, { useState } from 'react';
import { X, MapPin, Calendar, Building2, Users, FileText, Image, Download, Loader2, DollarSign, TrendingUp } from 'lucide-react';
import { PhotoGalleryCollapsible } from '@/components/PhotoGalleryCollapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMedicoesFinanceiro } from '@/hooks/useMedicoesFinanceiro';
import { type Obra, type ObraStatus } from '@/data/mockObras';
import { DetailsLoadingSkeleton, PhotoGalleryLoadingSkeleton } from '@/components/LoadingStates';
import { formatCurrency, formatPercentageValue } from '@/lib/formatters';

interface ObraDetailsProps {
  obra: Obra | null;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
}

const getStatusColor = (status: ObraStatus) => {
  switch (status) {
    case 'concluida': return 'bg-green-500';
    case 'em_andamento': return 'bg-blue-500';
    case 'planejada': return 'bg-yellow-500';
    case 'paralisada': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getStatusLabel = (status: ObraStatus) => {
  switch (status) {
    case 'concluida': return 'Concluída';
    case 'em_andamento': return 'Em Andamento';
    case 'planejada': return 'Planejada';
    case 'paralisada': return 'Paralisada';
    default: return status;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

function ObraDetailsContent({ obra, onClose, loading }: { obra: Obra; onClose: () => void; loading?: boolean }) {
  const [photosLoading, setPhotosLoading] = useState(true);
  
  // Buscar dados financeiros das medições
  const { dados: dadosFinanceiros, loading: loadingFinanceiro } = useMedicoesFinanceiro(obra.id);
  
  // Usar dados das medições se disponíveis, senão usar dados da obra
  const valorInicial = dadosFinanceiros.valorTotalOriginal > 0 ? dadosFinanceiros.valorTotalOriginal : (obra?.valor || 0);
  const valorAditivado = dadosFinanceiros.valorAditivado > 0 ? dadosFinanceiros.valorAditivado : ((obra as any)?.valor_aditivado || 0);
  const valorFinal = dadosFinanceiros.valorFinal > 0 ? dadosFinanceiros.valorFinal : (valorInicial + valorAditivado);
  const valorPago = dadosFinanceiros.valorPago > 0 ? dadosFinanceiros.valorPago : (obra?.valorExecutado || 0);
  const percentualAndamento = dadosFinanceiros.percentualExecutado > 0 ? dadosFinanceiros.percentualExecutado : (valorFinal > 0 ? Math.min((valorPago / valorFinal) * 100, 100) : 0);
  
  // Simulate photo loading delay
  React.useEffect(() => {
    if (obra.fotos && obra.fotos.length > 0) {
      const timer = setTimeout(() => setPhotosLoading(false), 800);
      return () => clearTimeout(timer);
    } else {
      setPhotosLoading(false);
    }
  }, [obra.fotos?.length]);

  if (loading) {
    return <DetailsLoadingSkeleton />;
  }

  const fotos = obra.fotos || [];
  const documentos = obra.documentos || [];
  
  // Convert photos to PhotoMetadata format, handling both new object format and legacy URL arrays
  const photosWithMetadata = fotos.map((photo: any, index) => {
    // Handle null/undefined photos
    if (!photo) {
      return {
        url: '',
        uploadedAt: new Date().toISOString(),
        fileName: `foto-${index + 1}.jpg`,
        monthFolder: undefined
      };
    }

    // If photo is already an object with metadata, use it
    if (typeof photo === 'object' && photo.url) {
      return {
        url: photo.url,
        uploadedAt: photo.uploadedAt || new Date().toISOString(),
        fileName: photo.fileName || `foto-${index + 1}.jpg`,
        monthFolder: photo.monthFolder
      };
    }
    
    // Legacy support: if photo is just a URL string
    const url = typeof photo === 'string' ? photo : String(photo);
    const monthMatch = url.match(/\/obras\/(\d{4}-\d{2})\//);
    return {
      url,
      uploadedAt: new Date().toISOString(),
      fileName: url.split('/').pop() || `foto-${index + 1}.jpg`,
      monthFolder: monthMatch ? monthMatch[1] : undefined
    };
  }).filter(photo => photo.url); // Remove photos with empty URLs

  return (
    <div className="space-y-4 lg:space-y-6 animate-fade-in">
      {/* Header com foto principal */}
      <div className="relative">
        {photosWithMetadata.length > 0 && (
          <div className="w-full h-48 lg:h-64 rounded-lg overflow-hidden mb-4">
            <img
              src={photosWithMetadata[0].url}
              alt="Foto principal da obra"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800';
              }}
            />
          </div>
        )}
        
        <div className="flex items-start justify-between">
          <div className="space-y-2 min-w-0 flex-1">
            <h2 className="text-lg lg:text-2xl font-bold leading-tight break-words">{obra.nome}</h2>
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm lg:text-base text-muted-foreground">{obra.municipio}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${getStatusColor(obra.status)} text-white border-none text-xs lg:text-sm transition-all hover:scale-105`}>
                {getStatusLabel(obra.status)}
              </Badge>
              <Badge variant="outline" className="text-xs lg:text-sm">{obra.tipo}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Accordion com seções organizadas */}
      <Accordion type="multiple" defaultValue={["geral", "prazos", "financeiro", "fotos"]} className="space-y-2">
        
        {/* Informações Gerais */}
        <AccordionItem value="geral" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="font-semibold">Informações Gerais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Contrato:</span>
                <p className="text-sm">{(obra as any).n_contrato || 'Não informado'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Objeto:</span>
                <p className="text-sm">{obra.nome}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Situação:</span>
                <p className="text-sm">{getStatusLabel(obra.status)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Empresa Responsável:</span>
                <p className="text-sm">{obra.empresaResponsavel || 'Não informado'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Fiscal do Contrato:</span>
                <p className="text-sm">{obra.secretariaResponsavel || 'Não informado'}</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Prazos de Execução */}
        <AccordionItem value="prazos" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="font-semibold">Prazos de Execução</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Data de início:</span>
                <p className="text-sm">{obra.dataInicio ? formatDate(obra.dataInicio) : 'Não informado'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Data prevista de término:</span>
                <p className="text-sm">{obra.previsaoTermino ? formatDate(obra.previsaoTermino) : 'Não informado'}</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Informações Financeiras */}
        <AccordionItem value="financeiro" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold">Informações Financeiras</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              {loadingFinanceiro ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando dados das medições...
                </div>
              ) : dadosFinanceiros.valorTotalOriginal > 0 ? (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-700">
                    ✓ Dados atualizados com base nas medições registradas
                  </p>
                </div>
              ) : (
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-700">
                    ⚠️ Nenhuma medição encontrada. Exibindo dados do contrato original.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Valor Inicial do Contrato:</span>
                  <p className="text-lg font-semibold">{formatCurrency(valorInicial)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Valor Aditivado:</span>
                  <p className="text-lg font-semibold">{formatCurrency(valorAditivado)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Valor Final:</span>
                  <p className="text-lg font-semibold text-primary">{formatCurrency(valorFinal)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Andamento da Obra:</span>
                  <span className="text-lg font-semibold text-blue-600">{formatPercentageValue(percentualAndamento)}</span>
                </div>
                <Progress value={percentualAndamento} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Valor Executado: </span>
                    <span>{formatCurrency(valorPago)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Valor Final: </span>
                    <span>{formatCurrency(valorFinal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Fotos */}
        <AccordionItem value="fotos" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="font-semibold">Álbum de Fotos ({photosWithMetadata.length})</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {photosWithMetadata.length > 0 ? (
              photosLoading ? (
                <PhotoGalleryLoadingSkeleton count={photosWithMetadata.length} />
              ) : (
                <PhotoGalleryCollapsible photos={photosWithMetadata} />
              )
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma foto cadastrada</p>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Documentos */}
        <AccordionItem value="documentos" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="font-semibold">Documentos ({documentos.length})</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {documentos.length > 0 ? (
              <div className="space-y-2">
                {documentos.map((doc, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{doc.nome}</p>
                        <p className="text-xs text-muted-foreground">{doc.tipo}</p>
                      </div>
                    </div>
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       className="flex-shrink-0 group-hover:bg-primary/10 transition-colors"
                       onClick={() => window.open('#', '_blank')}
                     >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento anexado</p>
            )}
          </AccordionContent>
        </AccordionItem>

      </Accordion>

    </div>
  );
}

export function ObraDetails({ obra, isOpen, onClose, loading = false }: ObraDetailsProps) {
  const isMobile = useIsMobile();

  if (!obra && !loading) return null;

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto p-3 lg:p-6">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalhes da Obra</DialogTitle>
          </DialogHeader>
          {obra && <ObraDetailsContent obra={obra} onClose={onClose} loading={loading} />}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-[90vw] sm:w-[600px] lg:w-[700px] xl:w-[800px] sm:max-w-none overflow-y-auto p-3 lg:p-6"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Detalhes da Obra</SheetTitle>
        </SheetHeader>
        {obra && <ObraDetailsContent obra={obra} onClose={onClose} loading={loading} />}
      </SheetContent>
    </Sheet>
  );
}