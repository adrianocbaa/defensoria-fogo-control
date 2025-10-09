import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicHeader } from '@/components/PublicHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, FileText, DollarSign, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import * as LoadingStates from '@/components/LoadingStates';
import { formatCurrency } from '@/lib/formatters';

export function PublicMedicao() {
  const { id } = useParams<{ id: string }>();
  const [obra, setObra] = useState<any>(null);
  const [orcamentoItems, setOrcamentoItems] = useState<any[]>([]);
  const [medicoes, setMedicoes] = useState<any[]>([]);
  const [aditivos, setAditivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        // Buscar obra
        const { data: obraData, error: obraError } = await supabase
          .from('obras')
          .select('*')
          .eq('id', id)
          .eq('is_public', true)
          .single();

        if (obraError) throw obraError;
        if (!obraData) throw new Error('Obra não encontrada ou não é pública');
        
        setObra(obraData);

        // Buscar itens do orçamento
        const { data: itemsData, error: itemsError } = await supabase
          .from('orcamento_items')
          .select('*')
          .eq('obra_id', id)
          .order('ordem', { ascending: true });

        if (itemsError) throw itemsError;
        setOrcamentoItems(itemsData || []);

        // Buscar medições
        const { data: medicoesData, error: medicoesError } = await supabase
          .from('medicao_sessions')
          .select('id, sequencia, status, created_at, medicao_items ( item_code, qtd, pct, total )')
          .eq('obra_id', id)
          .order('sequencia', { ascending: true });

        if (medicoesError) throw medicoesError;
        setMedicoes(medicoesData || []);

        // Buscar aditivos
        const { data: aditivosData, error: aditivosError } = await supabase
          .from('aditivo_sessions')
          .select('id, sequencia, status, created_at, aditivo_items ( item_code, qtd, pct, total )')
          .eq('obra_id', id)
          .order('created_at', { ascending: true });

        if (aditivosError) throw aditivosError;
        setAditivos(aditivosData || []);
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message || 'Erro ao carregar dados da obra');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <PublicHeader>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PublicHeader>
    );
  }

  if (error || !obra) {
    return (
      <PublicHeader>
        <div className="container mx-auto py-6">
          <LoadingStates.ErrorState 
            message={error || 'Obra não encontrada'} 
            onRetry={() => window.location.reload()}
          />
        </div>
      </PublicHeader>
    );
  }

  const valorTotal = obra.valor_total + (obra.valor_aditivado || 0);
  const porcentagemExecucao = valorTotal > 0 ? ((obra.valor_executado || 0) / valorTotal) * 100 : 0;

  // Calcular totais de aditivos
  const totalAditivo = useMemo(() => {
    return aditivos
      .filter((a: any) => a.status === 'bloqueada')
      .reduce((sum: number, aditivo: any) => {
        const aditivoTotal = (aditivo.aditivo_items || []).reduce((itemSum: number, item: any) => 
          itemSum + (Number(item.total) || 0), 0
        );
        return sum + aditivoTotal;
      }, 0);
  }, [aditivos]);

  // Criar mapa de totais acumulados por item
  const acumuladoPorItem = useMemo(() => {
    const map = new Map<string, number>();
    medicoes.forEach((medicao: any) => {
      (medicao.medicao_items || []).forEach((item: any) => {
        const current = map.get(item.item_code) || 0;
        map.set(item.item_code, current + (Number(item.total) || 0));
      });
    });
    return map;
  }, [medicoes]);

  // Agrupar itens por nível
  const itensPrimeiroNivel = orcamentoItems.filter(item => item.nivel === 1);
  
  const toggleExpanded = (codigo: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(codigo)) {
      newExpanded.delete(codigo);
    } else {
      newExpanded.add(codigo);
    }
    setExpandedItems(newExpanded);
  };

  const getChildrenItems = (codigo: string) => {
    return orcamentoItems.filter(item => {
      const parts = item.item.split('.');
      const parentParts = codigo.split('.');
      return parts.length === parentParts.length + 1 && item.item.startsWith(codigo + '.');
    });
  };

  return (
    <PublicHeader>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/public/obras/lista">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>

        <PageHeader
          title={obra.nome}
          subtitle={`Painel Físico-Financeiro - ${obra.municipio}`}
        />

        {/* Resumo Financeiro */}
        <div className="grid md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Inicial do Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(obra.valor_total)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Geral do Aditivo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(totalAditivo)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Contrato Pós Aditivo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-600">{formatCurrency(valorTotal)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Acumulado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-cyan-600">{formatCurrency(obra.valor_executado || 0)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Execução</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-orange-600">{porcentagemExecucao.toFixed(2)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Medições */}
        {medicoes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Medições ({medicoes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {medicoes.map((medicao: any, idx: number) => (
                  <div key={medicao.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{idx + 1}ª Medição</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(medicao.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge variant={medicao.status === 'bloqueada' ? 'secondary' : 'default'}>
                        {medicao.status === 'bloqueada' ? 'Concluída' : 'Aberta'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aditivos */}
        {aditivos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Aditivos ({aditivos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {aditivos.map((aditivo: any, idx: number) => (
                  <div key={aditivo.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Aditivo {idx + 1}</p>
                        <p className="text-sm text-muted-foreground">
                          Sequência: {aditivo.sequencia} • {new Date(aditivo.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge variant={aditivo.status === 'bloqueada' ? 'secondary' : 'default'}>
                        {aditivo.status === 'bloqueada' ? 'Bloqueado' : 'Aberto'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Planilha Orçamentária Detalhada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Planilha Orçamentária Completa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Item</TableHead>
                    <TableHead className="w-[120px]">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[80px]">Und</TableHead>
                    <TableHead className="w-[100px] text-right">Quant.</TableHead>
                    <TableHead className="w-[120px] text-right">Valor Unit.</TableHead>
                    <TableHead className="w-[140px] text-right">Total Contrato</TableHead>
                    <TableHead className="w-[140px] text-right">Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orcamentoItems.map((item) => {
                    const children = getChildrenItems(item.item);
                    const hasChildren = children.length > 0;
                    const isExpanded = expandedItems.has(item.item);
                    const acumulado = acumuladoPorItem.get(item.codigo) || 0;
                    const indent = (item.nivel - 1) * 24;

                    return (
                      <React.Fragment key={item.id}>
                        <TableRow className={item.nivel === 1 ? 'bg-muted/50 font-semibold' : ''}>
                          <TableCell>
                            <div style={{ paddingLeft: `${indent}px` }} className="flex items-center gap-1">
                              {hasChildren && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleExpanded(item.item)}
                                >
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                              )}
                              <span>{item.item}</span>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-xs font-mono">{item.codigo}</span></TableCell>
                          <TableCell>
                            <span className={item.nivel === 1 ? 'font-semibold' : ''}>{item.descricao}</span>
                          </TableCell>
                          <TableCell>{item.unidade}</TableCell>
                          <TableCell className="text-right">{item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valor_unitario)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.total_contrato)}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">{formatCurrency(acumulado)}</TableCell>
                        </TableRow>
                        {isExpanded && children.map((child) => {
                          const childAcumulado = acumuladoPorItem.get(child.codigo) || 0;
                          const childIndent = (child.nivel - 1) * 24;
                          return (
                            <TableRow key={child.id}>
                              <TableCell>
                                <div style={{ paddingLeft: `${childIndent}px` }}>{child.item}</div>
                              </TableCell>
                              <TableCell><span className="text-xs font-mono">{child.codigo}</span></TableCell>
                              <TableCell>{child.descricao}</TableCell>
                              <TableCell>{child.unidade}</TableCell>
                              <TableCell className="text-right">{child.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right">{formatCurrency(child.valor_unitario)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(child.total_contrato)}</TableCell>
                              <TableCell className="text-right text-green-600">{formatCurrency(childAcumulado)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicHeader>
  );
}

export default PublicMedicao;
