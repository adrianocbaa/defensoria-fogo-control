import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Save, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChecklistItem {
  id: string;
  descricao_atividade: string;
  situacao: string;
  observacoes?: string;
  data_atualizacao: string;
  ordem: number;
  is_custom: boolean;
  parent_id?: string;
  has_subtasks?: boolean;
  subtasks?: ChecklistItem[];
}

interface ObraChecklist {
  id: string;
  nome: string;
  municipio: string;
  tipo: string;
  n_contrato?: string;
  previsao_termino?: string;
  data_prevista_inauguracao?: string;
  status_inauguracao?: string;
  tem_placa_inauguracao?: boolean;
  obra_bloqueada?: boolean;
  porcentagem_execucao?: number;
}

interface ViewObraChecklistModalProps {
  obra: ObraChecklist | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ViewObraChecklistModal({ obra, open, onOpenChange, onUpdate }: ViewObraChecklistModalProps) {
  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen && onUpdate) {
      onUpdate();
    }
  };
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingObservacao, setEditingObservacao] = useState<string | null>(null);
  const [tempObservacao, setTempObservacao] = useState('');
  const [dataInauguracao, setDataInauguracao] = useState('');
  const [temPlaca, setTemPlaca] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (obra && open) {
      fetchChecklistItems();
      setDataInauguracao(obra.data_prevista_inauguracao || '');
      setTemPlaca(obra.tem_placa_inauguracao || false);
    }
  }, [obra, open]);

  const fetchChecklistItems = async () => {
    if (!obra) return;
    
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('obra_checklist_items')
        .select('*')
        .eq('obra_id', obra.id)
        .order('ordem', { ascending: true });

      if (error) throw error;
      
      const items = (data || []) as ChecklistItem[];
      
      // Organize items in hierarchy
      const parentItems = items.filter(item => !item.parent_id);
      const childItems = items.filter(item => item.parent_id);
      
      const hierarchicalItems = parentItems.map(parent => ({
        ...parent,
        subtasks: childItems.filter(child => child.parent_id === parent.id)
      }));
      
      // Check if "Comunicação Visual" exists and create subtasks if needed
      const comunicacaoVisual = hierarchicalItems.find(
        item => item.descricao_atividade === 'Comunicação Visual'
      );
      
      if (comunicacaoVisual && (!comunicacaoVisual.subtasks || comunicacaoVisual.subtasks.length === 0)) {
        await createDefaultSubtasks(comunicacaoVisual.id);
        // Refetch to get the new subtasks
        return fetchChecklistItems();
      }
      
      setChecklistItems(hierarchicalItems);
    } catch (error) {
      console.error('Erro ao buscar checklist:', error);
      toast.error('Erro ao carregar checklist');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSubtasks = async (parentId: string) => {
    const subtasks = [
      { descricao: 'Fachada', ordem: 1 },
      { descricao: 'Placas internas', ordem: 2 },
      { descricao: 'Placa inauguração', ordem: 3 },
      { descricao: 'Adesivos', ordem: 4 },
      { descricao: 'Quadros', ordem: 5 }
    ];

    try {
      for (const subtask of subtasks) {
        await (supabase as any)
          .from('obra_checklist_items')
          .insert({
            obra_id: obra!.id,
            parent_id: parentId,
            descricao_atividade: subtask.descricao,
            situacao: 'nao_iniciado',
            ordem: subtask.ordem,
            is_custom: false
          });
      }

      // Update parent to mark it has subtasks
      await (supabase as any)
        .from('obra_checklist_items')
        .update({ has_subtasks: true })
        .eq('id', parentId);
    } catch (error) {
      console.error('Erro ao criar subtarefas:', error);
    }
  };

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

      toast.success('Item atualizado');
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item');
    }
  };

  const handleSaveObservacao = async (itemId: string) => {
    await handleUpdateItem(itemId, 'observacoes', tempObservacao);
    setEditingObservacao(null);
    setTempObservacao('');
  };

  const handleUpdateDataInauguracao = async () => {
    if (obra?.obra_bloqueada) {
      toast.error('Esta obra está bloqueada para edição');
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('obras')
        .update({ data_prevista_inauguracao: dataInauguracao })
        .eq('id', obra.id);

      if (error) throw error;
      toast.success('Data atualizada');
    } catch (error) {
      console.error('Erro ao atualizar data:', error);
      toast.error('Erro ao atualizar data');
    }
  };

  const handleUpdateTemPlaca = async (value: boolean) => {
    if (obra?.obra_bloqueada) {
      toast.error('Esta obra está bloqueada para edição');
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('obras')
        .update({ tem_placa_inauguracao: value })
        .eq('id', obra.id);

      if (error) throw error;
      setTemPlaca(value);
      toast.success('Atualizado');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const calcularProgresso = () => {
    // Flatten all items including subtasks
    const allItems: ChecklistItem[] = [];
    checklistItems.forEach(item => {
      if (item.has_subtasks && item.subtasks && item.subtasks.length > 0) {
        // Only count subtasks for items with subtasks
        allItems.push(...item.subtasks);
      } else {
        // Count the item itself if it doesn't have subtasks
        allItems.push(item);
      }
    });
    
    const itensAplicaveis = allItems.filter(item => item.situacao !== 'nao_se_aplica');
    if (itensAplicaveis.length === 0) return 0;
    const concluidos = itensAplicaveis.filter(item => item.situacao === 'concluido').length;
    return (concluidos / itensAplicaveis.length) * 100;
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case 'concluido': return 'text-green-600';
      case 'em_andamento': return 'text-blue-600';
      case 'parado': return 'text-yellow-600';
      case 'nao_iniciado': return 'text-gray-600';
      case 'nao_se_aplica': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getSituacaoLabel = (situacao: string) => {
    switch (situacao) {
      case 'concluido': return 'Concluído';
      case 'em_andamento': return 'Em Andamento';
      case 'parado': return 'Parado';
      case 'nao_iniciado': return 'Não Iniciado';
      case 'nao_se_aplica': return 'Não se Aplica';
      default: return situacao;
    }
  };

  if (!obra) return null;

  const progresso = calcularProgresso();
  const obraBloqueada = obra.obra_bloqueada || false;
  
  // Count all items including subtasks
  const allItems: ChecklistItem[] = [];
  checklistItems.forEach(item => {
    if (item.has_subtasks && item.subtasks && item.subtasks.length > 0) {
      allItems.push(...item.subtasks);
    } else {
      allItems.push(item);
    }
  });
  const itensAplicaveis = allItems.filter(i => i.situacao !== 'nao_se_aplica');
  const concluidos = allItems.filter(i => i.situacao === 'concluido').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {obra.nome}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Informações Básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{obra.municipio}</span>
            </div>
            <div>
              <Badge variant="outline">{obra.tipo}</Badge>
            </div>
          </div>

          {obraBloqueada && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-900 font-medium">Obra Inaugurada (Somente Leitura)</span>
            </div>
          )}

          <Separator />

          {/* Data de Inauguração */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Data de Inauguração</h3>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dataInauguracao}
                onChange={(e) => setDataInauguracao(e.target.value)}
                disabled={obraBloqueada}
                className="flex-1"
              />
              {dataInauguracao !== obra.data_prevista_inauguracao && !obraBloqueada && (
                <Button size="sm" onClick={handleUpdateDataInauguracao}>
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Tem placa de inauguração?</Label>
              <RadioGroup
                value={temPlaca ? 'sim' : 'nao'}
                onValueChange={(value) => handleUpdateTemPlaca(value === 'sim')}
                disabled={obraBloqueada}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="placa-sim" />
                  <Label htmlFor="placa-sim" className="cursor-pointer text-sm">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="placa-nao" />
                  <Label htmlFor="placa-nao" className="cursor-pointer text-sm">Não</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <Separator />

          {/* Progresso do Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Progresso do Checklist</h3>
              <span className="text-lg font-bold">{progresso.toFixed(0)}%</span>
            </div>
            <Progress value={progresso} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {concluidos} de {itensAplicaveis.length} atividades concluídas
            </p>
          </div>

          <Separator />

          {/* Checklist Items */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Atividades do Checklist</h3>
            
            {loading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {checklistItems.map((item) => (
                  <div key={item.id} className="border rounded-lg overflow-hidden">
                    {/* Parent Item */}
                    <div className="p-3 space-y-2 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          {item.has_subtasks && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpand(item.id)}
                            >
                              {expandedItems.has(item.id) ? '▼' : '▶'}
                            </Button>
                          )}
                          <div>
                            <p className="text-sm font-medium">{item.descricao_atividade}</p>
                            {item.is_custom && (
                              <Badge variant="secondary" className="text-xs mt-1">Personalizada</Badge>
                            )}
                          </div>
                        </div>
                        {!item.has_subtasks && (
                          <Select
                            value={item.situacao}
                            onValueChange={(value) => handleUpdateItem(item.id, 'situacao', value)}
                            disabled={obraBloqueada}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
                              <SelectItem value="em_andamento">Em Andamento</SelectItem>
                              <SelectItem value="parado">Parado</SelectItem>
                              <SelectItem value="concluido">Concluído</SelectItem>
                              <SelectItem value="nao_se_aplica">Não se Aplica</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {!item.has_subtasks && (
                        <>
                          <div className={`flex items-center gap-2 text-xs ${getSituacaoColor(item.situacao)}`}>
                            {item.situacao === 'concluido' && <CheckCircle2 className="h-3 w-3" />}
                            {item.situacao === 'em_andamento' && <Clock className="h-3 w-3" />}
                            {item.situacao === 'parado' && <AlertCircle className="h-3 w-3" />}
                            {item.situacao === 'nao_iniciado' && <XCircle className="h-3 w-3" />}
                            <span>{getSituacaoLabel(item.situacao)}</span>
                          </div>

                          {editingObservacao === item.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={tempObservacao}
                                onChange={(e) => setTempObservacao(e.target.value)}
                                placeholder="Adicionar observação..."
                                className="min-h-[60px] text-sm"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleSaveObservacao(item.id)}>
                                  Salvar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setEditingObservacao(null);
                                    setTempObservacao('');
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {item.observacoes && (
                                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                  {item.observacoes}
                                </p>
                              )}
                              {!obraBloqueada && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setEditingObservacao(item.id);
                                    setTempObservacao(item.observacoes || '');
                                  }}
                                >
                                  {item.observacoes ? 'Editar observação' : 'Adicionar observação'}
                                </Button>
                              )}
                            </>
                          )}

                          <p className="text-[10px] text-muted-foreground">
                            Atualizado: {format(new Date(item.data_atualizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Subtasks */}
                    {item.has_subtasks && expandedItems.has(item.id) && item.subtasks && (
                      <div className="bg-muted/30 border-t">
                        {item.subtasks.map((subtask) => (
                          <div key={subtask.id} className="p-3 pl-10 space-y-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm">{subtask.descricao_atividade}</p>
                              </div>
                              <Select
                                value={subtask.situacao}
                                onValueChange={(value) => handleUpdateItem(subtask.id, 'situacao', value)}
                                disabled={obraBloqueada}
                              >
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
                                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                  <SelectItem value="parado">Parado</SelectItem>
                                  <SelectItem value="concluido">Concluído</SelectItem>
                                  <SelectItem value="nao_se_aplica">Não se Aplica</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className={`flex items-center gap-2 text-xs ${getSituacaoColor(subtask.situacao)}`}>
                              {subtask.situacao === 'concluido' && <CheckCircle2 className="h-3 w-3" />}
                              {subtask.situacao === 'em_andamento' && <Clock className="h-3 w-3" />}
                              {subtask.situacao === 'parado' && <AlertCircle className="h-3 w-3" />}
                              {subtask.situacao === 'nao_iniciado' && <XCircle className="h-3 w-3" />}
                              <span>{getSituacaoLabel(subtask.situacao)}</span>
                            </div>

                            {editingObservacao === subtask.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={tempObservacao}
                                  onChange={(e) => setTempObservacao(e.target.value)}
                                  placeholder="Adicionar observação..."
                                  className="min-h-[60px] text-sm"
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleSaveObservacao(subtask.id)}>
                                    Salvar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => {
                                      setEditingObservacao(null);
                                      setTempObservacao('');
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {subtask.observacoes && (
                                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                    {subtask.observacoes}
                                  </p>
                                )}
                                {!obraBloqueada && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      setEditingObservacao(subtask.id);
                                      setTempObservacao(subtask.observacoes || '');
                                    }}
                                  >
                                    {subtask.observacoes ? 'Editar observação' : 'Adicionar observação'}
                                  </Button>
                                )}
                              </>
                            )}

                            <p className="text-[10px] text-muted-foreground">
                              Atualizado: {format(new Date(subtask.data_atualizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
