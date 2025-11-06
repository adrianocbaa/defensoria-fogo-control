import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, CheckCircle2, XCircle, Calendar, AlertTriangle } from 'lucide-react';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

interface ChecklistItem {
  id: string;
  descricao_atividade: string;
  situacao: string;
  observacoes?: string;
  data_atualizacao: string;
  ordem: number;
  is_custom: boolean;
}

interface ObraData {
  id: string;
  nome: string;
  municipio: string;
  n_contrato: string;
  previsao_termino: string;
  data_prevista_inauguracao?: string;
  status_inauguracao: string;
  tem_placa_inauguracao: boolean;
  sem_previsao_inauguracao: boolean;
  obra_bloqueada: boolean;
}

export default function ObraChecklistDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [obra, setObra] = useState<ObraData | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [novaAtividade, setNovaAtividade] = useState('');
  const [showInauguracaoDialog, setShowInauguracaoDialog] = useState(false);
  const [inauguracaoAction, setInauguracaoAction] = useState<'inaugurada' | 'nao_inaugurada' | null>(null);

  // Fetch obra e checklist
  useEffect(() => {
    fetchObraData();
  }, [id]);

  const fetchObraData = async () => {
    try {
      setLoading(true);
      
      // Buscar dados da obra
      const { data: obraData, error: obraError } = await supabase
        .from('obras')
        .select('*')
        .eq('id', id)
        .single();

      if (obraError) throw obraError;
      setObra(obraData as any as ObraData);

      // Buscar checklist
      const checklistResponse = await (supabase as any)
        .from('obra_checklist_items')
        .select('*')
        .eq('obra_id', id)
        .order('ordem', { ascending: true });

      if (checklistResponse.error) throw checklistResponse.error;
      setChecklistItems((checklistResponse.data || []) as ChecklistItem[]);

      // Verificar se a data de inauguração chegou
      if ((obraData as any).data_prevista_inauguracao && (obraData as any).status_inauguracao === 'aguardando') {
        const dataInauguracao = new Date((obraData as any).data_prevista_inauguracao);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        dataInauguracao.setHours(0, 0, 0, 0);

        if (dataInauguracao <= hoje) {
          setShowInauguracaoDialog(true);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados da obra');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar item do checklist
  const handleUpdateItem = async (itemId: string, field: string, value: any) => {
    if (obra?.obra_bloqueada) {
      toast.error('Esta obra está bloqueada para edição');
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('obra_checklist_items')
        .update({
          [field]: value,
          data_atualizacao: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      setChecklistItems(items =>
        items.map(item =>
          item.id === itemId
            ? { ...item, [field]: value, data_atualizacao: new Date().toISOString() }
            : item
        )
      );

      toast.success('Item atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item');
    }
  };

  // Adicionar nova atividade
  const handleAddAtividade = async () => {
    if (!novaAtividade.trim()) {
      toast.error('Digite uma descrição para a atividade');
      return;
    }

    if (obra?.obra_bloqueada) {
      toast.error('Esta obra está bloqueada para edição');
      return;
    }

    try {
      const novaOrdem = Math.max(...checklistItems.map(i => i.ordem), 0) + 1;
      
      const { data, error } = await supabase
        .from('obra_checklist_items' as any)
        .insert({
          obra_id: id,
          descricao_atividade: novaAtividade,
          situacao: 'nao_iniciado',
          ordem: novaOrdem,
          is_custom: true
        } as any)
        .select()
        .single();

      if (error) throw error;

      setChecklistItems([...checklistItems, data as any as ChecklistItem]);
      setNovaAtividade('');
      toast.success('Atividade adicionada com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar atividade:', error);
      toast.error('Erro ao adicionar atividade');
    }
  };

  // Atualizar data de inauguração
  const handleUpdateDataInauguracao = async (novaData: string) => {
    if (obra?.obra_bloqueada) {
      toast.error('Esta obra está bloqueada para edição');
      return;
    }

    try {
      const { error } = await supabase
        .from('obras')
        .update({ data_prevista_inauguracao: novaData } as any)
        .eq('id', id);

      if (error) throw error;

      setObra(prev => prev ? { ...prev, data_prevista_inauguracao: novaData } : null);
      toast.success('Data de inauguração atualizada');
    } catch (error) {
      console.error('Erro ao atualizar data:', error);
      toast.error('Erro ao atualizar data de inauguração');
    }
  };

  // Atualizar campo "Tem placa de inauguração"
  const handleUpdateTemPlaca = async (value: boolean) => {
    if (obra?.obra_bloqueada) {
      toast.error('Esta obra está bloqueada para edição');
      return;
    }

    try {
      const { error } = await supabase
        .from('obras')
        .update({ tem_placa_inauguracao: value } as any)
        .eq('id', id);

      if (error) throw error;

      setObra(prev => prev ? { ...prev, tem_placa_inauguracao: value } : null);
      toast.success('Informação atualizada');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar informação');
    }
  };

  // Processar inauguração
  const handleProcessInauguracao = async () => {
    try {
      setSaving(true);

      if (inauguracaoAction === 'inaugurada') {
        // Marcar obra como inaugurada e bloquear
        const { error } = await supabase
          .from('obras')
          .update({
            status_inauguracao: 'inaugurada',
            obra_bloqueada: true
          } as any)
          .eq('id', id);

        if (error) throw error;

        toast.success('Obra marcada como inaugurada e bloqueada para edição');
        navigate('/admin/obras/checklist');
      } else if (inauguracaoAction === 'nao_inaugurada') {
        // Pedir nova data ou marcar sem previsão
        const { error } = await supabase
          .from('obras')
          .update({
            status_inauguracao: 'aguardando',
            data_prevista_inauguracao: null,
            sem_previsao_inauguracao: true
          } as any)
          .eq('id', id);

        if (error) throw error;

        toast.info('Obra marcada como sem previsão de inauguração');
        fetchObraData();
      }

      setShowInauguracaoDialog(false);
      setInauguracaoAction(null);
    } catch (error) {
      console.error('Erro ao processar inauguração:', error);
      toast.error('Erro ao processar inauguração');
    } finally {
      setSaving(false);
    }
  };

  // Calcular progresso
  const calcularProgresso = () => {
    if (checklistItems.length === 0) return 0;
    const concluidos = checklistItems.filter(item => item.situacao === 'concluído').length;
    return (concluidos / checklistItems.length) * 100;
  };

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case 'concluído': return 'bg-green-500';
      case 'em_andamento': return 'bg-blue-500';
      case 'parado': return 'bg-yellow-500';
      case 'nao_iniciado': return 'bg-gray-400';
      case 'nao_se_aplica': return 'bg-purple-500';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <SimpleHeader>
        <div className="min-h-screen bg-background">
          <PageHeader title="Carregando..." subtitle="Aguarde..." />
          <div className="container mx-auto px-4 py-6">
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SimpleHeader>
    );
  }

  if (!obra) {
    return (
      <SimpleHeader>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Obra não encontrada</p>
            <Button onClick={() => navigate('/admin/obras/checklist')} className="mt-4">
              Voltar
            </Button>
          </div>
        </div>
      </SimpleHeader>
    );
  }

  const progresso = calcularProgresso();
  const obraBloqueada = obra.obra_bloqueada;

  return (
    <SimpleHeader>
      <div className="min-h-screen bg-background">
        <PageHeader
          title={obra.nome}
          subtitle={`${obra.municipio} • ${obra.n_contrato}`}
          actions={
            <Button variant="outline" onClick={() => navigate('/admin/obras/checklist')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          }
        />

        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Alerta se obra bloqueada */}
          {obraBloqueada && (
            <Card className="border-green-500 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Obra Inaugurada</p>
                    <p className="text-sm text-green-700">Esta obra foi inaugurada e está bloqueada para edição (modo somente leitura).</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card de informações e data de inauguração */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Inauguração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data-inauguracao">Data Prevista para Inauguração</Label>
                  <Input
                    id="data-inauguracao"
                    type="date"
                    value={obra.data_prevista_inauguracao || ''}
                    onChange={(e) => handleUpdateDataInauguracao(e.target.value)}
                    disabled={obraBloqueada}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="data-termino">Data de Término do Contrato</Label>
                  <Input
                    id="data-termino"
                    type="text"
                    value={formatDate(obra.previsao_termino)}
                    disabled
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tem placa de inauguração?</Label>
                <RadioGroup
                  value={obra.tem_placa_inauguracao ? 'sim' : 'nao'}
                  onValueChange={(value) => handleUpdateTemPlaca(value === 'sim')}
                  disabled={obraBloqueada}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="placa-sim" />
                    <Label htmlFor="placa-sim" className="cursor-pointer">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="placa-nao" />
                    <Label htmlFor="placa-nao" className="cursor-pointer">Não</Label>
                  </div>
                </RadioGroup>
              </div>

              {!obra.tem_placa_inauguracao && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sem-previsao"
                    checked={obra.sem_previsao_inauguracao}
                    disabled={obraBloqueada}
                    onCheckedChange={(checked) => {
                      supabase
                        .from('obras')
                        .update({ sem_previsao_inauguracao: !!checked } as any)
                        .eq('id', id)
                        .then(() => {
                          setObra(prev => prev ? { ...prev, sem_previsao_inauguracao: !!checked } : null);
                          toast.success('Atualizado');
                        });
                    }}
                  />
                  <Label htmlFor="sem-previsao" className="cursor-pointer">
                    Sem previsão de inauguração
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progresso do checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Progresso Geral do Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conclusão:</span>
                <span className="text-2xl font-bold">{progresso.toFixed(0)}%</span>
              </div>
              <Progress value={progresso} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {checklistItems.filter(i => i.situacao === 'concluído').length} de {checklistItems.length} atividades concluídas
              </p>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Checklist de Atividades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {checklistItems.map((item, index) => (
                <div key={item.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{item.descricao_atividade}</span>
                          {item.is_custom && (
                            <Badge variant="secondary" className="text-xs">Personalizada</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Última atualização: {new Date(item.data_atualizacao).toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Select
                        value={item.situacao}
                        onValueChange={(value) => handleUpdateItem(item.id, 'situacao', value)}
                        disabled={obraBloqueada}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nao_iniciado">Não iniciado</SelectItem>
                          <SelectItem value="parado">Parado</SelectItem>
                          <SelectItem value="em_andamento">Em andamento</SelectItem>
                          <SelectItem value="concluído">Concluído</SelectItem>
                          <SelectItem value="nao_se_aplica">Não se aplica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      placeholder="Observações..."
                      value={item.observacoes || ''}
                      onChange={(e) => handleUpdateItem(item.id, 'observacoes', e.target.value)}
                      disabled={obraBloqueada}
                      rows={2}
                    />
                  </div>
                </div>
              ))}

              {!obraBloqueada && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-2">
                    <Label>Adicionar Nova Atividade</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Descrição da atividade..."
                        value={novaAtividade}
                        onChange={(e) => setNovaAtividade(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddAtividade()}
                      />
                      <Button onClick={handleAddAtividade}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dialog de inauguração */}
        <AlertDialog open={showInauguracaoDialog} onOpenChange={setShowInauguracaoDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Data de Inauguração Atingida
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>A data prevista para inauguração desta obra foi atingida. Como você deseja proceder?</p>
                <RadioGroup value={inauguracaoAction || ''} onValueChange={(v) => setInauguracaoAction(v as any)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="inaugurada" id="inaugurada" />
                    <Label htmlFor="inaugurada" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium">Inaugurada</p>
                          <p className="text-xs text-muted-foreground">A obra será bloqueada para edição</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="nao_inaugurada" id="nao-inaugurada" />
                    <Label htmlFor="nao-inaugurada" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-orange-600" />
                        <div>
                          <p className="font-medium">Não Inaugurada</p>
                          <p className="text-xs text-muted-foreground">Informe uma nova data ou marque como sem previsão</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowInauguracaoDialog(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleProcessInauguracao}
                disabled={!inauguracaoAction || saving}
              >
                {saving ? 'Processando...' : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SimpleHeader>
  );
}