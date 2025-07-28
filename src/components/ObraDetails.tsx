import React from 'react';
import { X, MapPin, Calendar, Building2, Users, FileText, Image, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { type Obra, type ObraStatus } from '@/data/mockObras';

interface ObraDetailsProps {
  obra: Obra | null;
  isOpen: boolean;
  onClose: () => void;
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

function ObraDetailsContent({ obra, onClose }: { obra: Obra; onClose: () => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold leading-tight">{obra.nome}</h2>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{obra.municipio}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(obra.status)} text-white border-none`}>
              {getStatusLabel(obra.status)}
            </Badge>
            <Badge variant="outline">{obra.tipo}</Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {/* Progress Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Progresso da Obra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Execução: {obra.porcentagemExecucao}%</span>
              <span>{formatCurrency(obra.valorExecutado)} de {formatCurrency(obra.valor)}</span>
            </div>
            <Progress value={obra.porcentagemExecucao} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Cronograma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Data de Início:</span>
              <p className="text-sm">{formatDate(obra.dataInicio)}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Previsão de Término:</span>
              <p className="text-sm">{formatDate(obra.previsaoTermino)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Responsáveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Empresa:</span>
              <p className="text-sm">{obra.empresaResponsavel}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Secretaria:</span>
              <p className="text-sm">{obra.secretariaResponsavel}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informações Financeiras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Valor Total:</span>
              <p className="text-lg font-semibold">{formatCurrency(obra.valor)}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Valor Executado:</span>
              <p className="text-lg font-semibold text-blue-600">{formatCurrency(obra.valorExecutado)}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Saldo Restante:</span>
              <p className="text-lg font-semibold text-orange-600">
                {formatCurrency(obra.valor - obra.valorExecutado)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photos Gallery */}
      {obra.fotos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4" />
              Galeria de Fotos ({obra.fotos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {obra.fotos.map((foto, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img 
                    src={foto} 
                    alt={`Foto ${index + 1} da obra`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos ({obra.documentos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {obra.documentos.map((doc, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{doc.nome}</p>
                    <p className="text-xs text-muted-foreground">{doc.tipo}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ObraDetails({ obra, isOpen, onClose }: ObraDetailsProps) {
  const isMobile = useIsMobile();

  if (!obra) return null;

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalhes da Obra</DialogTitle>
          </DialogHeader>
          <ObraDetailsContent obra={obra} onClose={onClose} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-[600px] sm:max-w-[600px] overflow-y-auto"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Detalhes da Obra</SheetTitle>
        </SheetHeader>
        <ObraDetailsContent obra={obra} onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}