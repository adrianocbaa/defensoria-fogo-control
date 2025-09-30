import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  telefone_membro_coordenador: string | null;
  telefone_coordenador_substituto: string | null;
  telefone_auxiliar_coordenador: string | null;
}

export default function TeletrabalhoEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nucleo, setNucleo] = useState<NucleoTeletrabalho | null>(null);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('18:00');
  const [diasSemana, setDiasSemana] = useState<string[]>(['segunda', 'terca', 'quarta', 'quinta', 'sexta']);
  const [formData, setFormData] = useState({
    membro_coordenador: '',
    coordenador_substituto: '',
    auxiliar_coordenador: '',
    telefone_membro_coordenador: '',
    telefone_coordenador_substituto: '',
    telefone_auxiliar_coordenador: '',
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
        .select('id, nome, horario_atendimento, membro_coordenador, coordenador_substituto, auxiliar_coordenador, telefone_membro_coordenador, telefone_coordenador_substituto, telefone_auxiliar_coordenador')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setNucleo(data);
        
        // Parse horario_atendimento if exists
        if (data.horario_atendimento) {
          const horarioMatch = data.horario_atendimento.match(/das (\d{1,2}):?(\d{2})?\s*às?\s*(\d{1,2}):?(\d{2})?/i);
          if (horarioMatch) {
            const [, hInicio, mInicio, hFim, mFim] = horarioMatch;
            setHoraInicio(`${hInicio.padStart(2, '0')}:${(mInicio || '00').padStart(2, '0')}`);
            setHoraFim(`${hFim.padStart(2, '0')}:${(mFim || '00').padStart(2, '0')}`);
          }
          
          // Parse dias da semana
          const diasParsed: string[] = [];
          if (data.horario_atendimento.toLowerCase().includes('segunda')) diasParsed.push('segunda');
          if (data.horario_atendimento.toLowerCase().includes('terça') || data.horario_atendimento.toLowerCase().includes('terca')) diasParsed.push('terca');
          if (data.horario_atendimento.toLowerCase().includes('quarta')) diasParsed.push('quarta');
          if (data.horario_atendimento.toLowerCase().includes('quinta')) diasParsed.push('quinta');
          if (data.horario_atendimento.toLowerCase().includes('sexta')) diasParsed.push('sexta');
          if (data.horario_atendimento.toLowerCase().includes('sábado') || data.horario_atendimento.toLowerCase().includes('sabado')) diasParsed.push('sabado');
          if (data.horario_atendimento.toLowerCase().includes('domingo')) diasParsed.push('domingo');
          
          if (diasParsed.length > 0) setDiasSemana(diasParsed);
        }
        
        setFormData({
          membro_coordenador: data.membro_coordenador || '',
          coordenador_substituto: data.coordenador_substituto || '',
          auxiliar_coordenador: data.auxiliar_coordenador || '',
          telefone_membro_coordenador: data.telefone_membro_coordenador || '',
          telefone_coordenador_substituto: data.telefone_coordenador_substituto || '',
          telefone_auxiliar_coordenador: data.telefone_auxiliar_coordenador || '',
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

  const formatDiasSemana = () => {
    if (diasSemana.length === 0) return '';
    
    const diasOrdenados = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const diasSelecionados = diasOrdenados.filter(d => diasSemana.includes(d));
    
    const nomeDias: Record<string, string> = {
      'segunda': 'Segunda',
      'terca': 'Terça',
      'quarta': 'Quarta',
      'quinta': 'Quinta',
      'sexta': 'Sexta',
      'sabado': 'Sábado',
      'domingo': 'Domingo'
    };
    
    if (diasSelecionados.length === 5 && 
        diasSelecionados.includes('segunda') && 
        diasSelecionados.includes('terca') &&
        diasSelecionados.includes('quarta') &&
        diasSelecionados.includes('quinta') &&
        diasSelecionados.includes('sexta')) {
      return 'Segunda a Sexta';
    }
    
    return diasSelecionados.map(d => nomeDias[d]).join(', ');
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const horarioAtendimento = diasSemana.length > 0 
        ? `${formatDiasSemana()}, das ${horaInicio} às ${horaFim}`
        : null;

      const { error } = await supabase
        .from('nucleos_central')
        .update({
          horario_atendimento: horarioAtendimento,
          membro_coordenador: formData.membro_coordenador || null,
          coordenador_substituto: formData.coordenador_substituto || null,
          auxiliar_coordenador: formData.auxiliar_coordenador || null,
          telefone_membro_coordenador: formData.telefone_membro_coordenador || null,
          telefone_coordenador_substituto: formData.telefone_coordenador_substituto || null,
          telefone_auxiliar_coordenador: formData.telefone_auxiliar_coordenador || null,
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
            title="Editar Informações Detalhadas do Núcleo"
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
                Informações Detalhadas do Núcleo
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* Horário de Atendimento */}
              <div className="space-y-4 border rounded-lg p-4">
                <Label className="text-base font-semibold">Horário de Atendimento ao Público</Label>
                
                {/* Horários */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hora_inicio">Horário de Início</Label>
                    <Select value={horaInicio} onValueChange={setHoraInicio}>
                      <SelectTrigger id="hora_inicio">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                              {hour}:00
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="hora_fim">Horário de Término</Label>
                    <Select value={horaFim} onValueChange={setHoraFim}>
                      <SelectTrigger id="hora_fim">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                              {hour}:00
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dias da Semana */}
                <div className="space-y-3">
                  <Label>Dias de Atendimento</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: 'segunda', label: 'Segunda-feira' },
                      { value: 'terca', label: 'Terça-feira' },
                      { value: 'quarta', label: 'Quarta-feira' },
                      { value: 'quinta', label: 'Quinta-feira' },
                      { value: 'sexta', label: 'Sexta-feira' },
                      { value: 'sabado', label: 'Sábado' },
                      { value: 'domingo', label: 'Domingo' },
                    ].map((dia) => (
                      <div key={dia.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={dia.value}
                          checked={diasSemana.includes(dia.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setDiasSemana([...diasSemana, dia.value]);
                            } else {
                              setDiasSemana(diasSemana.filter(d => d !== dia.value));
                            }
                          }}
                        />
                        <Label
                          htmlFor={dia.value}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {dia.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {diasSemana.length > 0 && (
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">Pré-visualização:</p>
                    <p className="font-medium">
                      {formatDiasSemana()}, das {horaInicio} às {horaFim}
                    </p>
                  </div>
                )}
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
                <Label htmlFor="telefone_membro_coordenador">Telefone do Membro Coordenador</Label>
                <Input
                  id="telefone_membro_coordenador"
                  value={formData.telefone_membro_coordenador}
                  onChange={(e) => setFormData({ ...formData, telefone_membro_coordenador: e.target.value })}
                  placeholder="(00) 00000-0000"
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
                <Label htmlFor="telefone_coordenador_substituto">Telefone do Coordenador Substituto</Label>
                <Input
                  id="telefone_coordenador_substituto"
                  value={formData.telefone_coordenador_substituto}
                  onChange={(e) => setFormData({ ...formData, telefone_coordenador_substituto: e.target.value })}
                  placeholder="(00) 00000-0000"
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

              <div>
                <Label htmlFor="telefone_auxiliar_coordenador">Telefone do Auxiliar do Coordenador</Label>
                <Input
                  id="telefone_auxiliar_coordenador"
                  value={formData.telefone_auxiliar_coordenador}
                  onChange={(e) => setFormData({ ...formData, telefone_auxiliar_coordenador: e.target.value })}
                  placeholder="(00) 00000-0000"
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
