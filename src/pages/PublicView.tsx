import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail, FileText, Shield, Droplets } from 'lucide-react';

// Interface para dados públicos vindos do banco
interface PublicNucleus {
  id: string;
  name: string;
  city: string;
  address: string;
  contact_phone: string | null;
  contact_email: string | null;
  fire_department_license_valid_until: string | null;
  fireExtinguishers?: any[];
  hydrants?: any[];
  documents?: any[];
}

export default function PublicView() {
  const [nuclei, setNuclei] = useState<PublicNucleus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicNuclei();
  }, []);

  const fetchPublicNuclei = async () => {
    try {
      setLoading(true);
      
      // Show message that public access has been restricted for security
      console.info('Public access to sensitive infrastructure data has been restricted for security reasons');
      
      // For now, show empty state as public access to nuclei data has been removed for security
      setNuclei([]);
    } catch (error) {
      console.error('Erro ao carregar dados públicos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header Público */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/lovable-uploads/b1b86eb2-3439-4770-9572-77fb9dd247a3.png" 
                alt="Defensoria Pública Logo" 
                className="h-16 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold">Sistema de Segurança Contra Incêndio</h1>
                <p className="text-green-100">Visualização Pública - Defensoria Pública</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {nuclei.length} {nuclei.length === 1 ? 'Núcleo' : 'Núcleos'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-4 py-8">
        {nuclei.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Restrito por Segurança</h3>
            <p className="text-gray-500">
              O acesso público aos dados de infraestrutura foi restringido por motivos de segurança. 
              Para acessar essas informações, entre em contato com a administração.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {nuclei.map((nucleus) => (
              <Card key={nucleus.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    {nucleus.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Informações Básicas */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{nucleus.address}, {nucleus.city}</span>
                    </div>
                    {nucleus.contact_phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{nucleus.contact_phone}</span>
                      </div>
                    )}
                    {nucleus.contact_email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{nucleus.contact_email}</span>
                      </div>
                    )}
                  </div>

                  {/* Equipamentos */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Shield className="h-4 w-4 text-red-500" />
                        <span className="text-2xl font-bold text-red-600">
                          {nucleus.fireExtinguishers?.length || 0}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Extintores</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="text-2xl font-bold text-blue-600">
                          {nucleus.hydrants?.length || 0}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Hidrantes</p>
                    </div>
                  </div>

                  {/* Documentos */}
                  {nucleus.documents && nucleus.documents.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4" />
                        <span>{nucleus.documents.length} documento(s) anexado(s)</span>
                      </div>
                    </div>
                  )}

                  {/* Status da Licença */}
                  {nucleus.fire_department_license_valid_until && (
                    <div className="pt-2 border-t">
                      <Badge 
                        variant={new Date(nucleus.fire_department_license_valid_until) > new Date() ? "default" : "destructive"}
                        className="text-xs"
                      >
                        Licença: {new Date(nucleus.fire_department_license_valid_until).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>Sistema de Gestão de Segurança Contra Incêndio - Defensoria Pública</p>
          <p className="mt-1">Visualização pública de dados cadastrais</p>
        </div>
      </footer>
    </div>
  );
}