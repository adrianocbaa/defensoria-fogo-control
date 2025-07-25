import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, MapPin, User, FileText, Edit, Clock } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Travel } from '@/types/travel';
import { useUserRole } from '@/hooks/useUserRole';

interface ViewTravelModalProps {
  isOpen: boolean;
  onClose: () => void;
  travel: Travel;
  onEdit: () => void;
}

export function ViewTravelModal({ isOpen, onClose, travel, onEdit }: ViewTravelModalProps) {
  const { canEdit } = useUserRole();
  
  const dataIda = parseISO(travel.data_ida);
  const dataVolta = parseISO(travel.data_volta);
  const duracaoViagem = differenceInDays(dataVolta, dataIda) + 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Detalhes da Viagem
            </div>
            {canEdit && (
              <Button size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações básicas */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Servidor</p>
                    <p className="font-medium">{travel.servidor}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Destino</p>
                    <p className="font-medium">{travel.destino}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datas */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Data de Ida</p>
                      <p className="font-medium">
                        {format(dataIda, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Data de Volta</p>
                      <p className="font-medium">
                        {format(dataVolta, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Duração</p>
                    <Badge variant="secondary">
                      {duracaoViagem} {duracaoViagem === 1 ? 'dia' : 'dias'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Motivo */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Motivo da Viagem</p>
                </div>
                <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded-md">
                  {travel.motivo}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data de criação */}
          {travel.created_at && (
            <div className="text-xs text-muted-foreground text-center">
              Criado em {format(parseISO(travel.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}