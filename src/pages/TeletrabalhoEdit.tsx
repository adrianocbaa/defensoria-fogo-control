import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, Save } from 'lucide-react';

interface NucleoTeletrabalho {
  id: string;
  nome: string;
  horario_atendimento: string | null;
  membro_coordenador: string | null;
  coordenador_substituto: string | null;
  auxiliar_coordenador: string | null;
}

export default function TeletrabalhoEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nucleo, setNucleo] = useState<NucleoTeletrabalho | null>(null);
  const [formData, setFormData] = useState({
    horario_atendimento: '',
    membro_coordenador: '',
    coordenador_substituto: '',
    auxiliar_coordenador: '',
  });

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('nucleos_central')
        .select('id, nome, horario_atendimento, membro_coordenador, coordenador_substituto, auxiliar_coordenador')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setNucleo(data);
        setFormData({
          horario_atendimento: data.horario_atendimento || '',
          membro_coordenador: data.membro_coordenador || '',
          coordenador_substituto: data.coordenador_substituto || '',
          auxiliar_coordenador: data.auxiliar_coordenador || '',
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

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('nucleos_central')
        .update({
          horario_atendimento: formData.horario_atendimento || null,
          membro_coordenador: formData.membro_coordenador || null,
          coordenador_substituto: formData.coordenador_substituto || null,
          auxiliar_coordenador: formData.auxiliar_coordenador || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Dados salvos com sucesso',
      });

      navigate(`/teletrabalho/${id}`);
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: 'Erro ao salvar dados',
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

  if (!nucleo) {
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
            title="Editar Informações de Teletrabalho"
            subtitle={nucleo.nome}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Informações de Teletrabalho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="horario_atendimento">Horário de Atendimento ao Público</Label>
                <Textarea
                  id="horario_atendimento"
                  value={formData.horario_atendimento}
                  onChange={(e) => setFormData({ ...formData, horario_atendimento: e.target.value })}
                  placeholder="Ex: Segunda a Sexta, das 8h às 18h"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="membro_coordenador">Membro Coordenador</Label>
                <Input
                  id="membro_coordenador"
                  value={formData.membro_coordenador}
                  onChange={(e) => setFormData({ ...formData, membro_coordenador: e.target.value })}
                  placeholder="Nome do membro coordenador"
                />
              </div>

              <div>
                <Label htmlFor="coordenador_substituto">Coordenador Substituto</Label>
                <Input
                  id="coordenador_substituto"
                  value={formData.coordenador_substituto}
                  onChange={(e) => setFormData({ ...formData, coordenador_substituto: e.target.value })}
                  placeholder="Nome do coordenador substituto"
                />
              </div>

              <div>
                <Label htmlFor="auxiliar_coordenador">Auxiliar do Coordenador</Label>
                <Input
                  id="auxiliar_coordenador"
                  value={formData.auxiliar_coordenador}
                  onChange={(e) => setFormData({ ...formData, auxiliar_coordenador: e.target.value })}
                  placeholder="Nome do auxiliar do coordenador"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="outline" onClick={() => navigate(`/teletrabalho/${id}`)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleHeader>
  );
}
