import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Calculator, FileText, Plus, Trash2, Upload, Eye, EyeOff, Settings, Zap } from 'lucide-react';
import { toast } from 'sonner';
import ImportarPlanilha from '@/components/ImportarPlanilha';
import * as LoadingStates from '@/components/LoadingStates';

interface Obra {
  id: string;
  nome: string;
  municipio: string;
  valor_total: number;
  valor_aditivado?: number;
  valor_executado?: number;
}

interface Item {
  id: number;
  item: string;
  codigo: string;
  banco: string;
  descricao: string;
  und: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  aditivo: { qnt: number; percentual: number; total: number };
  totalContrato: number;
  importado: boolean;
  nivel: number;
  ehAdministracaoLocal: boolean;
}

interface Medicao {
  id: number;
  nome: string;
  dados: { [itemId: number]: { qnt: number; percentual: number; total: number } };
}

export function Medicao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados do sistema de medição
  const [items, setItems] = useState<Item[]>([
    {
      id: 1,
      item: '1.1.1',
      codigo: '90778',
      banco: 'SINAPI',
      descricao: 'ENGENHEIRO CIVIL DE OBRA PLENO COM ENCARGOS COMPLEMENTARES',
      und: 'H',
      quantidade: 1150,
      valorUnitario: 125.68,
      valorTotal: 144533.61,
      aditivo: { qnt: 0, percentual: 0, total: 0 },
      totalContrato: 144533.61,
      importado: false,
      nivel: 3,
      ehAdministracaoLocal: true
    },
    {
      id: 2,
      item: '1.1.2',
      codigo: '93572',
      banco: 'SINAPI',
      descricao: 'ENCARREGADO GERAL DE OBRAS COM ENCARGOS COMPLEMENTARES',
      und: 'MES',
      quantidade: 10,
      valorUnitario: 5360.45,
      valorTotal: 53604.47,
      aditivo: { qnt: 0, percentual: 0, total: 0 },
      totalContrato: 53604.47,
      importado: false,
      nivel: 3,
      ehAdministracaoLocal: true
    }
  ]);

  const [medicoes, setMedicoes] = useState<Medicao[]>([
    { id: 1, nome: '1ª MEDIÇÃO', dados: {} },
    { id: 2, nome: '2ª MEDIÇÃO', dados: {} },
    { id: 3, nome: '3ª MEDIÇÃO', dados: {} },
    { id: 4, nome: '4ª MEDIÇÃO', dados: {} },
    { id: 5, nome: '5ª MEDIÇÃO', dados: {} },
    { id: 6, nome: '6ª MEDIÇÃO', dados: {} }
  ]);

  const [medicaoAtual, setMedicaoAtual] = useState(1);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [mostrarAditivo, setMostrarAditivo] = useState(true);

  useEffect(() => {
    if (id) {
      fetchObra();
    }
  }, [id]);

  const fetchObra = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setObra(data);
    } catch (error) {
      console.error('Erro ao carregar obra:', error);
      toast.error('Erro ao carregar obra');
      navigate('/admin/obras');
    } finally {
      setLoading(false);
    }
  };

  // Função para determinar o nível hierárquico baseado no item
  const determinarNivel = (itemStr: string) => {
    if (!itemStr) return 3;
    const partes = itemStr.split('.');
    return partes.length;
  };

  // Função para verificar se é item pai
  const ehItemPai = (itemStr: string, items: Item[]) => {
    return items.some(item => 
      item.item !== itemStr && 
      item.item.startsWith(itemStr + '.')
    );
  };

  // Função para calcular totais hierárquicos
  const calcularTotaisHierarquicos = (items: Item[]) => {
    const itemsComTotais = [...items];
    
    // Ordenar por item para processar hierarquicamente
    itemsComTotais.sort((a, b) => {
      const aPartes = a.item.split('.').map(Number);
      const bPartes = b.item.split('.').map(Number);
      
      for (let i = 0; i < Math.max(aPartes.length, bPartes.length); i++) {
        const aParte = aPartes[i] || 0;
        const bParte = bPartes[i] || 0;
        if (aParte !== bParte) return aParte - bParte;
      }
      return 0;
    });

    // Processar do nível mais profundo para o mais superficial
    const maxNivel = Math.max(...itemsComTotais.map(item => determinarNivel(item.item)));
    
    for (let nivel = maxNivel; nivel >= 1; nivel--) {
      itemsComTotais.forEach(item => {
        if (determinarNivel(item.item) === nivel && ehItemPai(item.item, itemsComTotais)) {
          // Somar todos os filhos diretos
          const filhos = itemsComTotais.filter(filho => {
            const filhoPartes = filho.item.split('.');
            const paiPartes = item.item.split('.');
            return filhoPartes.length === paiPartes.length + 1 &&
                   filho.item.startsWith(item.item + '.');
          });
          
          item.quantidade = filhos.reduce((sum, filho) => sum + filho.quantidade, 0);
          item.valorTotal = filhos.reduce((sum, filho) => sum + filho.valorTotal, 0);
          item.aditivo.total = filhos.reduce((sum, filho) => sum + filho.aditivo.total, 0);
          item.totalContrato = filhos.reduce((sum, filho) => sum + filho.totalContrato, 0);
          
          // Calcular valor unitário médio ponderado
          if (item.quantidade > 0) {
            item.valorUnitario = item.valorTotal / item.quantidade;
          }
        }
      });
    }
    
    return itemsComTotais;
  };

  // Função para calcular percentual baseado na quantidade
  const calcularPercentual = (quantidade: number, quantidadeTotal: number) => {
    if (quantidadeTotal === 0) return 0;
    return (quantidade / quantidadeTotal) * 100;
  };

  // Função para calcular total baseado na quantidade e valor unitário
  const calcularTotal = (quantidade: number, valorUnitario: number) => {
    return quantidade * valorUnitario;
  };

  // Função para calcular e distribuir Administração Local
  const calcularEDistribuirAdministracaoLocal = () => {
    const medicaoAtualData = medicoes.find(m => m.id === medicaoAtual);
    if (!medicaoAtualData) return;

    // 1. Calcular Total de Serviços Executados (valor da medição dos itens que NÃO são administração local)
    let totalServicosExecutados = 0;
    items.forEach(item => {
      if (!item.ehAdministracaoLocal) {
        const medicaoData = medicaoAtualData.dados[item.id];
        if (medicaoData && medicaoData.total && medicaoData.total > 0) {
          totalServicosExecutados += medicaoData.total;
        }
      }
    });

    // 2. Calcular Total do Contrato (com aditivos se houver)
    const totalDoContrato = items.reduce((sum, item) => sum + item.totalContrato, 0);

    // 3. Calcular Total Administração Local (soma dos valores dos itens da administração local)
    const totalAdministracaoLocal = items
      .filter(item => item.ehAdministracaoLocal)
      .reduce((sum, item) => sum + item.totalContrato, 0);

    if (totalServicosExecutados === 0) {
      toast.error('Nenhum serviço foi medido ainda. Insira valores de medição antes de calcular a administração local.');
      return;
    }

    if (totalDoContrato - totalAdministracaoLocal <= 0) {
      toast.error('Erro no cálculo: Total do Contrato - Total Administração Local deve ser maior que zero.');
      return;
    }

    // Aplicar a fórmula: Total de Serviços Executados / (Total do Contrato - Total Administração Local)
    const porcentagemExecucao = totalServicosExecutados / (totalDoContrato - totalAdministracaoLocal);

    // Aplicar a porcentagem nos itens da Administração Local
    setMedicoes(prevMedicoes =>
      prevMedicoes.map(medicao => {
        if (medicao.id === medicaoAtual) {
          const novosDados = { ...medicao.dados };
          
          items.forEach(item => {
            if (item.ehAdministracaoLocal) {
              // % (coluna 2): Inserir a porcentagem calculada
              const percentualCalculado = porcentagemExecucao * 100;
              
              // QNT (coluna 1): % × Total Contrato do item
              const quantidadeCalculada = porcentagemExecucao * item.totalContrato;
              
              // TOTAL (coluna 3): % × Total Contrato do item (mesmo valor que QNT neste caso)
              const totalCalculado = porcentagemExecucao * item.totalContrato;
              
              novosDados[item.id] = {
                qnt: quantidadeCalculada,
                percentual: percentualCalculado,
                total: totalCalculado
              };
            }
          });
          
          return {
            ...medicao,
            dados: novosDados
          };
        }
        return medicao;
      })
    );

    toast.success(`Administração Local calculada! Porcentagem de execução: ${(porcentagemExecucao * 100).toFixed(2)}%`);
  };

  // Função para atualizar aditivo/supressão/extracontratual
  const atualizarAditivo = (itemId: number, campo: string, valor: string) => {
    setItems(prevItems => {
      const itemsAtualizados = prevItems.map(item => {
        if (item.id === itemId) {
          const novoAditivo = { ...item.aditivo, [campo]: parseFloat(valor) || 0 };
          
          // Recalcular percentual e total automaticamente
          if (campo === 'qnt') {
            novoAditivo.percentual = calcularPercentual(novoAditivo.qnt, item.quantidade);
            novoAditivo.total = calcularTotal(novoAditivo.qnt, item.valorUnitario);
          }
          
          // Recalcular total do contrato
          const novoTotalContrato = item.valorTotal + novoAditivo.total;
          
          return {
            ...item,
            aditivo: novoAditivo,
            totalContrato: novoTotalContrato
          };
        }
        return item;
      });
      
      return calcularTotaisHierarquicos(itemsAtualizados);
    });
  };

  // Função para atualizar dados de medição
  const atualizarMedicao = (itemId: number, medicaoId: number, campo: string, valor: string) => {
    const valorNumerico = parseFloat(valor) || 0;
    
    setMedicoes(prevMedicoes =>
      prevMedicoes.map(medicao => {
        if (medicao.id === medicaoId) {
          const dadosAtuais = medicao.dados[itemId] || { qnt: 0, percentual: 0, total: 0 };
          const novosDados = {
            ...medicao.dados,
            [itemId]: {
              ...dadosAtuais,
              [campo]: valorNumerico
            }
          };
          
          // Recalcular percentual e total automaticamente para a medição
          if (campo === 'qnt') {
            const item = items.find(i => i.id === itemId);
            if (item) {
              const quantidadeTotal = item.quantidade + (item.aditivo?.qnt || 0);
              novosDados[itemId].percentual = calcularPercentual(valorNumerico, quantidadeTotal);
              novosDados[itemId].total = calcularTotal(valorNumerico, item.valorUnitario);
            }
          }
          
          return {
            ...medicao,
            dados: novosDados
          };
        }
        return medicao;
      })
    );
  };

  // Função para adicionar novo item
  const adicionarItem = () => {
    const novoItem: Item = {
      id: Date.now(),
      item: '',
      codigo: '',
      banco: '',
      descricao: '',
      und: '',
      quantidade: 0,
      valorUnitario: 0,
      valorTotal: 0,
      aditivo: { qnt: 0, percentual: 0, total: 0 },
      totalContrato: 0,
      importado: false,
      nivel: 3,
      ehAdministracaoLocal: false
    };
    setItems([...items, novoItem]);
  };

  // Função para remover item
  const removerItem = (itemId: number) => {
    setItems(prevItems => {
      const itemsFiltrados = prevItems.filter(item => item.id !== itemId);
      return calcularTotaisHierarquicos(itemsFiltrados);
    });
  };

  // Função para importar dados da planilha
  const importarDados = (dadosImportados: Item[]) => {
    const dadosComNivel = dadosImportados.map(item => ({
      ...item,
      importado: true,
      nivel: determinarNivel(item.item),
      ehAdministracaoLocal: item.item.startsWith('1.1.') // Marcar itens 1.1.x como administração local
    }));
    
    const dadosComTotais = calcularTotaisHierarquicos(dadosComNivel);
    setItems(dadosComTotais);
    
    // Limpar dados de medições ao importar nova planilha
    setMedicoes(medicoes.map(medicao => ({ ...medicao, dados: {} })));
    toast.success('Planilha importada com sucesso!');
  };

  // Função para obter estilo da linha baseado no nível
  const obterEstiloLinha = (item: Item) => {
    const nivel = determinarNivel(item.item);
    const ehPai = ehItemPai(item.item, items);
    
    if (item.ehAdministracaoLocal) {
      return 'bg-purple-50 border-l-4 border-purple-400';
    } else if (nivel === 1) {
      return 'bg-blue-50 font-bold text-blue-900';
    } else if (nivel === 2) {
      return 'bg-green-50 font-semibold text-green-800';
    } else if (ehPai) {
      return 'bg-yellow-50 font-medium text-yellow-800';
    }
    return '';
  };

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return <LoadingStates.TableSkeleton />;
  }

  if (!obra) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-muted-foreground">Obra não encontrada</p>
          <Button onClick={() => navigate('/admin/obras')} className="mt-4">
            Voltar para Obras
          </Button>
        </div>
      </div>
    );
  }

  // Calcular totais gerais
  const totaisGerais = {
    valorTotal: items.reduce((sum, item) => sum + item.valorTotal, 0),
    aditivoTotal: items.reduce((sum, item) => sum + (item.aditivo?.total || 0), 0),
    totalContrato: items.reduce((sum, item) => sum + item.totalContrato, 0),
    administracaoLocalTotal: items
      .filter(item => item.ehAdministracaoLocal)
      .reduce((sum, item) => sum + item.totalContrato, 0)
  };

  // Calcular total de serviços executados na medição atual (apenas itens que NÃO são administração local)
  const medicaoAtualData = medicoes.find(m => m.id === medicaoAtual);
  const totalServicosExecutados = medicaoAtualData ? 
    Object.entries(medicaoAtualData.dados).reduce((sum, [itemId, dados]) => {
      const item = items.find(i => i.id === parseInt(itemId));
      if (item && !item.ehAdministracaoLocal) {
        return sum + (dados.total || 0);
      }
      return sum;
    }, 0) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <FileText className="h-6 w-6" />
                  Sistema de Medição - {obra.nome}
                </CardTitle>
                <p className="text-muted-foreground">
                  {obra.municipio}
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/admin/obras')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Valor Total Original</div>
              <div className="text-2xl font-bold">{formatCurrency(totaisGerais.valorTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Aditivo</div>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totaisGerais.aditivoTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total do Contrato</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totaisGerais.totalContrato)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Administração Local</div>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(totaisGerais.administracaoLocalTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Serviços Executados</div>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalServicosExecutados)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Seletor de Medição */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Medições
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {medicoes.map(medicao => (
                <Button
                  key={medicao.id}
                  variant={medicaoAtual === medicao.id ? "default" : "outline"}
                  onClick={() => setMedicaoAtual(medicao.id)}
                  className="text-sm"
                >
                  {medicao.nome}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabela Principal */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Planilha Orçamentária</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={calcularEDistribuirAdministracaoLocal}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Calcular Administração Local
                </Button>
                <Button
                  variant={mostrarAditivo ? "default" : "outline"}
                  onClick={() => setMostrarAditivo(!mostrarAditivo)}
                  className="flex items-center gap-2"
                >
                  {mostrarAditivo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {mostrarAditivo ? 'Ocultar' : 'Mostrar'} Aditivo
                </Button>
                <Dialog open={modalImportarAberto} onOpenChange={setModalImportarAberto}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Importar Planilha
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Importar Dados da Planilha</DialogTitle>
                    </DialogHeader>
                    <ImportarPlanilha 
                      onImportar={importarDados}
                      onFechar={() => setModalImportarAberto(false)}
                    />
                  </DialogContent>
                </Dialog>
                <Button onClick={adicionarItem} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Item
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Item</TableHead>
                    <TableHead className="w-24">Código</TableHead>
                    <TableHead className="w-20">Banco</TableHead>
                    <TableHead className="min-w-[300px]">Descrição</TableHead>
                    <TableHead className="w-16">Und</TableHead>
                    <TableHead className="w-24">Quant.</TableHead>
                    <TableHead className="w-28">Valor Unit.</TableHead>
                    <TableHead className="w-32">Valor Total</TableHead>
                    {mostrarAditivo && (
                      <TableHead className="bg-blue-50 w-48">
                        <div className="text-center">
                          <div className="font-semibold">ADITIVO/SUPRESSÃO/EXTRACONTRATUAL</div>
                          <div className="grid grid-cols-3 gap-2 text-xs mt-1">
                            <div>QNT</div>
                            <div>%</div>
                            <div>TOTAL</div>
                          </div>
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="w-32">Total Contrato</TableHead>
                    <TableHead className="bg-green-50 w-56">
                      <div className="text-center">
                        <div className="font-semibold">{medicoes.find(m => m.id === medicaoAtual)?.nome}</div>
                        <div className="grid grid-cols-3 gap-2 text-xs mt-1">
                          <div>QNT</div>
                          <div>%</div>
                          <div>TOTAL</div>
                        </div>
                      </div>
                    </TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => {
                    const medicaoData = medicoes.find(m => m.id === medicaoAtual)?.dados[item.id] || { qnt: 0, percentual: 0, total: 0 };
                    const estiloLinha = obterEstiloLinha(item);
                    
                    return (
                      <TableRow key={item.id} className={estiloLinha}>
                        <TableCell>
                          <Input
                            value={item.item}
                            onChange={(e) => {
                              setItems(prev => prev.map(i => i.id === item.id ? { ...i, item: e.target.value } : i));
                            }}
                            className="w-full"
                            readOnly={item.importado}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.codigo}
                            onChange={(e) => {
                              setItems(prev => prev.map(i => i.id === item.id ? { ...i, codigo: e.target.value } : i));
                            }}
                            className="w-full"
                            readOnly={item.importado}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.banco}
                            onChange={(e) => {
                              setItems(prev => prev.map(i => i.id === item.id ? { ...i, banco: e.target.value } : i));
                            }}
                            className="w-full"
                            readOnly={item.importado}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.descricao}
                            onChange={(e) => {
                              setItems(prev => prev.map(i => i.id === item.id ? { ...i, descricao: e.target.value } : i));
                            }}
                            className="w-full"
                            readOnly={item.importado}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.und}
                            onChange={(e) => {
                              setItems(prev => prev.map(i => i.id === item.id ? { ...i, und: e.target.value } : i));
                            }}
                            className="w-full"
                            readOnly={item.importado}
                          />
                        </TableCell>
                        <TableCell>
                          {ehItemPai(item.item, items) ? (
                            <Badge variant="secondary" className="w-full justify-center">
                              {item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </Badge>
                          ) : (
                            <Input
                              type="number"
                              value={item.quantidade}
                              onChange={(e) => {
                                const novaQuantidade = parseFloat(e.target.value) || 0;
                                setItems(prev => {
                                  const itemsAtualizados = prev.map(i => i.id === item.id ? { 
                                    ...i, 
                                    quantidade: novaQuantidade,
                                    valorTotal: novaQuantidade * i.valorUnitario
                                  } : i);
                                  return calcularTotaisHierarquicos(itemsAtualizados);
                                });
                              }}
                              className="w-full"
                              readOnly={item.importado}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.valorUnitario}
                            onChange={(e) => {
                              const novoValor = parseFloat(e.target.value) || 0;
                              setItems(prev => {
                                const itemsAtualizados = prev.map(i => i.id === item.id ? { 
                                  ...i, 
                                  valorUnitario: novoValor,
                                  valorTotal: i.quantidade * novoValor
                                } : i);
                                return calcularTotaisHierarquicos(itemsAtualizados);
                              });
                            }}
                            className="w-full"
                            readOnly={item.importado || ehItemPai(item.item, items)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="w-full justify-center">
                            {formatCurrency(item.valorTotal)}
                          </Badge>
                        </TableCell>
                        {mostrarAditivo && (
                          <TableCell className="bg-blue-50">
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                type="number"
                                value={item.aditivo.qnt}
                                onChange={(e) => atualizarAditivo(item.id, 'qnt', e.target.value)}
                                className="w-full text-xs"
                                placeholder="QNT"
                                readOnly={ehItemPai(item.item, items)}
                              />
                              <div className="text-xs text-center py-2 bg-white rounded border">
                                {item.aditivo.percentual.toFixed(2)}%
                              </div>
                              <div className="text-xs text-center py-2 bg-white rounded border">
                                {formatCurrency(item.aditivo.total)}
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant="outline" className="text-green-600 w-full justify-center">
                            {formatCurrency(item.totalContrato)}
                          </Badge>
                        </TableCell>
                        <TableCell className="bg-green-50">
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              type="number"
                              value={medicaoData.qnt}
                              onChange={(e) => atualizarMedicao(item.id, medicaoAtual, 'qnt', e.target.value)}
                              className="w-full text-xs"
                              placeholder="QNT"
                              readOnly={ehItemPai(item.item, items) || item.ehAdministracaoLocal}
                            />
                            <div className="text-xs text-center py-2 bg-white rounded border">
                              {medicaoData.percentual.toFixed(2)}%
                            </div>
                            <div className="text-xs text-center py-2 bg-white rounded border">
                              {formatCurrency(medicaoData.total)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!item.ehAdministracaoLocal && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setItems(prev => prev.map(i => i.id === item.id ? { ...i, ehAdministracaoLocal: true } : i));
                                }}
                                title="Marcar como Administração Local"
                              >
                                <Settings className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removerItem(item.id)}
                              disabled={item.importado}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}