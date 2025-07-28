import React, { useState } from 'react';
import { X, MapPin, Calendar, Building2, Users, FileText, Image, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { type Obra, type ObraStatus } from '@/data/mockObras';
import { DetailsLoadingSkeleton, PhotoGalleryLoadingSkeleton } from '@/components/LoadingStates';

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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

function ObraDetailsContent({ obra, onClose, loading }: { obra: Obra; onClose: () => void; loading?: boolean }) {
  const [photosLoading, setPhotosLoading] = useState(true);
  
  // Simulate photo loading delay
  React.useEffect(() => {
    if (obra.fotos.length > 0) {
      const timer = setTimeout(() => setPhotosLoading(false), 800);
      return () => clearTimeout(timer);
    } else {
      setPhotosLoading(false);
    }
  }, [obra.fotos.length]);

  if (loading) {
    return <DetailsLoadingSkeleton />;
  }
  return (
    <div className="space-y-4 lg:space-y-6 animate-fade-in">
      {/* Header */}
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

      <Separator />

      {/* Progress Section */}
      <Card className="transition-all duration-200 hover:shadow-sm">
        <CardHeader className="pb-2 lg:pb-3">
          <CardTitle className="text-base lg:text-lg">Progresso da Obra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 lg:space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs lg:text-sm">
              <span>Execução: {obra.porcentagemExecucao}%</span>
              <span className="font-medium">{formatCurrency(obra.valorExecutado)} de {formatCurrency(obra.valor)}</span>
            </div>
            <Progress value={obra.porcentagemExecucao} className="h-2 lg:h-3 transition-all duration-500" />
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <Card className="transition-all duration-200 hover:shadow-sm">
          <CardHeader className="pb-2 lg:pb-3">
            <CardTitle className="text-sm lg:text-base flex items-center gap-2">
              <Calendar className="h-3 w-3 lg:h-4 lg:w-4" />
              Cronograma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 lg:space-y-3">
            <div>
              <span className="text-xs lg:text-sm font-medium text-muted-foreground">Data de Início:</span>
              <p className="text-xs lg:text-sm">{formatDate(obra.dataInicio)}</p>
            </div>
            <div>
              <span className="text-xs lg:text-sm font-medium text-muted-foreground">Previsão de Término:</span>
              <p className="text-xs lg:text-sm">{formatDate(obra.previsaoTermino)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-sm">
          <CardHeader className="pb-2 lg:pb-3">
            <CardTitle className="text-sm lg:text-base flex items-center gap-2">
              <Building2 className="h-3 w-3 lg:h-4 lg:w-4" />
              Responsáveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 lg:space-y-3">
            <div>
              <span className="text-xs lg:text-sm font-medium text-muted-foreground">Empresa:</span>
              <p className="text-xs lg:text-sm">{obra.empresaResponsavel}</p>
            </div>
            <div>
              <span className="text-xs lg:text-sm font-medium text-muted-foreground">Secretaria:</span>
              <p className="text-xs lg:text-sm">{obra.secretariaResponsavel}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Details */}
      <Card className="transition-all duration-200 hover:shadow-sm">
        <CardHeader className="pb-2 lg:pb-3">
          <CardTitle className="text-sm lg:text-base">Informações Financeiras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
            <div className="text-center lg:text-left">
              <span className="text-xs lg:text-sm font-medium text-muted-foreground">Valor Total:</span>
              <p className="text-base lg:text-lg font-semibold">{formatCurrency(obra.valor)}</p>
            </div>
            <div className="text-center lg:text-left">
              <span className="text-xs lg:text-sm font-medium text-muted-foreground">Valor Executado:</span>
              <p className="text-base lg:text-lg font-semibold text-blue-600">{formatCurrency(obra.valorExecutado)}</p>
            </div>
            <div className="text-center lg:text-left">
              <span className="text-xs lg:text-sm font-medium text-muted-foreground">Saldo Restante:</span>
              <p className="text-base lg:text-lg font-semibold text-orange-600">
                {formatCurrency(obra.valor - obra.valorExecutado)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photos Gallery */}
      {obra.fotos.length > 0 && (
        <Card className="transition-all duration-200 hover:shadow-sm">
          <CardHeader className="pb-2 lg:pb-3">
            <CardTitle className="text-sm lg:text-base flex items-center gap-2">
              <Image className="h-3 w-3 lg:h-4 lg:w-4" />
              Galeria de Fotos ({obra.fotos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {photosLoading ? (
              <PhotoGalleryLoadingSkeleton count={obra.fotos.length} />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
                {obra.fotos.map((foto, index) => (
                  <div key={index} className="relative aspect-square rounded-md lg:rounded-lg overflow-hidden group">
                    <img 
                      src={foto} 
                      alt={`Foto ${index + 1} da obra`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button variant="secondary" size="sm" className="shadow-lg">
                        <Image className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      <Card className="transition-all duration-200 hover:shadow-sm">
        <CardHeader className="pb-2 lg:pb-3">
          <CardTitle className="text-sm lg:text-base flex items-center gap-2">
            <FileText className="h-3 w-3 lg:h-4 lg:w-4" />
            Documentos ({obra.documentos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {obra.documentos.map((doc, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-2 lg:p-3 border rounded-md lg:rounded-lg hover:bg-muted/50 transition-all duration-200 hover:shadow-sm group"
              >
                <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                  <FileText className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs lg:text-sm font-medium truncate">{doc.nome}</p>
                    <p className="text-xs text-muted-foreground">{doc.tipo}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                  <Download className="h-3 w-3 lg:h-4 lg:w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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