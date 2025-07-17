import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NucleusEditModal } from '@/components/NucleusEditModal';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Droplets, 
  Calendar,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  Target,
  Edit
} from 'lucide-react';
import { useNuclei } from '@/contexts/NucleiContext';
import { ExtinguisherType } from '@/types/nucleus';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const extinguisherTypeLabels: Record<ExtinguisherType, string> = {
  'H2O': 'Água',
  'PQS': 'Pó Químico Seco',
  'CO2': 'Gás Carbônico',
  'ABC': 'Multipropósito'
};

export default function NucleusDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getNucleusById, updateNucleus } = useNuclei();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const nucleus = getNucleusById(id || '');
  
  if (!nucleus) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Núcleo não encontrado</h1>
            <p className="text-muted-foreground mb-4">O núcleo solicitado não foi encontrado.</p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const isLicenseExpired = nucleus.fireDepartmentLicense?.validUntil 
    ? new Date(nucleus.fireDepartmentLicense.validUntil) < new Date()
    : false;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{nucleus.name}</h1>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <MapPin className="h-3 w-3" />
              <span>{nucleus.city} - {nucleus.address}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {nucleus.hydrants.length > 0 && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                <Droplets className="h-3 w-3 mr-1" />
                Hidrante ({nucleus.hydrants.length})
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Gerais */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações de Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nucleus.contact?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{nucleus.contact.phone}</span>
                  </div>
                )}
                {nucleus.contact?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{nucleus.contact.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status do Alvará */}
            {nucleus.fireDepartmentLicense && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Alvará do Corpo de Bombeiros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Válido até: {format(new Date(nucleus.fireDepartmentLicense.validUntil), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 text-xs p-2 rounded border ${
                    isLicenseExpired 
                      ? 'bg-danger/10 text-danger border-danger/20' 
                      : 'bg-success/10 text-success border-success/20'
                  }`}>
                    {isLicenseExpired ? (
                      <>
                        <AlertTriangle className="h-3 w-3" />
                        <span>Alvará vencido</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-3 w-3" />
                        <span>Alvará válido</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Extintores */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Extintores de Incêndio ({nucleus.fireExtinguishers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nucleus.fireExtinguishers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum extintor cadastrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {nucleus.fireExtinguishers.map((extinguisher) => {
                      const isExpired = extinguisher.status === 'expired';
                      const isExpiringSoon = extinguisher.status === 'expiring-soon';
                      
                      return (
                        <div 
                          key={extinguisher.id}
                          className={`p-4 rounded-lg border ${
                            isExpired 
                              ? 'border-danger/20 bg-danger/5' 
                              : isExpiringSoon 
                                ? 'border-warning/20 bg-warning/5'
                                : 'border-border bg-card'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {extinguisherTypeLabels[extinguisher.type]}
                                </Badge>
                                {extinguisher.capacity && (
                                  <span className="text-xs text-muted-foreground">
                                    {extinguisher.capacity}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium">
                                {extinguisher.location}
                              </p>
                              {extinguisher.serialNumber && (
                                <p className="text-xs text-muted-foreground">
                                  Série: {extinguisher.serialNumber}
                                </p>
                              )}
                            </div>
                            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                              isExpired 
                                ? 'bg-danger text-danger-foreground' 
                                : isExpiringSoon 
                                  ? 'bg-warning text-warning-foreground'
                                  : 'bg-success text-success-foreground'
                            }`}>
                              {isExpired ? (
                                <AlertTriangle className="h-3 w-3" />
                              ) : isExpiringSoon ? (
                                <Clock className="h-3 w-3" />
                              ) : (
                                <Shield className="h-3 w-3" />
                              )}
                              <span>
                                {isExpired 
                                  ? 'Vencido' 
                                  : isExpiringSoon 
                                    ? 'Vencendo' 
                                    : 'Válido'
                                }
                              </span>
                            </div>
                          </div>
                          
                          <Separator className="my-2" />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Vencimento: {format(new Date(extinguisher.expirationDate), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </div>
                            {extinguisher.lastInspection && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Última inspeção: {format(new Date(extinguisher.lastInspection), 'dd/MM/yyyy', { locale: ptBR })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documentos */}
            {nucleus.documents.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documentos ({nucleus.documents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {nucleus.documents.map((document) => (
                      <div 
                        key={document.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div>
                          <p className="text-sm font-medium">{document.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Enviado em: {format(new Date(document.uploadedAt), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {document.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Modal de Edição */}
        <NucleusEditModal
          nucleus={nucleus}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSave={updateNucleus}
        />
      </div>
    </Layout>
  );
}