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
import { ArrowLeft, MapPin, Save } from 'lucide-react';

interface NucleoBasico {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  telefones: string | null;
  email: string | null;
}

interface DadosPreventivos {
  telefone: string;
  email: string;
  horario_atendimento: string;
  membro_coordenador: string;
  coordenador_substituto: string;
  auxiliar_coordenador: string;
  uf: string;
}

export default function PreventivosEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nucleoBasico, setNucleoBasico] = useState<NucleoBasico | null>(null);
  const [formData, setFormData] = useState<DadosPreventivos>({
    telefone: '',
    email: '',
    horario_atendimento: '',
    membro_coordenador: '',
    coordenador_substituto: '',
    auxiliar_coordenador: '',
    uf: ''
  });

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

      // Buscar informações específicas de preventivos (editáveis)
      const { data: prevData, error: prevError } = await supabase
        .from('nuclei')
        .select('telefone, email, horario_atendimento, membro_coordenador, coordenador_substituto, auxiliar_coordenador, uf')
        .eq('id', id)
        .maybeSingle();

      if (prevError && prevError.code !== 'PGRST116') throw prevError;

      if (prevData) {
        setFormData({
          telefone: prevData.telefone || '',
          email: prevData.email || '',
          horario_atendimento: prevData.horario_atendimento || '',
          membro_coordenador: prevData.membro_coordenador || '',
          coordenador_substituto: prevData.coordenador_substituto || '',
          auxiliar_coordenador: prevData.auxiliar_coordenador || '',
          uf: prevData.uf || ''
        });
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);

      // Verificar se já existe registro em nuclei
      const { data: existing } = await supabase
        .from('nuclei')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (existing) {
        // Atualizar
        const { error } = await supabase
          .from('nuclei')
          .update(formData)
          .eq('id', id);

        if (error) throw error;
      } else {
        // Inserir novo registro com dados básicos do nucleos_central
        const { error } = await supabase
          .from('nuclei')
          .insert({
            id: id,
            name: nucleoBasico?.nome,
            city: nucleoBasico?.cidade,
            address: nucleoBasico?.endereco,
            ...formData
          });

        if (error) throw error;
      }

      toast({
        title: 'Dados salvos com sucesso',
        description: 'As informações de preventivos foram atualizadas.',
      });

      navigate(`/preventivos/${id}`);
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: 'Erro ao salvar',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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
            title="Editar Dados de Preventivos"
            subtitle={nucleoBasico.nome}
            actions={
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/preventivos/${id}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            }
          />
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
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
              </div>
              <p className="text-sm text-muted-foreground">
                Estas informações não podem ser editadas neste módulo. Para alterá-las, use a página de edição central do núcleo.
              </p>
            </CardContent>
          </Card>

          {/* Dados Específicos de Preventivos - Editáveis */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Específicos de Preventivos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="uf">UF</Label>
                  <Input
                    id="uf"
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label htmlFor="horario_atendimento">Horário de Atendimento</Label>
                  <Input
                    id="horario_atendimento"
                    value={formData.horario_atendimento}
                    onChange={(e) => setFormData({ ...formData, horario_atendimento: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="membro_coordenador">Membro Coordenador</Label>
                  <Input
                    id="membro_coordenador"
                    value={formData.membro_coordenador}
                    onChange={(e) => setFormData({ ...formData, membro_coordenador: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="coordenador_substituto">Coordenador Substituto</Label>
                  <Input
                    id="coordenador_substituto"
                    value={formData.coordenador_substituto}
                    onChange={(e) => setFormData({ ...formData, coordenador_substituto: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="auxiliar_coordenador">Auxiliar do Coordenador</Label>
                  <Input
                    id="auxiliar_coordenador"
                    value={formData.auxiliar_coordenador}
                    onChange={(e) => setFormData({ ...formData, auxiliar_coordenador: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/preventivos/${id}`)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </SimpleHeader>
  );
}
