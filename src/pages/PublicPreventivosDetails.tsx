import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicHeader } from '@/components/PublicHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Download,
  Eye
} from 'lucide-react';
import { format, isBefore, addDays, startOfDay, parseISO } from 'date-fns';
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

export default function PublicPreventivosDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

      // Buscar informações básicas do núcleo da tabela nuclei
      const { data: basicData, error: basicError } = await supabase
        .from('nuclei')
        .select('id, name, address, city, contact_phone, contact_email')
        .eq('id', id)
        .maybeSingle();

      if (basicError) throw basicError;
      
      if (basicData) {
        setNucleoBasico({
          id: basicData.id,
          nome: basicData.name,
          endereco: basicData.address,
          cidade: basicData.city,
          telefones: basicData.contact_phone,
          email: basicData.contact_email
        });
      }

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
    } finally {
      setLoading(false);
    }
  };

  const getExtinguisherStatus = (expirationDate: string) => {
    const today = startOfDay(new Date());
    const expDate = startOfDay(parseISO(expirationDate));
    const twoMonthsFromNow = addDays(today, 60);

    if (isBefore(expDate, today)) {
      return 'expired';
    } else if (isBefore(expDate, twoMonthsFromNow)) {
      return 'expiring-soon';
    }
    return 'valid';
  };

  const getLicenseStatus = () => {
    if (!dadosPreventivos?.fire_department_license_valid_until) return null;
    
    const today = startOfDay(new Date());
    const validUntil = startOfDay(parseISO(dadosPreventivos.fire_department_license_valid_until));
    const twoMonthsFromNow = addDays(today, 60);

    if (isBefore(validUntil, today)) {
      return 'expired';
    } else if (isBefore(validUntil, twoMonthsFromNow)) {
      return 'expiring-soon';
    }
    return 'valid';
  };

  if (loading) {
    return (
      <PublicHeader>
        <div className="container mx-auto px-6 lg:px-8 py-8">
          <p>Carregando...</p>
        </div>
      </PublicHeader>
    );
  }

  if (!nucleoBasico) {
    return (
      <PublicHeader>
        <div className="container mx-auto px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Núcleo não encontrado</h2>
            <Button onClick={() => navigate('/public/preventivos')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </PublicHeader>
    );
  }

  const licenseStatus = getLicenseStatus();

  return (
    <PublicHeader>
      <div className="container mx-auto px-6 lg:px-8 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/public/preventivos')}
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
                        ? 'bg-red-50 text-red-700 border-red-200' 
                        : licenseStatus === 'expiring-soon'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-green-50 text-green-700 border-green-200'
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

            {/* Hidrantes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hidrantes ({hydrants.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {hydrants.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum hidrante cadastrado
                  </p>
                ) : (
                  <div className="space-y-2">
                    {hydrants.map((hydrant) => (
                      <div key={hydrant.id} className="p-3 border rounded-lg">
                        <p className="text-sm font-medium">{hydrant.location}</p>
                        <p className="text-xs text-muted-foreground">
                          Status: {hydrant.status === 'verified' ? 'Verificado' : 'Não verificado'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                              ? 'border-red-200 bg-red-50' 
                              : status === 'expiring-soon'
                                ? 'border-yellow-200 bg-yellow-50'
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
                            </div>
                            <Badge 
                              className={
                                status === 'expired'
                                  ? 'bg-red-600 text-white hover:bg-red-700' 
                                  : status === 'expiring-soon'
                                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    : 'bg-green-600 text-white hover:bg-green-700'
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
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{document.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{typeLabels[document.type] || document.type}</span>
                                {document.size && (
                                  <>
                                    <span>•</span>
                                    <span>{(document.size / 1024).toFixed(0)} KB</span>
                                  </>
                                )}
                                <span>•</span>
                                <span>{format(new Date(document.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a href={document.url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a href={document.url} download>
                                <Download className="h-4 w-4" />
                              </a>
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
    </PublicHeader>
  );
}