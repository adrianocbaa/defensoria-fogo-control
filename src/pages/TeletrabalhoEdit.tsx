import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MapPin, Laptop } from 'lucide-react';

interface NucleoBasico {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  telefones: string | null;
  email: string | null;
}

export default function TeletrabalhoEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [nucleoBasico, setNucleoBasico] = useState<NucleoBasico | null>(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar informações básicas (somente leitura)
      const { data: basicData, error: basicError } = await supabase
        .from('nucleos_central')
        .select('id, nome, endereco, cidade, telefones, email')
        .eq('id', id)
        .maybeSingle();

      if (basicError) throw basicError;
      setNucleoBasico(basicData);
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
          <p>Núcleo não encontrado</p>
        </div>
      </SimpleHeader>
    );
  }

  return (
    <SimpleHeader>
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 lg:px-8 py-4 lg:py-6">
          <PageHeader
            title="Gerenciar Teletrabalho"
            subtitle={nucleoBasico.nome}
            actions={
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/teletrabalho/${id}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            }
          />
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Informações Básicas - Somente Leitura */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Informações Básicas (Somente Leitura)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Núcleo</Label>
                  <Input value={nucleoBasico.nome} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={nucleoBasico.cidade} disabled className="bg-muted" />
                </div>
                <div className="md:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={nucleoBasico.endereco} disabled className="bg-muted" />
                </div>
                {nucleoBasico.telefones && (
                  <div>
                    <Label>Telefones</Label>
                    <Input value={nucleoBasico.telefones} disabled className="bg-muted" />
                  </div>
                )}
                {nucleoBasico.email && (
                  <div>
                    <Label>E-mail</Label>
                    <Input value={nucleoBasico.email} disabled className="bg-muted" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Estas informações não podem ser editadas neste módulo. Para alterá-las, use a página de edição central do núcleo.
              </p>
            </CardContent>
          </Card>

          {/* Informação sobre registros de Teletrabalho */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Laptop className="h-5 w-5" />
                Gerenciar Registros de Teletrabalho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Os registros de teletrabalho (procedimentos, portarias, datas) são gerenciados na página de detalhes do núcleo.
                Esta página permite visualizar as informações básicas que são compartilhadas entre todos os módulos.
              </p>
              <Button onClick={() => navigate(`/teletrabalho/${id}`)}>
                Ver Registros de Teletrabalho
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SimpleHeader>
  );
}
