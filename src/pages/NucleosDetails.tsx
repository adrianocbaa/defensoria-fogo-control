import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  UserRound,
  Laptop,
  Edit,
  Trash2,
  Download,
  Eye,
  Plus,
  Calendar as CalendarIcon,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useFileUpload } from '@/hooks/useFileUpload';

interface Teletrabalho {
  id: string;
  procedimento: string;
  data_inicio: string;
  data_fim: string | null;
  portaria: string | null;
  portaria_file: string | null;
  motivo: string | null;
}

interface Nucleus {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  horario_atendimento: string | null;
  membro_coordenador: string | null;
  coordenador_substituto: string | null;
  auxiliar_coordenador: string | null;
}

export default function NucleosDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useUserRole();
  const { toast } = useToast();
  const [nucleus, setNucleus] = useState<Nucleus | null>(null);
  const [teletrabalhos, setTeletrabalhos] = useState<Teletrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTeletrabalho, setEditingTeletrabalho] = useState<Teletrabalho | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    procedimento: '',
    data_inicio: '',
    data_fim: '',
    portaria: '',
    motivo: ''
  });
  const [portariaFile, setPortariaFile] = useState<File | null>(null);
  const [dataInicioOpen, setDataInicioOpen] = useState(false);
  const [dataFimOpen, setDataFimOpen] = useState(false);
  const { uploadFile, uploading: uploadingFile } = useFileUpload();

  useEffect(() => {
    if (id) {
      fetchNucleus();
      fetchTeletrabalhos();
    }
  }, [id]);

  const fetchNucleus = async () => {
    try {
      // Buscar apenas dados básicos de nucleos_central (sem dados de preventivos)
      const { data, error } = await supabase
        .from('nucleos_central')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setNucleus({
          id: data.id,
          nome: data.nome,
          endereco: data.endereco,
          cidade: data.cidade,
          uf: null, // nucleos_central não tem UF
          telefone: data.telefones,
          email: data.email,
          horario_atendimento: null, // nucleos_central não tem horário
          membro_coordenador: null, // nucleos_central não tem coordenador
          coordenador_substituto: null,
          auxiliar_coordenador: null
        });
      }
    } catch (error) {
      console.error('Error fetching nucleus:', error);
      toast({
        title: 'Erro ao carregar núcleo',
        description: 'Não foi possível carregar os dados do núcleo.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeletrabalhos = async () => {
    try {
      const { data, error } = await supabase
        .from('nucleo_teletrabalho')
        .select('*')
        .eq('nucleo_id', id)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      setTeletrabalhos(data || []);
    } catch (error) {
      console.error('Error fetching teletrabalhos:', error);
    }
  };

  const getTeletrabalhoStatus = (inicio: string, fim: string | null) => {
    const hoje = new Date();
    const dataInicio = new Date(inicio);
    const dataFim = fim ? new Date(fim) : null;

    if (hoje < dataInicio) {
      return { label: 'Futuro', variant: 'secondary' as const };
    } else if (!dataFim || hoje <= dataFim) {
      return { label: 'Ativo', variant: 'default' as const };
    } else {
      return { label: 'Encerrado', variant: 'outline' as const };
    }
  };

  const handleAddTeletrabalho = async () => {
    if (!formData.procedimento || !formData.data_inicio) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha procedimento e data de início.',
        variant: 'destructive'
      });
      return;
    }

    try {
      let portariaFilePath: string | null = null;
      if (portariaFile) {
        const result = await uploadFile(portariaFile, 'teletrabalho-portarias');
        if (typeof result === 'object' && result.url) {
          portariaFilePath = result.url;
        }
      }

      const { error } = await supabase
        .from('nucleo_teletrabalho')
        .insert({
          nucleo_id: id,
          procedimento: formData.procedimento,
          data_inicio: formData.data_inicio,
          data_fim: formData.data_fim || null,
          portaria: formData.portaria || null,
          portaria_file: portariaFilePath,
          motivo: formData.motivo || null
        });

      if (error) throw error;

      toast({
        title: 'Teletrabalho adicionado',
        description: 'O registro foi criado com sucesso.'
      });

      setIsAddModalOpen(false);
      resetForm();
      fetchTeletrabalhos();
    } catch (error) {
      console.error('Error adding teletrabalho:', error);
      toast({
        title: 'Erro ao adicionar',
        description: 'Não foi possível adicionar o registro.',
        variant: 'destructive'
      });
    }
  };

  const handleEditTeletrabalho = async () => {
    if (!editingTeletrabalho) return;

    try {
      let portariaFilePath: string | null = editingTeletrabalho.portaria_file;
      if (portariaFile) {
        const result = await uploadFile(portariaFile, 'teletrabalho-portarias');
        if (typeof result === 'object' && result.url) {
          portariaFilePath = result.url;
        }
      }

      const { error } = await supabase
        .from('nucleo_teletrabalho')
        .update({
          procedimento: formData.procedimento,
          data_inicio: formData.data_inicio,
          data_fim: formData.data_fim || null,
          portaria: formData.portaria || null,
          portaria_file: portariaFilePath,
          motivo: formData.motivo || null
        })
        .eq('id', editingTeletrabalho.id);

      if (error) throw error;

      toast({
        title: 'Teletrabalho atualizado',
        description: 'O registro foi atualizado com sucesso.'
      });

      setIsEditModalOpen(false);
      setEditingTeletrabalho(null);
      resetForm();
      fetchTeletrabalhos();
    } catch (error) {
      console.error('Error updating teletrabalho:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o registro.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTeletrabalho = async (teletrabalhoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      const { error } = await supabase
        .from('nucleo_teletrabalho')
        .delete()
        .eq('id', teletrabalhoId);

      if (error) throw error;

      toast({
        title: 'Teletrabalho excluído',
        description: 'O registro foi removido com sucesso.'
      });

      fetchTeletrabalhos();
    } catch (error) {
      console.error('Error deleting teletrabalho:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o registro.',
        variant: 'destructive'
      });
    }
  };

  const openEditModal = (teletrabalho: Teletrabalho) => {
    setEditingTeletrabalho(teletrabalho);
    setFormData({
      procedimento: teletrabalho.procedimento,
      data_inicio: teletrabalho.data_inicio,
      data_fim: teletrabalho.data_fim || '',
      portaria: teletrabalho.portaria || '',
      motivo: teletrabalho.motivo || ''
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      procedimento: '',
      data_inicio: '',
      data_fim: '',
      portaria: '',
      motivo: ''
    });
    setPortariaFile(null);
  };

  const handleDeleteNucleus = async () => {
    if (!confirm(`Tem certeza que deseja excluir o núcleo "${nucleus?.nome}"? Esta ação não pode ser desfeita.`)) return;

    try {
      const { error } = await supabase
        .from('nuclei')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Núcleo excluído',
        description: 'O núcleo foi removido com sucesso.'
      });

      navigate('/nucleos');
    } catch (error) {
      console.error('Error deleting nucleus:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o núcleo.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!nucleus) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Núcleo não encontrado</h1>
            <p className="text-muted-foreground mb-4">O núcleo solicitado não foi encontrado.</p>
            <Button onClick={() => navigate('/nucleos')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header Amarelo */}
        <div className="bg-yellow-500 text-yellow-900 rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/nucleos')}
              className="text-yellow-900 hover:bg-yellow-400"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex gap-2">
              {canEdit && (
                <>
                  <Button 
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/nucleos/${id}/editar`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteNucleus}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </>
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">{nucleus.nome}</h1>
          <div className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            <span>{nucleus.endereco}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bloco Vermelho - Informações sobre o Núcleo */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-lg text-red-900">Informações sobre o Núcleo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{nucleus.telefone || <span className="text-muted-foreground">—</span>}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{nucleus.email || <span className="text-muted-foreground">—</span>}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{nucleus.horario_atendimento || <span className="text-muted-foreground">—</span>}</span>
              </div>
            </CardContent>
          </Card>

          {/* Bloco Azul - Coordenação do Núcleo */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
                <UserRound className="h-5 w-5" />
                Coordenação do Núcleo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Membro Coordenador:</p>
                <p className="text-sm font-medium">{nucleus.membro_coordenador || <span className="text-muted-foreground">—</span>}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Coordenador Substituto:</p>
                <p className="text-sm font-medium">{nucleus.coordenador_substituto || <span className="text-muted-foreground">—</span>}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Auxiliar do Coordenador:</p>
                <p className="text-sm font-medium">{nucleus.auxiliar_coordenador || <span className="text-muted-foreground">—</span>}</p>
              </div>
            </CardContent>
          </Card>

          {/* Bloco Rosa - Teletrabalho */}
          <Card className="lg:col-span-1 border-l-4 border-l-pink-500">
            <CardHeader className="bg-pink-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-pink-900 flex items-center gap-2">
                  <Laptop className="h-5 w-5" />
                  Teletrabalho ({teletrabalhos.length})
                </CardTitle>
                {canEdit && (
                  <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Adicionar Teletrabalho</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="procedimento">Procedimento *</Label>
                          <Input
                            id="procedimento"
                            value={formData.procedimento}
                            onChange={(e) => setFormData({ ...formData, procedimento: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Data de Início *</Label>
                            <Popover open={dataInicioOpen} onOpenChange={setDataInicioOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {formData.data_inicio ? format(new Date(formData.data_inicio), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={formData.data_inicio ? new Date(formData.data_inicio) : undefined}
                                  onSelect={(date) => {
                                    setFormData({ ...formData, data_inicio: date ? format(date, 'yyyy-MM-dd') : '' });
                                    setDataInicioOpen(false);
                                  }}
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label>Data Fim</Label>
                            <Popover open={dataFimOpen} onOpenChange={setDataFimOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {formData.data_fim ? format(new Date(formData.data_fim), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={formData.data_fim ? new Date(formData.data_fim) : undefined}
                                  onSelect={(date) => {
                                    setFormData({ ...formData, data_fim: date ? format(date, 'yyyy-MM-dd') : '' });
                                    setDataFimOpen(false);
                                  }}
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="portaria">Portaria</Label>
                          <Input
                            id="portaria"
                            value={formData.portaria}
                            onChange={(e) => setFormData({ ...formData, portaria: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="portaria-file">Arquivo da Portaria (PDF)</Label>
                          <Input
                            id="portaria-file"
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => setPortariaFile(e.target.files?.[0] || null)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="motivo">Motivo</Label>
                          <Textarea
                            id="motivo"
                            value={formData.motivo}
                            onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => { setIsAddModalOpen(false); resetForm(); }}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddTeletrabalho} disabled={uploadingFile}>
                          {uploadingFile ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {teletrabalhos.length === 0 ? (
                <div className="text-center py-8">
                  <Laptop className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">Nenhum registro de teletrabalho</p>
                  {canEdit && (
                    <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Teletrabalho
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {teletrabalhos.map((tele) => {
                    const status = getTeletrabalhoStatus(tele.data_inicio, tele.data_fim);
                    return (
                      <div key={tele.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{tele.procedimento}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={status.variant} className="text-xs">
                                {status.label}
                              </Badge>
                              {tele.portaria && (
                                <span className="text-xs text-muted-foreground">
                                  Portaria: {tele.portaria}
                                </span>
                              )}
                            </div>
                          </div>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditModal(tele)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteTeletrabalho(tele.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>
                              Início: {format(new Date(tele.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          </div>
                          {tele.data_fim && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              <span>
                                Fim: {format(new Date(tele.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </div>
                          )}
                          {tele.motivo && (
                            <p className="mt-2">{tele.motivo}</p>
                          )}
                        </div>
                        {tele.portaria_file && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`https://mmumfgxngzaivvyqfbed.supabase.co/storage/v1/object/public/teletrabalho-portarias/${tele.portaria_file}`, '_blank')}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Visualizar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `https://mmumfgxngzaivvyqfbed.supabase.co/storage/v1/object/public/teletrabalho-portarias/${tele.portaria_file}`;
                                link.download = `portaria-${tele.portaria}.pdf`;
                                link.click();
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Teletrabalho</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-procedimento">Procedimento *</Label>
                <Input
                  id="edit-procedimento"
                  value={formData.procedimento}
                  onChange={(e) => setFormData({ ...formData, procedimento: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Início *</Label>
                  <Popover open={dataInicioOpen} onOpenChange={setDataInicioOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.data_inicio ? format(new Date(formData.data_inicio), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.data_inicio ? new Date(formData.data_inicio) : undefined}
                        onSelect={(date) => {
                          setFormData({ ...formData, data_inicio: date ? format(date, 'yyyy-MM-dd') : '' });
                          setDataInicioOpen(false);
                        }}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Popover open={dataFimOpen} onOpenChange={setDataFimOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.data_fim ? format(new Date(formData.data_fim), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.data_fim ? new Date(formData.data_fim) : undefined}
                        onSelect={(date) => {
                          setFormData({ ...formData, data_fim: date ? format(date, 'yyyy-MM-dd') : '' });
                          setDataFimOpen(false);
                        }}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-portaria">Portaria</Label>
                <Input
                  id="edit-portaria"
                  value={formData.portaria}
                  onChange={(e) => setFormData({ ...formData, portaria: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-portaria-file">Arquivo da Portaria (PDF)</Label>
                <Input
                  id="edit-portaria-file"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPortariaFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <Label htmlFor="edit-motivo">Motivo</Label>
                <Textarea
                  id="edit-motivo"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setEditingTeletrabalho(null); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleEditTeletrabalho} disabled={uploadingFile}>
                {uploadingFile ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
