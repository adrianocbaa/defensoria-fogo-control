import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Calendar,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  Target,
  Edit,
  Trash2,
  Download,
  Eye
} from 'lucide-react';
import { format, isBefore, isAfter, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NucleoBasico {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  telefones: string | null;
  email: string | null;
}

interface FireExtinguisher {
  id: string;
  type: string;
  expiration_date: string;
  hydrostatic_test: string | null;
  location: string;
  capacity: string | null;
  status: string;
  support_type: string | null;
  has_vertical_signage: boolean;
}

interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploaded_at: string;
  size: number | null;
}

interface Hydrant {
  id: string;
  location: string;
  status: string;
  hose_expiration_date: string | null;
}

interface DadosPreventivos {
  fire_department_license_valid_until: string | null;
  fire_department_license_document_url: string | null;
}

const extinguisherTypeLabels: Record<string, string> = {
  'H2O': 'Água',
  'PQS': 'Pó Químico Seco',
  'CO2': 'Gás Carbônico',
  'ABC': 'Multipropósito'
};

export default function PreventivosDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [nucleoBasico, setNucleoBasico] = useState<NucleoBasico | null>(null);
  const [dadosPreventivos, setDadosPreventivos] = useState<DadosPreventivos | null>(null);
  const [extinguishers, setExtinguishers] = useState<FireExtinguisher[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [hydrants, setHydrants] = useState<Hydrant[]>([]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar informações básicas do núcleo
      const { data: basicData, error: basicError } = await supabase
        .from('nucleos_central')
        .select('id, nome, endereco, cidade, telefones, email')
        .eq('id', id)
        .maybeSingle();

      if (basicError) throw basicError;
      setNucleoBasico(basicData);

      // Buscar dados específicos de preventivos (nuclei)
      const { data: prevData, error: prevError } = await supabase
        .from('nuclei')
        .select('fire_department_license_valid_until, fire_department_license_document_url')
        .eq('id', id)
        .maybeSingle();

      if (prevError && prevError.code !== 'PGRST116') throw prevError;
      setDadosPreventivos(prevData);

      // Buscar extintores
      const { data: extData, error: extError } = await supabase
        .from('fire_extinguishers')
        .select('*')
        .eq('nucleus_id', id)
        .order('location');

      if (extError) throw extError;
      setExtinguishers(extData || []);

      // Buscar documentos
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('nucleus_id', id)
        .order('uploaded_at', { ascending: false });

      if (docError) throw docError;
      setDocuments(docData || []);

      // Buscar hidrantes
      const { data: hydData, error: hydError } = await supabase
        .from('hydrants')
        .select('*')
        .eq('nucleus_id', id);

      if (hydError) throw hydError;
      setHydrants(hydData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!nucleoBasico) return;

    if (window.confirm(`Tem certeza que deseja excluir o núcleo "${nucleoBasico.nome}"? Esta ação não pode ser desfeita.`)) {
      try {
        const { error } = await supabase
          .from('nucleos_central')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Núcleo excluído com sucesso',
        });
        navigate('/preventivos');
      } catch (error) {
        console.error('Error deleting:', error);
        toast({
          title: 'Erro ao excluir núcleo',
          variant: 'destructive',
        });
      }
    }
  };

  const getExtinguisherStatus = (expirationDate: string) => {
    const now = new Date();
    const expDate = new Date(expirationDate);
    const twoMonthsFromNow = addDays(now, 60);

    if (isBefore(expDate, now)) {
      return 'expired';
    } else if (isBefore(expDate, twoMonthsFromNow)) {
      return 'expiring-soon';
    }
    return 'valid';
  };

  const getLicenseStatus = () => {
    if (!dadosPreventivos?.fire_department_license_valid_until) return null;
    
    const now = new Date();
    const validUntil = new Date(dadosPreventivos.fire_department_license_valid_until);
    const twoMonthsFromNow = addDays(now, 60);

    if (isBefore(validUntil, now)) {
      return 'expired';
    } else if (isBefore(validUntil, twoMonthsFromNow)) {
      return 'expiring-soon';
    }
    return 'valid';
  };

  if (loading) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-6 lg:px-8 py-8">
          <p>Carregando...</p>
        </div>
      </SimpleHeader>
    );
  }

  if (!nucleoBasico) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Núcleo não encontrado</h2>
            <Button onClick={() => navigate('/preventivos')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </SimpleHeader>
    );
  }

  const licenseStatus = getLicenseStatus();

  return (
    <SimpleHeader>
      <div className="container mx-auto px-6 lg:px-8 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/preventivos')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {nucleoBasico.nome}
              </h1>
              <p className="text-sm text-muted-foreground">
                {nucleoBasico.cidade} - {nucleoBasico.endereco}
              </p>
            </div>
          </div>
          
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/preventivos/${id}/editar`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda */}
          <div className="space-y-6">
            {/* Informações de Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações de Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nucleoBasico.telefones && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{nucleoBasico.telefones}</span>
                  </div>
                )}
                {nucleoBasico.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{nucleoBasico.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alvará do Corpo de Bombeiros */}
            {dadosPreventivos?.fire_department_license_valid_until && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Alvará do Corpo de Bombeiros
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Válido até: {format(new Date(dadosPreventivos.fire_department_license_valid_until), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                  
                  {licenseStatus && (
                    <div className={`flex items-center gap-2 text-xs p-2 rounded border ${
                      licenseStatus === 'expired'
                        ? 'bg-danger/10 text-danger border-danger/20' 
                        : licenseStatus === 'expiring-soon'
                          ? 'bg-warning/10 text-warning border-warning/20'
                          : 'bg-success/10 text-success border-success/20'
                    }`}>
                      {licenseStatus === 'expired' ? (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          <span>Alvará vencido</span>
                        </>
                      ) : licenseStatus === 'expiring-soon' ? (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>Alvará vencendo em breve</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-3 w-3" />
                          <span>Alvará válido</span>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna Direita */}
          <div className="lg:col-span-2 space-y-6">
            {/* Extintores de Incêndio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Extintores de Incêndio ({extinguishers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {extinguishers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum extintor cadastrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {extinguishers.map((extinguisher) => {
                      const status = getExtinguisherStatus(extinguisher.expiration_date);
                      
                      return (
                        <div 
                          key={extinguisher.id}
                          className={`p-4 rounded-lg border ${
                            status === 'expired'
                              ? 'border-danger/20 bg-danger/5' 
                              : status === 'expiring-soon'
                                ? 'border-warning/20 bg-warning/5'
                                : 'border-border bg-card'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium">
                                  {extinguisherTypeLabels[extinguisher.type] || extinguisher.type}
                                </span>
                                {extinguisher.capacity && (
                                  <span className="text-sm text-muted-foreground">
                                    {extinguisher.capacity}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium mb-1">
                                {extinguisher.location}
                              </p>
                              {extinguisher.capacity && (
                                <p className="text-xs text-muted-foreground">
                                  Capacidade: {extinguisher.capacity}
                                </p>
                              )}
                            </div>
                            <Badge 
                              className={
                                status === 'expired'
                                  ? 'bg-danger text-white hover:bg-danger/90' 
                                  : status === 'expiring-soon'
                                    ? 'bg-warning text-white hover:bg-warning/90'
                                    : 'bg-success text-white hover:bg-success/90'
                              }
                            >
                              {status === 'expired' ? (
                                <>
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Vencido
                                </>
                              ) : status === 'expiring-soon' ? (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Vencendo
                                </>
                              ) : (
                                <>
                                  <Shield className="h-3 w-3 mr-1" />
                                  Válido
                                </>
                              )}
                            </Badge>
                          </div>
                          
                          <Separator className="my-2" />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Vencimento: {format(new Date(extinguisher.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </div>
                            {extinguisher.hydrostatic_test && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Teste Hidrostático: {format(new Date(extinguisher.hydrostatic_test), 'dd/MM/yyyy', { locale: ptBR })}
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum documento cadastrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((document) => {
                      const typeLabels: Record<string, string> = {
                        'project': 'Projeto',
                        'fire-license': 'Alvará',
                        'photos': 'Fotos',
                        'report': 'Relatório'
                      };

                      return (
                        <div 
                          key={document.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-2">{document.name}</p>
                            <div className="flex items-center gap-4">
                              <Badge variant="outline" className="text-xs">
                                {typeLabels[document.type] || document.type}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                Enviado em: {format(new Date(document.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                              {document.size && (
                                <p className="text-xs text-muted-foreground">
                                  {(document.size / 1024).toFixed(1)} KB
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(document.url, '_blank')}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Visualizar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const link = window.document.createElement('a');
                                link.href = document.url;
                                link.download = document.name;
                                link.target = '_blank';
                                window.document.body.appendChild(link);
                                link.click();
                                window.document.body.removeChild(link);
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SimpleHeader>
  );
}
