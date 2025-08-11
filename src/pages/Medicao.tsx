import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Calculator, FileText, Plus, Trash2, Upload, Eye, EyeOff, Settings, Zap, Check, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import ImportarPlanilha from '@/components/ImportarPlanilha';
import NovoAditivoModal from '@/components/NovoAditivoModal';
import * as LoadingStates from '@/components/LoadingStates';
import { useUserRole } from '@/hooks/useUserRole';
import { useMedicaoSessions } from '@/hooks/useMedicaoSessions';
import { useMedicaoItems } from '@/hooks/useMedicaoItems';
import { useAditivoSessions } from '@/hooks/useAditivoSessions';
import { useAditivoItems } from '@/hooks/useAditivoItems';
import * as XLSX from 'xlsx';

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
  ordem: number;
}

interface Medicao {
  id: number;
  sessionId?: string;
  nome: string;
  dados: { [itemId: number]: { qnt: number; percentual: number; total: number } };
  bloqueada?: boolean;
  dataBloqueio?: string;
  usuarioBloqueio?: string;
}

interface Aditivo {
  id: number; // local UI id
  nome: string;
  dados: { [itemId: number]: { qnt: number; percentual: number; total: number } };
  sessionId?: string; // Supabase aditivo_sessions.id
  sequencia?: number;
  bloqueada?: boolean;
  created_at?: string;
}

export function Medicao() {
  const { id } = useParams();
  const navigate = useNavigate();
const { isAdmin } = useUserRole();
const { createSession, blockSession, reopenSession, deleteSession } = useMedicaoSessions();
const { createSession: createAditivoSession, reopenSession: reopenAditivoSession, deleteSession: deleteAditivoSession, fetchSessionsWithItems: fetchAditivoSessions, blockSession: blockAditivoSession } = useAditivoSessions();
const { upsertItems } = useMedicaoItems();
const { upsertItems: upsertAditivoItems } = useAditivoItems();
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados do sistema de medição
  const [items, setItems] = useState<Item[]>([]);

  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [aditivos, setAditivos] = useState<Aditivo[]>([]);

  const [medicaoAtual, setMedicaoAtual] = useState<number | null>(null);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [mostrarAditivos, setMostrarAditivos] = useState(true);
  const [novoAditivoAberto, setNovoAditivoAberto] = useState(false);

  useEffect(() => {
    if (id) {
      fetchObra();
      fetchMedicoesSalvas();
    }
  }, [id]);

  // Aplicar layout wide (full-width) apenas nesta página
  useEffect(() => {
    document.body.classList.add('medicao-layout-wide');
    return () => {
      document.body.classList.remove('medicao-layout-wide');
    };
  }, []);

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

  const fetchMedicoesSalvas = async () => {
    if (!id) return;
    
    try {
      // Mapa auxiliar para relacionar código do serviço ao ID do item
      let codigoToIdMap = new Map<string, number>();
      // Primeiro, buscar os items da planilha orçamentária
      const { data: orcamentoItems, error: orcamentoError } = await supabase
        .from('orcamento_items')
        .select('*')
        .eq('obra_id', id)
        .order('ordem', { ascending: true });

      if (orcamentoError) throw orcamentoError;

      if (orcamentoItems && orcamentoItems.length > 0) {
        // Converter items do orçamento para o formato da interface
        const itemsConvertidos: Item[] = orcamentoItems.map(item => ({
          id: stableIdForRow(item.item, item.codigo, item.ordem || 0),
          item: item.item,
          codigo: item.codigo,
          banco: item.banco,
          descricao: item.descricao,
          und: item.unidade,
          quantidade: item.quantidade,
          valorUnitario: item.valor_unitario,
          valorTotal: item.valor_total,
          aditivo: { qnt: 0, percentual: 0, total: 0 },
          totalContrato: item.total_contrato,
          importado: true,
          nivel: item.nivel,
          ehAdministracaoLocal: item.eh_administracao_local,
          ordem: item.ordem || 0
        }));

        // Criar mapa código -> ID para usar ao converter medições salvas
        codigoToIdMap = new Map(itemsConvertidos.map(i => [i.codigo, i.id]));

        setItems(itemsConvertidos);
      }

      // Depois, buscar as sessões de medição normalizadas e seus itens
      const { data: sessions, error: sessionsError } = await supabase
        .from('medicao_sessions')
        .select('id, sequencia, status, created_at, medicao_items ( item_code, qtd, pct, total )')
        .eq('obra_id', id)
        .order('sequencia', { ascending: true });

      if (sessionsError) throw sessionsError;

      if (sessions && sessions.length > 0) {
        const medicoesConvertidas: Medicao[] = sessions.map((s: any) => {
          const m: Medicao = {
            id: s.sequencia,
            sessionId: s.id,
            nome: `${s.sequencia}ª MEDIÇÃO`,
            dados: {},
            bloqueada: s.status === 'bloqueada',
            dataBloqueio: s.status === 'bloqueada' ? s.created_at : undefined,
            usuarioBloqueio: s.status === 'bloqueada' ? 'Sistema' : undefined,
          };
          const itens = (s.medicao_items || []) as any[];
          itens.forEach((it: any) => {
            const mappedId = codigoToIdMap.get(it.item_code) ?? stableIdFromCodigo(it.item_code);
            m.dados[mappedId] = {
              qnt: Number(it.qtd) || 0,
              percentual: Number(it.pct) || 0,
              total: Number(it.total) || 0,
            };
          });
          return m;
        });
        setMedicoes(medicoesConvertidas);
        setMedicaoAtual(medicoesConvertidas[0]?.id ?? null);
      }

      // Buscar sessões de aditivo e itens
      const { data: adSessions, error: adSessionsError } = await supabase
        .from('aditivo_sessions')
        .select('id, sequencia, status, created_at, aditivo_items ( item_code, qtd, pct, total )')
        .eq('obra_id', id)
        .order('sequencia', { ascending: true });
      if (adSessionsError) throw adSessionsError;
      if (adSessions && adSessions.length > 0) {
        const aditivosConvertidos: Aditivo[] = adSessions.map((s: any) => {
          const a: Aditivo = {
            id: s.sequencia,
            nome: `ADITIVO ${s.sequencia}`,
            dados: {},
            sessionId: s.id,
            sequencia: s.sequencia,
            bloqueada: s.status === 'bloqueada',
            created_at: s.created_at,
          };
          const itens = (s.aditivo_items || []) as any[];
          itens.forEach((it: any) => {
            const mappedId = codigoToIdMap.get(it.item_code) ?? stableIdFromCodigo(it.item_code);
            a.dados[mappedId] = {
              qnt: Number(it.qtd) || 0,
              percentual: Number(it.pct) || 0,
              total: Number(it.total) || 0,
            };
          });
          return a;
        });
        setAditivos(aditivosConvertidos);
      }
    } catch (error) {
      console.error('Erro ao carregar dados salvos:', error);
      // Não mostrar toast de erro para não incomodar o usuário
    }
  };

  // Função auxiliar para gerar hash de string (compatível com IDs anteriores quando necessário)
  const hashCode = (str: string) => {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };

  // ID estável e com baixa colisão a partir do código do serviço
  const stableIdFromCodigo = (codigo: string) => {
    let h1 = 5381;
    let h2 = 52711;
    for (let i = 0; i < codigo.length; i++) {
      const ch = codigo.charCodeAt(i);
      h1 = ((h1 << 5) + h1) ^ ch; // djb2 xor
      h2 = ch + (h2 << 6) + (h2 << 16) - h2; // sdbm
    }
    // Combinar em 53 bits seguros
    const combined = ((h1 >>> 0) * 4096) + ((h2 >>> 0) % 4096);
    return Math.abs(combined);
  };

  // ID estável robusto por linha combinando hierarquia (item), código banco e ordem
  const stableIdForRow = (itemStr: string, codigo: string, ordem: number | null | undefined) => {
    const base = `${itemStr || ''}#${codigo || ''}#${ordem ?? ''}`;
    let h1 = 5381;
    for (let i = 0; i < base.length; i++) {
      h1 = ((h1 << 5) + h1) ^ base.charCodeAt(i);
    }
    return Math.abs(h1 >>> 0) * 4096 + (Math.abs(hashCode(base)) % 4096);
  };
  // Função para calcular total do contrato incluindo aditivos
  const calcularTotalContratoComAditivos = (item: Item) => {
    const totalAditivos = aditivos.reduce((sum, aditivo) => {
      const aditivoData = aditivo.dados[item.id];
      return sum + (aditivoData?.total || 0);
    }, 0);
    
    return item.valorTotal + totalAditivos;
  };

  // Função para verificar se um item é de primeiro nível (sem pontos ou apenas números)
  const ehItemPrimeiroNivel = (codigo: string) => {
    // Um item é de primeiro nível se seu código corresponde a apenas números (ex: "1", "2", "3")
    // Ignora subitens como "1.1", "1.1.1", etc.
    return /^\d+$/.test(codigo.trim());
  };

  // Mapas de hierarquia para performance
  const { itemsByCode, childrenByCode, levelByCode, maxNivelHierarquia, codesByLevel } = useMemo(() => {
    const mapItems = new Map<string, Item>();
    const mapChildren = new Map<string, Item[]>();
    const mapLevel = new Map<string, number>();
    const levelBuckets = new Map<number, string[]>();

    items.forEach((it) => {
      const code = it.item.trim();
      mapItems.set(code, it);
      const n = code ? code.split('.').length : 1;
      mapLevel.set(code, n);
      if (!levelBuckets.has(n)) levelBuckets.set(n, []);
      levelBuckets.get(n)!.push(code);
    });

    items.forEach((it) => {
      const code = it.item.trim();
      const parts = code.split('.');
      if (parts.length > 1) {
        const parent = parts.slice(0, -1).join('.');
        if (!mapChildren.has(parent)) mapChildren.set(parent, []);
        mapChildren.get(parent)!.push(it);
      }
    });

    const maxNivel = items.length ? Math.max(...items.map(i => (i.item ? i.item.split('.').length : 1))) : 1;
    return { itemsByCode: mapItems, childrenByCode: mapChildren, levelByCode: mapLevel, maxNivelHierarquia: maxNivel, codesByLevel: levelBuckets };
  }, [items]);

  // Função para verificar se um item é folha (não possui subitens)
  const ehItemFolha = (codigo: string) => {
    return (childrenByCode.get(codigo.trim())?.length ?? 0) === 0;
  };

  // Função para calcular Valor Total Original (soma apenas itens de primeiro nível)
  const calcularValorTotalOriginal = useMemo(() => {
    return items
      .filter(item => ehItemPrimeiroNivel(item.item))
      .reduce((total, item) => total + item.valorTotal, 0);
  }, [items]);

  // Função para calcular Total do Contrato (soma apenas itens de primeiro nível da coluna Total Contrato)
  const calcularTotalContrato = useMemo(() => {
    return items
      .filter(item => ehItemPrimeiroNivel(item.item))
      .reduce((total, item) => total + item.totalContrato, 0);
  }, [items]);

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
          
          const somaQuantidade = filhos.reduce((sum, filho) => sum + filho.quantidade, 0);
          const somaValorTotal = filhos.reduce((sum, filho) => sum + filho.valorTotal, 0);
          item.quantidade = somaQuantidade;
          // Não substituir o Valor Total do nível 1; manter o valor importado da planilha
          if (determinarNivel(item.item) !== 1) {
            item.valorTotal = somaValorTotal;
          }
          item.aditivo.total = filhos.reduce((sum, filho) => sum + filho.aditivo.total, 0);
          item.totalContrato = filhos.reduce((sum, filho) => sum + filho.totalContrato, 0);
          
          // Calcular valor unitário médio ponderado
          if (item.quantidade > 0) {
            // Usar o valorTotal atual (importado para nível 1 ou somado para demais)
            item.valorUnitario = item.valorTotal / item.quantidade;
          }
        }
      });
    }
    
    return itemsComTotais;
  };

  // Memoizar dados hierárquicos para performance usando mapa de filhos
  const dadosHierarquicosMemoizados = useMemo(() => {
    const cache: { [medicaoId: number]: { [itemId: number]: { qnt: number; percentual: number; total: number } } } = {};

    medicoes.forEach(medicao => {
      const dadosCalculados: { [itemId: number]: { qnt: number; percentual: number; total: number } } = { ...medicao.dados };

      for (let nivel = maxNivelHierarquia; nivel >= 1; nivel--) {
        const codes = codesByLevel.get(nivel) || [];
        codes.forEach(code => {
          const parent = itemsByCode.get(code);
          if (!parent) return;
          const filhos = childrenByCode.get(code) || [];
          if (filhos.length === 0) return;

          let qntTotal = 0;
          let valorTotal = 0;
          filhos.forEach(filho => {
            const dadosFilho = dadosCalculados[filho.id] || { qnt: 0, percentual: 0, total: 0 };
            qntTotal += dadosFilho.qnt || 0;
            valorTotal += dadosFilho.total || 0;
          });

          const totalContratoParent = calcularTotalContratoComAditivos(parent);
          const percentualCalculado = totalContratoParent > 0 ? (valorTotal / totalContratoParent) * 100 : 0;
          dadosCalculados[parent.id] = {
            qnt: qntTotal,
            percentual: percentualCalculado,
            total: valorTotal
          };
        });
      }

      cache[medicao.id] = dadosCalculados;
    });

    return cache;
  }, [medicoes, itemsByCode, childrenByCode, maxNivelHierarquia, codesByLevel]);

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

    // 1. Calcular Total de Serviços Executados (valor da medição dos itens que NÃO são administração local, apenas itens folha)
    let totalServicosExecutados = 0;
    items.forEach(item => {
      if (!item.ehAdministracaoLocal && ehItemFolha(item.item)) {
        const medicaoData = medicaoAtualData.dados[item.id];
        if (medicaoData?.total && medicaoData.total > 0) {
          totalServicosExecutados += medicaoData.total;
        }
      }
    });

    // 2. Calcular Total do Contrato considerando apenas itens folha (evita dupla contagem)
    const totalDoContrato = items
      .filter(item => ehItemFolha(item.item))
      .reduce((sum, item) => sum + item.totalContrato, 0);

    // 3. Calcular Total da Administração Local considerando apenas itens folha selecionados como AL
    const totalAdministracaoLocal = items
      .filter(item => item.ehAdministracaoLocal && ehItemFolha(item.item))
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

              // QNT (coluna 1): % × Quantitativo do item
              const quantidadeCalculada = porcentagemExecucao * item.quantidade;

              // TOTAL (coluna 3): % × Total Contrato do item
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

  // Debounce por célula (medição)
  const debouncersRef = React.useRef(new Map<string, number>());
  const onChangeMedicaoDebounced = (itemId: number, medicaoId: number, campo: string, valor: string, delay = 150) => {
    const key = `${medicaoId}:${itemId}:${campo}`;
    const prev = debouncersRef.current.get(key);
    if (prev) window.clearTimeout(prev);
    const timeout = window.setTimeout(() => {
      atualizarMedicao(itemId, medicaoId, campo, valor);
      debouncersRef.current.delete(key);
    }, delay);
    debouncersRef.current.set(key, timeout);
  };

  // Função para atualizar dados de medição
  const atualizarMedicao = (itemId: number, medicaoId: number, campo: string, valor: string) => {
    // Verificar se a medição está bloqueada
    const medicao = medicoes.find(m => m.id === medicaoId);
    if (medicao?.bloqueada && !isAdmin) {
      toast.error('Esta medição está bloqueada. Apenas administradores podem editá-la.');
      return;
    }

    const valorNumerico = parseFloat(valor) || 0;

    // Validar limite de 100% (não ultrapassar disponível)
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const medicaoIndex = medicoes.findIndex(m => m.id === medicaoId);
    let qntAcumAnterior = 0;
    for (let i = 0; i < medicaoIndex; i++) {
      const dh = dadosHierarquicosMemoizados[medicoes[i].id];
      if (dh && dh[itemId]) {
        qntAcumAnterior += dh[itemId].qnt || 0;
      }
    }

    const quantidadeProjeto = item.quantidade;
    const qntProposta = campo === 'percentual' 
      ? (valorNumerico / 100) * quantidadeProjeto 
      : valorNumerico;

    const disponivel = quantidadeProjeto - qntAcumAnterior;
    if (qntProposta > disponivel + 1e-9) {
      toast.warning(
        `Quantidade informada ultrapassa 100% do item. Disponível: ${disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Revise a medição.`
      );
      return; // não aplica
    }

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
            const percentualCalculado = quantidadeProjeto > 0 ? (qntProposta / quantidadeProjeto) * 100 : 0;
            novosDados[itemId].percentual = percentualCalculado;
            novosDados[itemId].total = (percentualCalculado / 100) * calcularTotalContratoComAditivos(item);
          } else if (campo === 'percentual') {
            const qntEquivalente = qntProposta;
            novosDados[itemId].qnt = qntEquivalente;
            novosDados[itemId].total = (valorNumerico / 100) * calcularTotalContratoComAditivos(item);
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

  // Função para atualizar dados de aditivo
  const atualizarAditivo = (itemId: number, aditivoId: number, campo: string, valor: string) => {
    const valorNumerico = parseFloat(valor) || 0;
    
    setAditivos(prevAditivos =>
      prevAditivos.map(aditivo => {
        if (aditivo.id === aditivoId) {
          const dadosAtuais = aditivo.dados[itemId] || { qnt: 0, percentual: 0, total: 0 };
          const novosDados = {
            ...aditivo.dados,
            [itemId]: {
              ...dadosAtuais,
              [campo]: valorNumerico
            }
          };
          
          // Recalcular percentual e total automaticamente
          if (campo === 'qnt') {
            const item = items.find(i => i.id === itemId);
            if (item) {
              novosDados[itemId].percentual = calcularPercentual(valorNumerico, item.quantidade);
              novosDados[itemId].total = calcularTotal(valorNumerico, item.valorUnitario);
            }
          }
          
          return {
            ...aditivo,
            dados: novosDados
          };
        }
        return aditivo;
      })
    );
  };

  // Persistir aditivo atual no Supabase
  const salvarAditivo = async (aditivoLocalId: number) => {
    const ad = aditivos.find(a => a.id === aditivoLocalId);
    if (!ad || !ad.sessionId) {
      toast.error('Aditivo inválido');
      return;
    }
    try {
      const payload = items.reduce((arr, it) => {
        const d = ad.dados[it.id];
        if (!d) return arr;
        const hasData = (d.qnt ?? 0) > 0 || (d.percentual ?? 0) > 0 || (d.total ?? 0) > 0;
        if (!hasData) return arr;
        arr.push({ item_code: it.codigo, qtd: d.qnt || 0, pct: d.percentual || 0, total: d.total || 0 });
        return arr;
      }, [] as { item_code: string; qtd: number; pct: number; total: number }[]);

      await upsertAditivoItems(ad.sessionId, payload);
      toast.success(`${ad.nome} salvo com sucesso!`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar aditivo');
    }
  };

  const editarAditivo = async (aditivoLocalId: number) => {
    const ad = aditivos.find(a => a.id === aditivoLocalId);
    if (!ad || !ad.sessionId) return;
    try {
      await reopenAditivoSession(ad.sessionId);
      setAditivos(prev => prev.map(a => a.id === aditivoLocalId ? { ...a, bloqueada: false } : a));
      toast.success(`${ad.nome} liberado para edição.`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao liberar aditivo');
    }
  };

  const excluirAditivo = async (aditivoLocalId: number) => {
    const ad = aditivos.find(a => a.id === aditivoLocalId);
    if (!ad || !ad.sessionId) return;
    try {
      await deleteAditivoSession(ad.sessionId);
      setAditivos(prev => prev.filter(a => a.id !== aditivoLocalId));
      toast.success(`${ad.nome} excluído.`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao excluir aditivo');
    }
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
      ehAdministracaoLocal: false,
      ordem: items.length
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

  // Função para marcar/desmarcar item como administração local
  const toggleAdministracaoLocal = async (itemId: number) => {
    if (!id) return;

    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const novoStatus = !item.ehAdministracaoLocal;

      // Atualizar no banco de dados
      const { error } = await supabase
        .from('orcamento_items')
        .update({ eh_administracao_local: novoStatus })
        .eq('obra_id', id)
        .eq('codigo', item.codigo);

      if (error) throw error;

      // Atualizar no estado local
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? { ...item, ehAdministracaoLocal: novoStatus }
            : item
        )
      );

      toast.success(`Item ${novoStatus ? 'marcado como' : 'desmarcado de'} Administração Local`);
    } catch (error) {
      console.error('Erro ao atualizar administração local:', error);
      toast.error('Erro ao atualizar status de administração local');
    }
  };

  // Função para criar nova medição
const criarNovaMedicao = async () => {
  if (!id) return;
  try {
    const nextSeq = (medicoes.length ? Math.max(...medicoes.map(m => m.id)) : 0) + 1;
    const newSession = await createSession(id, nextSeq);

    const novaMedicao: Medicao = {
      id: newSession.sequencia,
      sessionId: newSession.id,
      nome: `${newSession.sequencia}ª MEDIÇÃO`,
      dados: {},
      bloqueada: false,
    };

    setMedicoes(prev => [...prev, novaMedicao]);
    setMedicaoAtual(novaMedicao.id);
    toast.success(`${nextSeq}ª Medição criada com sucesso!`);
  } catch (error) {
    console.error('Erro ao criar medição:', error);
    toast.error('Erro ao criar medição');
  }
};

  // Função para criar novo aditivo (sem anexos)
  const criarNovoAditivo = () => {
    const numeroAditivo = aditivos.length + 1;
    const novoAditivo: Aditivo = {
      id: Date.now(),
      nome: `ADITIVO ${numeroAditivo}`,
      dados: {}
    };
    setAditivos([...aditivos, novoAditivo]);
    toast.success(`Aditivo ${numeroAditivo} criado com sucesso!`);
  };

  // Helpers para importação extracontratual
  const normalizeHeader = (s: any) => String(s || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const parseNumber = (v: any) => {
    if (typeof v === 'number') return v;
    if (v == null) return 0;
    const str = String(v).toString().trim();
    if (!str) return 0;
    // remove thousands and fix decimal
    const n = str.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(n);
    return isNaN(parsed) ? 0 : parsed;
  };

  // removed remap helpers: no remapping per user decision


  // Confirmação do modal de Novo Aditivo
  const confirmarNovoAditivo = async ({ extracontratual, file }: { extracontratual: boolean; file?: File | null; }) => {
    const numeroAditivo = aditivos.length + 1;

    if (!id) {
      toast.error('Obra inválida');
      return;
    }

    // Criar sessão do aditivo no Supabase
    let newSession;
    try {
      newSession = await createAditivoSession(id, numeroAditivo);
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível criar a sessão do aditivo.');
      return;
    }

    // Adicionar aditivo em memória com vínculo da sessão
    const novoAditivo: Aditivo = {
      id: numeroAditivo,
      nome: `ADITIVO ${numeroAditivo}`,
      dados: {},
      sessionId: newSession.id,
      sequencia: newSession.sequencia,
      bloqueada: newSession.status === 'bloqueada',
      created_at: newSession.created_at,
    };
    setAditivos(prev => [...prev, novoAditivo]);

    if (!extracontratual || !file) {
      toast.success(`Aditivo ${numeroAditivo} criado.`);
      return;
    }


    try {
      // 2) Ler planilha (.xlsx ou .csv)
      let workbook: XLSX.WorkBook;
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        const buf = await file.arrayBuffer();
        workbook = XLSX.read(buf, { type: 'array' });
      }
      const sheetName = workbook.SheetNames[0];
      const ws = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      if (!rows || rows.length < 2) throw new Error('Planilha vazia');

      // 3) Mapear cabeçalhos
      const header = rows[0].map(h => normalizeHeader(h));
      const idx = {
        item: header.findIndex(h => h === 'item'),
        codigoBanco: header.findIndex(h => h.includes('codigo banco') || h === 'codigo' || h === 'codigobanco'),
        descricao: header.findIndex(h => h === 'descricao'),
        und: header.findIndex(h => h === 'und' || h === 'unidade'),
        quant: header.findIndex(h => h.startsWith('quant')),
        valorUnit: header.findIndex(h => h.includes('valor unit') || h.includes('valor unitario')),
        valorTotal: header.findIndex(h => h.includes('valor total')),
      };

      const body = rows.slice(1);
      const baseOrdem = items.reduce((m, it) => Math.max(m, it.ordem || 0), 0);

      const existentes = new Set(items.map(it => (it.item || '').trim()));
      const novos: Item[] = [];
      const duplicados: string[] = [];
      const vistosNoArquivo = new Set<string>();
      let seq = 0; // manter ordem sequencial contínua para os itens aceitos
      body.forEach((r, i) => {
        const code = idx.item >= 0 ? String(r[idx.item] ?? '').trim() : '';
        const descricao = idx.descricao >= 0 ? String(r[idx.descricao] ?? '').trim() : '';
        const und = idx.und >= 0 ? String(r[idx.und] ?? '').trim() : '';
        const codigoBanco = idx.codigoBanco >= 0 ? String(r[idx.codigoBanco] ?? '').trim() : '';
        const quant = parseNumber(idx.quant >= 0 ? r[idx.quant] : 0);
        const valorUnit = parseNumber(idx.valorUnit >= 0 ? r[idx.valorUnit] : 0);
        const valorTotalPlanilha = parseNumber(idx.valorTotal >= 0 ? r[idx.valorTotal] : 0);

        // Ignorar linhas completamente vazias (sem código, descrição, unidade, quantidade e valores)
        const linhaVazia = !code && !descricao && !und && !codigoBanco && quant <= 0 && valorUnit <= 0 && valorTotalPlanilha <= 0;
        if (linhaVazia) return;

        // Exigir código para identificar o item (não gerar códigos artificiais)
        if (!code) return;

        const nivel = code.split('.').length;

        // Incluir cabeçalhos de nível 1 mesmo com quantidade vazia/zero; demais níveis exigem quantidade > 0
        if (quant <= 0 && nivel !== 1) return;

        if (existentes.has(code) || vistosNoArquivo.has(code)) {
          duplicados.push(code);
          return;
        }
        vistosNoArquivo.add(code);

        // Valor total importado não entra no Valor Total Original
        const valorTotalOriginal = 0;

        const ordemVal = baseOrdem + (++seq);
        const novo: Item = {
          id: stableIdForRow(code, codigoBanco, ordemVal),
          item: code,
          codigo: codigoBanco,
          banco: '',
          descricao,
          und,
          quantidade: (nivel === 1 ? 0 : quant),
          valorUnitario: (nivel === 1 ? 0 : valorUnit),
          valorTotal: (nivel === 1 ? valorTotalPlanilha : valorTotalOriginal),
          aditivo: { qnt: 0, percentual: 0, total: 0 },
          totalContrato: 0,
          importado: true,
          nivel,
          ehAdministracaoLocal: false,
          ordem: ordemVal,
        };
        novos.push(novo);
      });

      if (duplicados.length > 0) {
        throw new Error('COD_DUP:' + duplicados.join(','));
      }

      if (!novos.length) throw new Error('Nenhum dado válido foi encontrado na planilha.');

      // 4) Atualizar estado local (merge no final) com totais hierárquicos
      const merged = calcularTotaisHierarquicos([...items, ...novos]);
      setItems(merged);

      // 5) Persistir no banco sem sobrescrever os existentes
      const rowsToInsert = novos.map((it) => ({
        obra_id: id,
        item: it.item,
        codigo: it.codigo,
        banco: it.banco,
        descricao: it.descricao,
        unidade: it.und,
        quantidade: it.quantidade,
        valor_unitario: it.valorUnitario,
        valor_total: it.valorTotal, // 0 para não afetar Valor Total Original
        total_contrato: it.totalContrato,
        nivel: it.nivel,
        eh_administracao_local: it.ehAdministracaoLocal,
        ordem: it.ordem,
        // Novos campos
        origem: 'extracontratual',
        aditivo_num: numeroAditivo,
      } as any));

      const { error: insertErr } = await supabase.from('orcamento_items').insert(rowsToInsert as any);
      if (insertErr) throw insertErr;

      } catch (e: any) {
        console.error(e);
        if (typeof e?.message === 'string' && e.message.startsWith('COD_DUP:')) {
          const lista = e.message.replace('COD_DUP:', '');
          toast.error(`Códigos duplicados na base ou em outro aditivo: ${lista}. Importação bloqueada.`);
        } else {
          toast.error('Não foi possível ler a planilha. Verifique o layout.');
        }
      }
  };
  // Função para salvar e bloquear medição
  const salvarEBloquearMedicao = async (medicaoId: number) => {
    const medicao = medicoes.find(m => m.id === medicaoId);
    if (!medicao || !obra) return;

    // Verificar se há dados preenchidos
    const temDados = Object.values(medicao.dados).some(dados => 
      dados.qnt > 0 || dados.percentual > 0 || dados.total > 0
    );

    if (!temDados) {
      toast.error('Não é possível bloquear uma medição sem dados preenchidos.');
      return;
    }

    // Hard guard: validar que nenhum item excede 100%
    const medicaoIndex = medicoes.findIndex(m => m.id === medicaoId);
    const itensInvalidos: { codigo: string; disponivel: number; digitado: number }[] = [];
    for (const [itemIdStr, dados] of Object.entries(medicao.dados)) {
      const itemId = parseInt(itemIdStr);
      const item = items.find(i => i.id === itemId);
      if (!item) continue;

      let qntAcumAnterior = 0;
      for (let i = 0; i < medicaoIndex; i++) {
        const dh = dadosHierarquicosMemoizados[medicoes[i].id];
        if (dh && dh[itemId]) {
          qntAcumAnterior += dh[itemId].qnt || 0;
        }
      }
      const disponivel = item.quantidade - qntAcumAnterior;
      if (dados.qnt > disponivel + 1e-9) {
        itensInvalidos.push({ codigo: item.codigo, disponivel, digitado: dados.qnt });
      }
    }

    if (itensInvalidos.length > 0) {
      const lista = itensInvalidos
        .map(it => `${it.codigo}: disponível ${it.disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, digitado ${it.digitado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .join('\n');
      toast.error(`Itens ultrapassam 100% e impedem o salvamento:\n${lista}`);
      return;
    }

    try {
      // Persistir itens na tabela normalizada e bloquear a sessão
      if (!medicao.sessionId) {
        toast.error('Sessão de medição inválida. Recarregue a página.');
        return;
      }

      // Montar payload para upsert dos itens da medição ativa
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? null;

      const payload = Object.entries(medicao.dados)
        .map(([itemIdStr, dados]) => {
          const itemId = parseInt(itemIdStr);
          const item = items.find(i => i.id === itemId);
          if (!item || !item.codigo || !item.codigo.trim()) return null;

          const qtd = Number(dados.qnt) || 0;
          if (qtd <= 0) return null; // só persiste itens com QNT > 0
          const totalContrato = calcularTotalContratoComAditivos(item);
          const total = dados.total && !isNaN(dados.total)
            ? Number(dados.total)
            : (totalContrato > 0 ? (qtd / (item.quantidade || 1)) * totalContrato : 0);
          const pct = totalContrato > 0 ? (total / totalContrato) * 100 : 0;

          return {
            item_code: item.codigo,
            qtd,
            pct,
            total,
          };
        })
        .filter(Boolean) as { item_code: string; qtd: number; pct: number; total: number }[];

      if (payload.length === 0) {
        toast.error('Não há itens com quantidade para salvar.');
        return;
      }

      await upsertItems(medicao.sessionId, payload, userId);
      await blockSession(medicao.sessionId);

      setMedicoes(prevMedicoes =>
        prevMedicoes.map(m =>
          m.id === medicaoId
            ? {
                ...m,
                bloqueada: true,
                dataBloqueio: new Date().toLocaleString('pt-BR'),
                usuarioBloqueio: 'Usuário Atual',
              }
            : m
        )
      );

      // Calcular totais e disparar atualização para a página de obras
      const resumoFinanceiro = {
        obraId: obra.id,
        valorTotalOriginal: calcularValorTotalOriginal,
        totalAditivo: totaisGerais.aditivoTotal,
        totalContrato: calcularTotalContrato,
        servicosExecutados: totalServicosExecutados,
        valorAcumulado: valorAcumuladoTotal,
      };

      localStorage.setItem(`resumo_financeiro_${obra.id}`, JSON.stringify(resumoFinanceiro));
      window.dispatchEvent(new CustomEvent('medicaoAtualizada', { detail: resumoFinanceiro }));

      toast.success(`${medicao.nome} bloqueada e salva com sucesso! (${payload.length} itens)`);
    } catch (error) {
      console.error('Erro ao salvar medição:', error);
      toast.error(`Erro ao salvar medição no banco: ${ (error as any)?.message || 'Tente novamente.'}`);
    }
  };

  // Função para reabrir medição (apenas admins)
  const reabrirMedicao = async (medicaoId: number) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem reabrir medições.');
      return;
    }

    const medicao = medicoes.find(m => m.id === medicaoId);
    if (!medicao) return;
    if (!medicao.sessionId) {
      toast.error('Sessão de medição inválida.');
      return;
    }

    try {
      await reopenSession(medicao.sessionId);
      setMedicoes(prevMedicoes =>
        prevMedicoes.map(m =>
          m.id === medicaoId
            ? {
                ...m,
                bloqueada: false,
                dataBloqueio: undefined,
                usuarioBloqueio: undefined
              }
            : m
        )
      );
      toast.success(`${medicao.nome} foi reaberta para edição.`);
    } catch (error) {
      console.error('Erro ao reabrir medição:', error);
      toast.error('Erro ao reabrir medição');
    }
  };

  // Função para excluir medição (apenas admins)
  const excluirMedicao = async (medicaoId: number) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem excluir medições.');
      return;
    }

    try {
      const medicao = medicoes.find(m => m.id === medicaoId);
      if (!medicao) return;
      if (!medicao.sessionId) {
        toast.error('Sessão de medição inválida.');
        return;
      }

      await deleteSession(medicao.sessionId);

      // Remover do estado local
      setMedicoes(prevMedicoes => prevMedicoes.filter(m => m.id !== medicaoId));

      // Se a medição excluída era a atual, limpar seleção
      if (medicaoAtual === medicaoId) {
        setMedicaoAtual(null);
      }

      toast.success('Medição excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir medição:', error);
      toast.error('Erro ao excluir medição');
    }
  };
  const importarDados = async (dadosImportados: Item[]) => {
    if (!id) return;

    try {
      const dadosComNivel = dadosImportados.map((item, idx) => ({
        id: stableIdForRow(item.item, item.codigo, item.ordem ?? idx),
        item: item.item,
        codigo: item.codigo,
        banco: item.banco,
        descricao: item.descricao,
        und: item.und,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
        aditivo: { ...(item.aditivo || { qnt: 0, percentual: 0, total: 0 }) },
        totalContrato: item.totalContrato,
        importado: true,
        nivel: determinarNivel(item.item),
        ehAdministracaoLocal: false, // Inicialmente nenhum item é marcado como administração local
        ordem: item.ordem ?? idx
      }));
      
      const dadosComTotais = calcularTotaisHierarquicos(dadosComNivel);
      setItems(dadosComTotais);
      
      // Salvar items da planilha no banco de dados
      const itemsParaSalvar = dadosComTotais.map(item => ({
        obra_id: id,
        item: item.item,
        codigo: item.codigo,
        banco: item.banco,
        descricao: item.descricao,
        unidade: item.und,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        valor_total: item.valorTotal,
        total_contrato: item.totalContrato,
        nivel: item.nivel,
        eh_administracao_local: item.ehAdministracaoLocal,
        ordem: item.ordem
      }));

      // Primeiro, deletar items existentes da obra (se houver)
      await supabase
        .from('orcamento_items')
        .delete()
        .eq('obra_id', id);

      // Inserir novos items
      const { error } = await supabase
        .from('orcamento_items')
        .insert(itemsParaSalvar);

      if (error) throw error;
      
      // Limpar dados de medições ao importar nova planilha
      setMedicoes(medicoes.map(medicao => ({ ...medicao, dados: {} })));
      toast.success('Planilha importada e salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar planilha:', error);
      toast.error('Erro ao salvar planilha no banco de dados');
    }
  };

  // Função para obter estilo da linha baseado no nível
  const obterEstiloLinha = (item: Item) => {
    const n = determinarNivel(item.item);
    const maxNivel = items.length ? Math.max(...items.map(i => determinarNivel(i.item))) : 1;

    let baseClass = '';
    if (maxNivel === 2) {
      baseClass = n === 1 ? 'row-lv1' : 'row-lv3';
    } else { // maxNivel >= 3
      if (n === 1) baseClass = 'row-lv1';
      else if (n === 2) baseClass = 'row-lv2';
      else baseClass = 'row-lv3';
    }

    // Mantém destaque lateral para Administração Local sem alterar a regra de fundo
    if (item.ehAdministracaoLocal) {
      baseClass += ' border-l-4 border-purple-400';
    }

    return baseClass;
  };

  // Função para calcular valores acumulados até a medição atual com hierarquia
  const calcularValorAcumuladoItem = (itemId: number) => {
    if (!medicaoAtual) return 0;
    
    let totalAcumulado = 0;
    const sessionsParaSomar = medicoes.filter(m => m.bloqueada && m.id <= medicaoAtual);
    sessionsParaSomar.forEach(medicao => {
      const dadosHierarquicos = dadosHierarquicosMemoizados[medicao.id];
      if (dadosHierarquicos && dadosHierarquicos[itemId]) {
        totalAcumulado += dadosHierarquicos[itemId].total || 0;
      }
    });
    return totalAcumulado;
  };

  // Função para calcular percentual acumulado
  const calcularPercentualAcumulado = (itemId: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;
    
    const totalAcumulado = calcularValorAcumuladoItem(itemId);
    const totalContratoItem = calcularTotalContratoComAditivos(item);
    
    if (totalContratoItem === 0) return 0;
    return (totalAcumulado / totalContratoItem) * 100;
  };

  // Função para calcular quantidade acumulada com hierarquia
  const calcularQuantidadeAcumulada = (itemId: number) => {
    if (!medicaoAtual) return 0;
    
    let qntAcumulada = 0;
    const medicaoAtualIndex = medicoes.findIndex(m => m.id === medicaoAtual);
    
    for (let i = 0; i <= medicaoAtualIndex; i++) {
      const medicao = medicoes[i];
      const dadosHierarquicos = dadosHierarquicosMemoizados[medicao.id];
      if (dadosHierarquicos && dadosHierarquicos[itemId]) {
        qntAcumulada += dadosHierarquicos[itemId].qnt || 0;
      }
    }
    return qntAcumulada;
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
    aditivoTotal: aditivos.reduce((aditivoSum, aditivo) => {
      return aditivoSum + items.reduce((itemSum, item) => {
        const aditivoData = aditivo.dados[item.id];
        return itemSum + (aditivoData?.total || 0);
      }, 0);
    }, 0),
    totalContrato: items.reduce((sum, item) => sum + calcularTotalContratoComAditivos(item), 0),
    administracaoLocalTotal: items
      .filter(item => item.ehAdministracaoLocal)
      .reduce((sum, item) => sum + calcularTotalContratoComAditivos(item), 0)
  };

  // Calcular total de serviços executados na medição atual (incluindo administração local)
  const medicaoAtualData = medicaoAtual ? medicoes.find(m => m.id === medicaoAtual) : null;
  const totalServicosExecutados = medicaoAtualData ? 
    Object.entries(medicaoAtualData.dados).reduce((sum, [itemId, dados]) => {
      return sum + (dados.total || 0);
    }, 0) : 0;

  // Calcular valor acumulado - soma de todos os TOTAL das medições anteriores até a medição atual
  const calcularValorAcumuladoTotal = () => {
    if (!medicaoAtual) return 0;
    
    // Encontrar o índice da medição atual
    const medicaoAtualIndex = medicoes.findIndex(m => m.id === medicaoAtual);
    if (medicaoAtualIndex === -1) return 0;

    // Somar todas as medições até a atual (inclusive)
    let valorAcumulado = 0;
    
    for (let i = 0; i <= medicaoAtualIndex; i++) {
      const medicao = medicoes[i];
      if (medicao.dados) {
        Object.entries(medicao.dados).forEach(([itemId, dados]) => {
          valorAcumulado += dados.total || 0;
        });
      }
    }
    
    return valorAcumulado;
  };

  const valorAcumuladoTotal = calcularValorAcumuladoTotal();

  return (
    <div className="medicao-page min-h-screen bg-gray-50 py-3">
      <div className="content-root w-full">
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
        <div className="cards-grid mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Valor Total Original</div>
              <div className="text-2xl font-bold">{formatCurrency(calcularValorTotalOriginal)}</div>
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
              <div className="text-2xl font-bold text-green-600">{formatCurrency(calcularTotalContrato)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Serviços Executados</div>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalServicosExecutados)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Valor Acumulado</div>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(valorAcumuladoTotal)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Medições */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Medições
              </CardTitle>
              <Button onClick={criarNovaMedicao} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Medição
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {medicoes.map(medicao => (
                <div key={medicao.id} className="flex items-center gap-2">
                  <Button
                    variant={medicaoAtual === medicao.id ? "default" : "outline"}
                    onClick={() => setMedicaoAtual(medicao.id)}
                    className="text-sm"
                    disabled={medicao.bloqueada && !isAdmin}
                  >
                    {medicao.bloqueada && <Lock className="h-3 w-3 mr-1" />}
                    {medicao.nome}
                  </Button>
                  
                  {medicaoAtual === medicao.id && (
                    <div className="flex gap-1">
                      {!medicao.bloqueada ? (
                        <Button
                          size="sm"
                          onClick={() => salvarEBloquearMedicao(medicao.id)}
                          className="flex items-center gap-1"
                        >
                          <Lock className="h-3 w-3" />
                          Salvar e Bloquear
                        </Button>
                      ) : (
                        <>
                          <Badge variant="secondary" className="text-xs">
                            Concluído em {medicao.dataBloqueio}
                          </Badge>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reabrirMedicao(medicao.id)}
                                className="flex items-center gap-1"
                              >
                                <Unlock className="h-3 w-3" />
                                Reabrir
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="flex items-center gap-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Excluir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza de que deseja excluir a "{medicao.nome}"? 
                                      Esta ação não pode ser desfeita e todos os dados desta medição serão perdidos permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => excluirMedicao(medicao.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir Medição
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Aditivos */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Aditivos
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={mostrarAditivos ? "default" : "outline"}
                  onClick={() => setMostrarAditivos(!mostrarAditivos)}
                  className="flex items-center gap-2"
                >
                  {mostrarAditivos ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {mostrarAditivos ? 'Ocultar' : 'Mostrar'} Aditivos
                </Button>
                <Button onClick={() => setNovoAditivoAberto(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Aditivo
                </Button>
                <NovoAditivoModal
                  open={novoAditivoAberto}
                  onOpenChange={setNovoAditivoAberto}
                  onConfirm={confirmarNovoAditivo}
                />
              </div>
            </div>
          </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {aditivos.map(aditivo => (
                  <div key={aditivo.id} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm flex items-center gap-1">
                      {aditivo.bloqueada && <Lock className="h-3 w-3" />} {aditivo.nome}
                    </Badge>
                    <Button size="sm" onClick={() => salvarAditivo(aditivo.id)} className="h-7 px-2">Salvar</Button>
                    <Button size="sm" variant="outline" onClick={() => editarAditivo(aditivo.id)} className="h-7 px-2">Editar</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="h-7 px-2 flex items-center gap-1">
                          <Trash2 className="h-3 w-3" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir {aditivo.nome}?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => excluirAditivo(aditivo.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </CardContent>
        </Card>

        {/* Tabela Principal */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Planilha Orçamentária</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  onClick={calcularEDistribuirAdministracaoLocal}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Calcular Administração Local
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
          <CardContent className="p-1">
            <div className="table-wrap border rounded-lg">
              <div className="table-scroll">
                <Table className="text-xs table-fixed">
                  <colgroup>
                    <col style={{ width: '50px' }} />
                    <col style={{ width: '70px' }} />
                    <col style={{ width: '300px' }} />
                    <col style={{ width: '50px' }} />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '90px' }} />
                    <col style={{ width: '120px' }} />
                    {mostrarAditivos && aditivos.map((ad) => (
                      <React.Fragment key={`col-${ad.id}`}>
                        <col style={{ width: '70px' }} />
                        <col style={{ width: '50px' }} />
                        <col style={{ width: '80px' }} />
                      </React.Fragment>
                    ))}
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '70px' }} />
                    <col style={{ width: '50px' }} />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '70px' }} />
                    <col style={{ width: '50px' }} />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '60px' }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="bg-slate-100 border-b-2">
                      <TableHead className="w-[50px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Item</TableHead>
                      <TableHead className="w-[70px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Código Banco</TableHead>
                      <TableHead className="w-[300px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Descrição</TableHead>
                      <TableHead className="w-[50px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Und</TableHead>
                      <TableHead className="w-[80px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Quant.</TableHead>
                      <TableHead className="w-[90px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Valor unit com BDI e Desc.</TableHead>
                      <TableHead className="w-[120px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Valor total com BDI e Desconto</TableHead>
                      {mostrarAditivos && aditivos.map(aditivo => (
                        <React.Fragment key={`header-${aditivo.id}`}>
                          <TableHead className="w-[70px] bg-blue-100 font-bold text-center border border-blue-300 px-1 py-2 text-xs">QNT {aditivo.nome}</TableHead>
                          <TableHead className="w-[50px] bg-blue-100 font-bold text-center border border-blue-300 px-1 py-2 text-xs">% {aditivo.nome}</TableHead>
                          <TableHead className="w-[80px] bg-blue-100 font-bold text-center border border-blue-300 px-1 py-2 text-xs">TOTAL {aditivo.nome}</TableHead>
                        </React.Fragment>
                      ))}
                      <TableHead className="w-[120px] bg-green-100 font-bold text-center border border-green-300 px-1 py-2 text-xs">TOTAL CONTRATO</TableHead>
                      <TableHead className="w-[70px] bg-yellow-100 font-bold text-center border border-yellow-300 px-1 py-2 text-xs">QNT</TableHead>
                      <TableHead className="w-[50px] bg-yellow-100 font-bold text-center border border-yellow-300 px-1 py-2 text-xs">%</TableHead>
                      <TableHead className="w-[80px] bg-yellow-100 font-bold text-center border border-yellow-300 px-1 py-2 text-xs">TOTAL</TableHead>
                      <TableHead className="w-[70px] bg-purple-100 font-bold text-center border border-purple-300 px-1 py-2 text-xs">QNT</TableHead>
                      <TableHead className="w-[50px] bg-purple-100 font-bold text-center border border-purple-300 px-1 py-2 text-xs">%</TableHead>
                      <TableHead className="w-[80px] bg-purple-100 font-bold text-center border border-purple-300 px-1 py-2 text-xs">TOTAL</TableHead>
                      <TableHead className="w-[60px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Admin. Local</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...items].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(item => {
                      // Usar dados hierárquicos memoizados para performance
                      const medicaoData = medicaoAtual ? (dadosHierarquicosMemoizados[medicaoAtual]?.[item.id] || { qnt: 0, percentual: 0, total: 0 }) : { qnt: 0, percentual: 0, total: 0 };
                      const estiloLinha = obterEstiloLinha(item);
                      const medicaoAtualObj = medicaoAtual ? medicoes.find(m => m.id === medicaoAtual) : null;
                      
                      return (
                        <TableRow key={`row-${item.id}-${item.ordem ?? 0}`} className={`${estiloLinha} border-b hover:bg-slate-50 transition-colors text-xs`}>
                          <TableCell className="border border-gray-300 p-1">
                            <div className="text-center font-mono text-xs font-bold px-1">
                              {item.item}
                            </div>
                          </TableCell>
                          <TableCell className="border border-gray-300 p-1">
                            <div className="text-center font-mono text-xs px-1">
                              {item.codigo}
                            </div>
                          </TableCell>
                          <TableCell className="border border-gray-300 p-1 max-w-xs" title={item.descricao}>
                            <div className="text-xs px-1 truncate">
                              {item.descricao}
                            </div>
                          </TableCell>
                          {/* Und */}
                          <TableCell className="border border-gray-300 p-1">
                            <div className="text-center font-mono text-xs px-1">
                              {item.und}
                            </div>
                          </TableCell>
                          {/* Quant. */}
                          <TableCell className="border border-gray-300 p-1">
                            <div className="text-right font-mono text-xs px-1">
                              {determinarNivel(item.item) === 1
                                ? ''
                                : item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </TableCell>
                          {/* Valor unit com BDI e Desc. */}
                          <TableCell className="border border-gray-300 p-1">
                            <div className="text-right font-mono text-xs px-1">
                              {determinarNivel(item.item) === 1
                                ? ''
                                : `R$ ${item.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </div>
                          </TableCell>
                          {/* Valor total com BDI e Desconto */}
                          <TableCell className="border border-gray-300 p-1">
                            <div className="text-right font-mono text-xs px-1">
                              R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </TableCell>
                          {mostrarAditivos && aditivos.map(aditivo => {
                            const aditivoData = aditivo.dados[item.id] || { qnt: 0, percentual: 0, total: 0 };
                            return (
                              <React.Fragment key={`aditivo-${aditivo.id}-${item.id}`}>
                                <TableCell className="bg-blue-100 border border-blue-300 p-1">
                                  <Input
                                    type="number"
                                    value={aditivoData.qnt || ''}
                                    onChange={(e) => atualizarAditivo(item.id, aditivo.id, 'qnt', e.target.value)}
                                    className="w-full h-6 text-xs font-mono text-right border-0 bg-transparent p-1"
                                    step="0.01"
                                    min="0"
                                  />
                                </TableCell>
                                <TableCell className="bg-blue-100 border border-blue-300 p-1">
                                  <div className="text-center font-mono text-xs px-1">
                                    {aditivoData.percentual.toFixed(2)}%
                                  </div>
                                </TableCell>
                                <TableCell className="bg-blue-100 border border-blue-300 p-1">
                                  <div className="text-right font-mono text-xs px-1">
                                    R$ {aditivoData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </TableCell>
                              </React.Fragment>
                            );
                          })}
                          <TableCell className="bg-green-100 border border-green-300 p-1">
                            <div className="text-right font-mono text-xs px-1 font-bold">
                              R$ {calcularTotalContratoComAditivos(item).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </TableCell>
                          <TableCell className="bg-yellow-100 border border-yellow-300 p-1">
                            {medicaoAtual && medicaoAtualObj ? (
                              ehItemFolha(item.item) && !item.ehAdministracaoLocal ? (
                                <Input
                                  type="number"
                                  value={medicaoData.qnt || ''}
                                  onChange={(e) => onChangeMedicaoDebounced(item.id, medicaoAtual, 'qnt', e.target.value)}
                                  className="w-full h-6 text-xs font-mono text-right border-0 bg-transparent p-1"
                                  step="0.01"
                                  min="0"
                                  disabled={medicaoAtualObj.bloqueada && !isAdmin}
                                />
                              ) : (
                                ehItemFolha(item.item) ? (
                                  <div className="text-right font-mono text-xs px-1">
                                    {medicaoData.qnt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                ) : (
                                  <div className="text-right font-mono text-xs px-1"></div>
                                )
                              )
                            ) : (
                              <div className="text-right font-mono text-xs px-1 text-muted-foreground">
                                Selecione uma medição
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="bg-yellow-100 border border-yellow-300 p-1">
                            <div className="text-center font-mono text-xs px-1">
                              {(
                                (calcularTotalContratoComAditivos(item) > 0
                                  ? (medicaoData.total / calcularTotalContratoComAditivos(item)) * 100
                                  : 0)
                              ).toFixed(2)}%
                            </div>
                          </TableCell>
                          <TableCell className="bg-yellow-100 border border-yellow-300 p-1">
                            <div className="text-right font-mono text-xs px-1">
                              R$ {medicaoData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </TableCell>
                          <TableCell className="bg-purple-100 border border-purple-300 p-1">
                            {ehItemFolha(item.item) ? (
                              <div className="text-right font-mono text-xs px-1">
                                {calcularQuantidadeAcumulada(item.id).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            ) : (
                              <div className="text-right font-mono text-xs px-1"></div>
                            )}
                          </TableCell>
                          <TableCell className="bg-purple-100 border border-purple-300 p-1">
                            <div className="text-center font-mono text-xs px-1">
                              {calcularPercentualAcumulado(item.id).toFixed(2)}%
                            </div>
                          </TableCell>
                          <TableCell className="bg-purple-100 border border-purple-300 p-1">
                            <div className="text-right font-mono text-xs px-1">
                              R$ {calcularValorAcumuladoItem(item.id).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </TableCell>
                          <TableCell className="border border-gray-300 p-1">
                            <div className="flex gap-1 justify-center">
                              <Button
                                variant={item.ehAdministracaoLocal ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleAdministracaoLocal(item.id)}
                                className="h-6 w-8 p-0 text-xs"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}