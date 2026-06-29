import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calculator, FileText, Plus, Trash2, Upload, Eye, EyeOff, Settings, Zap, Check, Lock, Unlock, MoreVertical, Download, Pencil, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ImportarPlanilha from '@/components/ImportarPlanilha';
import { ImportarDoRDO } from '@/components/ImportarDoRDO';
import NovoAditivoModal from '@/components/NovoAditivoModal';
import { RelatorioMedicaoModal } from '@/components/RelatorioMedicaoModal';
import { AjustarMedicaoCongeladaModal } from '@/components/AjustarMedicaoCongeladaModal';
import { NovaMedicaoDialog, type NovaMedicaoData } from '@/components/NovaMedicaoDialog';
import { ImportarCronograma } from '@/components/ImportarCronograma';
import { CronogramaView } from '@/components/CronogramaView';
import * as LoadingStates from '@/components/LoadingStates';
import { useUserRole } from '@/hooks/useUserRole';
import { useCanEditObra } from '@/hooks/useCanEditObra';
import { useMedicaoSessions } from '@/hooks/useMedicaoSessions';
import { useMedicaoItems } from '@/hooks/useMedicaoItems';
import { useAditivoSessions } from '@/hooks/useAditivoSessions';
import { useAditivoItems } from '@/hooks/useAditivoItems';
import { ResumoContrato } from '@/components/ResumoContrato';
import { ObraAuditLogs } from '@/components/ObraAuditLogs';
import { ExportMedicaoDialog } from '@/components/ExportMedicaoDialog';
import { useObraActionLogs } from '@/hooks/useObraActionLogs';
import { useMedicoesFinanceiro } from '@/hooks/useMedicoesFinanceiro';
import { readExcelFile, readCsvAsExcel, writeExcelFile } from '@/lib/excelUtils';
import { generatePdfFromElementAutoPage } from '@/lib/pdfExport';

interface Obra {
  id: string;
  nome: string;
  municipio: string;
  valor_total: number;
  valor_aditivado?: number;
  valor_executado?: number;
  n_contrato?: string;
  empresa_responsavel?: string;
  percentual_desconto?: number;
  tempo_obra?: number;
  aditivo_prazo?: number;
  data_inicio?: string;
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
  valorTotalSemDesconto: number; // Valor original da planilha (coluna I - Total sem Desconto)
  aditivo: { qnt: number; percentual: number; total: number };
  totalContrato: number;
  importado: boolean;
  nivel: number;
  ehAdministracaoLocal: boolean;
  ordem: number;
  origem?: string;
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
  dados: { [itemId: number]: { qnt: number; percentual: number; total: number; valorUnitario?: number } };
  sessionId?: string; // Supabase aditivo_sessions.id
  sequencia?: number;
  bloqueada?: boolean;
  created_at?: string;
}

// Datas: formatação pt-BR
const formatDateTimePTBR = (iso?: string) => {
  if (!iso) return '';
  try {
    return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch {
    return '';
  }
};

const relativeTimePTBR = (iso?: string) => {
  if (!iso) return '';
  try {
    return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: true });
  } catch {
    return '';
  }
};

export function Medicao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, canEdit: roleCanEdit } = useUserRole();
  const { canEditObra, loading: permissionLoading } = useCanEditObra(id);
  // Permissão efetiva: admin sempre pode, outros usam canEditObra
  const canEdit = isAdmin ? roleCanEdit : canEditObra;
  const { dados: dadosMedicaoFinanceiro } = useMedicoesFinanceiro(id || '');
  const valorAcumuladoCalculado = useMemo(
    () => Math.round((dadosMedicaoFinanceiro.valorAcumulado || 0) * 100) / 100,
    [dadosMedicaoFinanceiro.valorAcumulado]
  );
  const { createSession, blockSession, reopenSession, deleteSession } = useMedicaoSessions();
  const { createSession: createAditivoSession, reopenSession: reopenAditivoSession, deleteSession: deleteAditivoSession, fetchSessionsWithItems: fetchAditivoSessions, blockSession: blockAditivoSession } = useAditivoSessions();
  const { upsertItems } = useMedicaoItems();
  const { upsertItems: upsertAditivoItems } = useAditivoItems();
  const { 
    logMedicaoSalva, 
    logMedicaoBloqueada, 
    logMedicaoReaberta,
    logMedicaoExcluida, 
    logAditivoCriado, 
    logAditivoBloqueado, 
    logAditivoReaberto,
    logPlanilhaImportada,
    logCronogramaImportado,
    logRelatorioExportado
  } = useObraActionLogs();
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados do sistema de medição
  const [items, setItems] = useState<Item[]>([]);

  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [aditivos, setAditivos] = useState<Aditivo[]>([]);

  const [medicaoAtual, setMedicaoAtual] = useState<number | null>(null);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [modalImportarRDOAberto, setModalImportarRDOAberto] = useState(false);
  const [mostrarAditivos, setMostrarAditivos] = useState(true);
  const [novoAditivoAberto, setNovoAditivoAberto] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; type?: 'reabrir-medicao' | 'excluir-medicao' | 'excluir-aditivo' | 'limpar-planilha'; medicaoId?: number; aditivoId?: number }>({ open: false });
  const [editandoDesconto, setEditandoDesconto] = useState(false);
  const [novoDesconto, setNovoDesconto] = useState('');
  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  const [modalAjustarCongeladaOpen, setModalAjustarCongeladaOpen] = useState(false);
  const [exportDialogAberto, setExportDialogAberto] = useState(false);
  const [reimportarAditivoId, setReimportarAditivoId] = useState<number | null>(null);
  const fileInputReimportRef = React.useRef<HTMLInputElement>(null);

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
        .select('*, empresas(razao_social)')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      // Usar razao_social da empresa vinculada se não tiver empresa_responsavel
      if (data) {
        const empresaData = data.empresas as { razao_social: string } | null;
        if (!data.empresa_responsavel && empresaData?.razao_social) {
          data.empresa_responsavel = empresaData.razao_social;
        }
      }
      
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
      let codigoBancoMap = new Map<string, number>();
      
      // Primeiro, buscar os items da planilha orçamentária
      const { data: orcamentoItems, error: orcamentoError } = await supabase
        .from('orcamento_items')
        .select('*')
        .eq('obra_id', id)
        .order('ordem', { ascending: true });

      if (orcamentoError) throw orcamentoError;

      if (orcamentoItems && orcamentoItems.length > 0) {
        // Converter items do orçamento para o formato da interface (normalizando códigos)
        const itemsConvertidos: Item[] = orcamentoItems.map(item => {
          const codigoHierarquico = String(item.item ?? '').trim();
          const codigoBanco = String(item.codigo ?? '').trim();
          return {
            id: stableIdForRow(codigoHierarquico, codigoBanco, item.ordem || 0),
            item: codigoHierarquico,
            codigo: codigoBanco,
            banco: item.banco,
            descricao: item.descricao,
            und: item.unidade,
            quantidade: item.quantidade,
            valorUnitario: item.valor_unitario,
            valorTotal: item.valor_total,
            valorTotalSemDesconto: (item as any).valor_total_sem_desconto || 0,
            aditivo: { qnt: 0, percentual: 0, total: 0 },
            totalContrato: item.total_contrato,
            importado: true,
            nivel: item.nivel,
            ehAdministracaoLocal: item.eh_administracao_local,
            ordem: item.ordem || 0,
            origem: item.origem || 'contratual'
          } as Item;
        });

        // Criar mapas de código para ID
        itemsConvertidos.forEach(i => {
          const codeHier = String(i.item || '').trim();
          const codeBanco = String(i.codigo || '').trim();
          
          // Mapear código hierárquico
          if (codeHier) {
            codigoToIdMap.set(codeHier, i.id);
          }
          
          // Mapear código de banco para compatibilidade com dados antigos
          if (codeBanco) {
            codigoBancoMap.set(codeBanco, i.id);
          }
        });

        setItems(itemsConvertidos);
      }

      // Depois, buscar as sessões de medição normalizadas e seus itens
      const { data: sessions, error: sessionsError } = await supabase
        .from('medicao_sessions')
        .select('id, sequencia, status, created_at, medicao_items ( item_code, qtd, pct, total, qtd_congelado, pct_congelado, total_congelado )')
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
          itens.forEach((itRaw: any) => {
            // Aplicar snapshot: se a medição foi bloqueada e os valores foram
            // congelados, usar os valores congelados como fonte da verdade.
            const it = itRaw.total_congelado != null ? {
              ...itRaw,
              qtd: itRaw.qtd_congelado ?? itRaw.qtd,
              pct: itRaw.pct_congelado ?? itRaw.pct,
              total: itRaw.total_congelado,
            } : itRaw;
            const code = (it.item_code || '').trim();
            // Tentar primeiro com código hierárquico, depois fallback para código de banco
            let mappedId = codigoToIdMap.get(code);
            if (!mappedId) {
              mappedId = codigoBancoMap.get(code);
            }
            // Ignorar apenas se realmente não encontrar correspondência
            if (!mappedId) {
              return;
            }
            const qtd = Number(it.qtd) || 0;
            let pct = Number(it.pct) || 0;
            // Corrigir imprecisão de ponto flutuante: se pct >= 99.99 e qtd ≈ quantidade do item, forçar 100
            const orcItem = orcamentoItems?.find((oi: any) => {
              const c = String(oi.item || '').trim();
              return codigoToIdMap.get(c) === mappedId;
            });
            if (orcItem && pct > 99.98 && pct < 100) {
              const quantidadeTotal = Number(orcItem.quantidade) || 0;
              if (quantidadeTotal > 0 && Math.abs(qtd - quantidadeTotal) / quantidadeTotal < 0.005) {
                pct = 100;
              }
            }
            m.dados[mappedId] = {
              qnt: qtd,
              percentual: pct,
              total: Number(it.total) || 0,
            };
          });
          return m;
        });
        setMedicoes(medicoesConvertidas);
        setMedicaoAtual(medicoesConvertidas[0]?.id ?? null);
      }

      // Buscar sessões de aditivo e itens (incluindo valor_unitario específico do aditivo)
      const { data: adSessions, error: adSessionsError } = await supabase
        .from('aditivo_sessions')
        .select('id, sequencia, status, created_at, aditivo_items ( item_code, qtd, pct, total, valor_unitario )')
        .eq('obra_id', id)
        .order('created_at', { ascending: true });
      if (adSessionsError) throw adSessionsError;
      if (adSessions && adSessions.length > 0) {
        // Carregar/atualizar mapa de numeração persistido em localStorage
        const mapKey = `aditivo_numbers_${id}`;
        let numMap: Record<string, number> = {};
        try { numMap = JSON.parse(localStorage.getItem(mapKey) || '{}') || {}; } catch {}

        // Remover entradas de sessões que não existem mais
        const sessionIds = new Set(adSessions.map((s: any) => s.id));
        Object.keys(numMap).forEach((sid) => { if (!sessionIds.has(sid)) delete numMap[sid]; });

        // Helper para pegar o menor número livre
        const used = new Set<number>(Object.values(numMap));
        const nextFree = () => { let n = 1; while (used.has(n)) n++; used.add(n); return n; };

        // Atribuir números faltantes seguindo ordem de criação
        adSessions.forEach((s: any) => { if (!numMap[s.id]) numMap[s.id] = nextFree(); });
        try { localStorage.setItem(mapKey, JSON.stringify(numMap)); } catch {}

        const aditivosConvertidos: Aditivo[] = adSessions.map((s: any) => {
          const numero = numMap[s.id];
          const a: Aditivo = {
            id: numero,                 // número sequencial do aditivo
            nome: `ADITIVO ${numero}`,
            dados: {},
            sessionId: s.id,
            sequencia: s.sequencia,     // medição a partir da qual passa a valer
            bloqueada: s.status === 'bloqueada',
            created_at: s.created_at,
          };
          const itens = (s.aditivo_items || []) as any[];
          itens.forEach((it: any) => {
            const code = (it.item_code || '').trim();
            // Tentar primeiro com código hierárquico, depois fallback para código de banco
            let mappedId = codigoToIdMap.get(code);
            if (!mappedId) {
              mappedId = codigoBancoMap.get(code);
            }
            // Ignorar apenas se realmente não encontrar correspondência
            if (!mappedId) {
              return;
            }
            a.dados[mappedId] = {
              qnt: Number(it.qtd) || 0,
              percentual: Number(it.pct) || 0,
              total: Number(it.total) || 0,
              valorUnitario: Number(it.valor_unitario) || 0, // Valor unitário específico do aditivo
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
  // Função para calcular total do contrato incluindo aditivos hierárquicos (soma filhos)
  const calcularTotalContratoComAditivos = (item: Item, seqLimit?: number) => {
    // Coletar IDs de todos os descendentes do item (níveis abaixo)
    const coletarDescendentesIds = (codigo: string): number[] => {
      const stack: string[] = [codigo];
      const ids: number[] = [];
      while (stack.length) {
        const current = stack.pop()!;
        const filhos = childrenByCode.get(current)?.map(f => ({ codigo: f.item, id: f.id })) || [];
        filhos.forEach(f => {
          ids.push(f.id);
          stack.push(f.codigo);
        });
      }
      return ids;
    };

    const idsParaSomar = [item.id, ...coletarDescendentesIds(item.item)];

    // TOTAL CONTRATO = Valor total com BDI e Desconto + soma de TODOS os aditivos bloqueados
    // Se seqLimit for informado, considera apenas aditivos com sequência <= seqLimit
    // Caso contrário, considera TODOS os aditivos bloqueados
    //
    // IMPORTANTE: para itens EXTRACONTRATUAIS o `item.totalContrato` armazenado em
    // `orcamento_items.total_contrato` já é, por definição, o valor proveniente do
    // aditivo que criou o item. Se somarmos novamente a contribuição do aditivo a
    // partir de `aditivo_items`, o total fica dobrado e a medição paga em dobro
    // (caso real observado: obra de Nobres, 4ª medição, item 27.1).
    // Para esses itens, zeramos o valor "original" e usamos somente a soma dos
    // aditivos como fonte de verdade (que já cobre múltiplos aditivos do mesmo item).
    const ehExtracontratual = item.origem === 'extracontratual';
    const valorOriginal = ehExtracontratual ? 0 : item.totalContrato;
    const totalAditivos = aditivos
      .filter(a => {
        if (!a.bloqueada) return false;
        // Se houver limite de sequência, filtrar; caso contrário, incluir todos os bloqueados
        if (seqLimit !== undefined && a.sequencia !== undefined) {
          return a.sequencia <= seqLimit;
        }
        return true; // Incluir todos os aditivos bloqueados
      })
      .reduce((sum, aditivo) => {
        const subtotal = idsParaSomar.reduce((acc, id) => acc + (aditivo.dados[id]?.total || 0), 0);
        return sum + subtotal;
      }, 0);

    return valorOriginal + totalAditivos;
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

  // Função para calcular Valor Total Original (soma dos itens folha contratuais)
  const calcularValorTotalOriginal = useMemo(() => {
    return items
      .filter(item => ehItemFolha(item.item) && item.origem !== 'extracontratual')
      .reduce((total, item) => total + item.valorTotal, 0);
  }, [items]);

  // Função para calcular Total do Contrato para a medição corrente (nível 1), usando aditivos publicados anteriores
  const calcularTotalContrato = useMemo(() => {
    return items
      .filter(item => ehItemPrimeiroNivel(item.item))
      .reduce((total, item) => total + calcularTotalContratoComAditivos(item), 0);
  }, [items, aditivos, medicaoAtual]);

  // Totais finais (para cards/resumo): somam apenas aditivos publicados
  const totalAditivoBloqueado = useMemo(() => {
    return aditivos
      .filter(a => a.bloqueada)
      .reduce((adSum, a) => {
        return adSum + items.reduce((itemSum, item) => itemSum + (a.dados[item.id]?.total || 0), 0);
      }, 0);
  }, [aditivos, items]);

  const totalContratoFinal = useMemo(() => calcularValorTotalOriginal + totalAditivoBloqueado, [calcularValorTotalOriginal, totalAditivoBloqueado]);

  // Cálculos detalhados para o resumo financeiro
  const resumoFinanceiro = useMemo(() => {
    // TOTAL DE SERVIÇOS ACRESCIDOS = soma dos valores positivos de itens contratuais no aditivo
    const totalServicosAcrescidos = aditivos
      .filter(a => a.bloqueada)
      .reduce((total, a) => {
        return total + items
          .filter(item => item.origem === 'contratual')
          .reduce((itemSum, item) => {
            const valorAditivo = a.dados[item.id]?.total || 0;
            return itemSum + (valorAditivo > 0 ? valorAditivo : 0);
          }, 0);
      }, 0);

    // TOTAL DE SERVIÇOS DECRESCIDOS = soma dos valores negativos no aditivo
    const totalServicosDecrescidos = Math.abs(aditivos
      .filter(a => a.bloqueada)
      .reduce((total, a) => {
        return total + items
          .reduce((itemSum, item) => {
            const valorAditivo = a.dados[item.id]?.total || 0;
            return itemSum + (valorAditivo < 0 ? valorAditivo : 0);
          }, 0);
      }, 0));

    // TOTAL DOS SERVIÇOS EXTRACONTRATUAIS = valor total dos itens extracontratuais
    const totalServicosExtracontratuais = aditivos
      .filter(a => a.bloqueada)
      .reduce((total, a) => {
        return total + items
          .filter(item => item.origem === 'extracontratual')
          .reduce((itemSum, item) => itemSum + (a.dados[item.id]?.total || 0), 0);
      }, 0);

    // TOTAL DOS SERVIÇOS ACRESCIDOS + EXTRACONTRATUAIS
    const totalAcrescidosEExtracontratuais = totalServicosAcrescidos + totalServicosExtracontratuais;

    return {
      valorInicialContrato: calcularValorTotalOriginal,
      totalGeralAditivo: totalAditivoBloqueado,
      totalServicosAcrescidos,
      totalServicosDecrescidos,
      totalServicosExtracontratuais,
      totalAcrescidosEExtracontratuais,
      valorContratoPosAditivo: totalContratoFinal
    };
  }, [calcularValorTotalOriginal, totalAditivoBloqueado, totalContratoFinal, aditivos, items]);

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
          // Sempre usar a soma dos filhos truncados para garantir consistência
          item.valorTotal = somaValorTotal;
          item.aditivo.total = filhos.reduce((sum, filho) => sum + filho.aditivo.total, 0);
          item.totalContrato = filhos.reduce((sum, filho) => sum + filho.totalContrato, 0);
          
          // Calcular valor unitário sem truncamento para preservar precisão nos aditivos
          if (item.quantidade > 0) {
            item.valorUnitario = item.valorTotal / item.quantidade;
          }
        }
      });
    }
    
    return itemsComTotais;
  };

  // Filtrar aditivos que devem aparecer na planilha:
  // 1) Aditivos que já têm itens com valor > 0 (aditivos de valor já preenchidos)
  // 2) OU aditivos não bloqueados (em edição, para permitir inserção manual de quantitativos)
  const aditivosComValor = useMemo(() => {
    return aditivos.filter(aditivo => {
      // Aditivos não bloqueados sempre aparecem para permitir inserção manual
      if (!aditivo.bloqueada) return true;
      // Aditivos bloqueados: só mostrar se tiverem itens com valor (positivo OU negativo para supressões)
      const temValor = Object.values(aditivo.dados).some((d: any) => (d.total || 0) !== 0 || (d.qnt || 0) !== 0);
      return temValor;
    });
  }, [aditivos]);

  function calcularDistribuicaoAdministracaoLocal({
    medicaoSeq,
    dadosBase,
    sessoesAnteriores,
    dadosCalculadosPorSessao = {},
  }: {
    medicaoSeq: number;
    dadosBase: { [itemId: number]: { qnt: number; percentual: number; total: number } };
    sessoesAnteriores: Medicao[];
    dadosCalculadosPorSessao?: {
      [medicaoId: number]: { [itemId: number]: { qnt: number; percentual: number; total: number } };
    };
  }) {
    const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
    const itensFolhaAL = items.filter(item => item.ehAdministracaoLocal && ehItemFolha(item.item));

    if (itensFolhaAL.length === 0) {
      return {
        dados: dadosBase,
        porcentagemExecucaoAcumulada: 0,
        totalServicosExecutados: 0,
        recalculado: false,
        mensagemErro: null as string | null,
      };
    }

    let totalServicosExecutados = 0;

    sessoesAnteriores.forEach(sesAnterior => {
      items.forEach(item => {
        if (!item.ehAdministracaoLocal && ehItemFolha(item.item)) {
          totalServicosExecutados += dadosCalculadosPorSessao[sesAnterior.id]?.[item.id]?.total
            ?? sesAnterior.dados[item.id]?.total
            ?? 0;
        }
      });
    });

    items.forEach(item => {
      if (!item.ehAdministracaoLocal && ehItemFolha(item.item)) {
        totalServicosExecutados += dadosBase[item.id]?.total || 0;
      }
    });

    const totalDoContrato = items
      .filter(item => ehItemFolha(item.item))
      .reduce((sum, item) => sum + calcularTotalContratoComAditivos(item, medicaoSeq), 0);

    const totalAdministracaoLocal = itensFolhaAL
      .reduce((sum, item) => sum + calcularTotalContratoComAditivos(item, medicaoSeq), 0);

    if (totalServicosExecutados <= 0) {
      return {
        dados: dadosBase,
        porcentagemExecucaoAcumulada: 0,
        totalServicosExecutados,
        recalculado: false,
        mensagemErro: 'Nenhum serviço foi medido ainda. Insira valores de medição antes de calcular a administração local.',
      };
    }

    const divisor = totalDoContrato - totalAdministracaoLocal;
    if (divisor <= 0) {
      return {
        dados: dadosBase,
        porcentagemExecucaoAcumulada: 0,
        totalServicosExecutados,
        recalculado: false,
        mensagemErro: 'Erro no cálculo: Total do Contrato - Total Administração Local deve ser maior que zero.',
      };
    }

    let porcentagemExecucaoAcumulada = Math.min(totalServicosExecutados / divisor, 1);
    if (porcentagemExecucaoAcumulada >= 0.999) {
      porcentagemExecucaoAcumulada = 1;
    }

    const novosDados = { ...dadosBase };

    itensFolhaAL.forEach(item => {
      const totalContratoAjustado = calcularTotalContratoComAditivos(item, medicaoSeq);
      const qntAditivoAcum = aditivos
        .filter(a => a.bloqueada && (a.sequencia === undefined || a.sequencia <= medicaoSeq))
        .reduce((sum, a) => sum + (a.dados[item.id]?.qnt || 0), 0);
      const quantidadeAjustada = item.quantidade + qntAditivoAcum;

      const alAcumuladoAnteriorTotal = sessoesAnteriores.reduce((sum, sesAnterior) => {
        return sum + (
          dadosCalculadosPorSessao[sesAnterior.id]?.[item.id]?.total
          ?? sesAnterior.dados[item.id]?.total
          ?? 0
        );
      }, 0);

      const alAcumuladoAnteriorQnt = sessoesAnteriores.reduce((sum, sesAnterior) => {
        return sum + (
          dadosCalculadosPorSessao[sesAnterior.id]?.[item.id]?.qnt
          ?? sesAnterior.dados[item.id]?.qnt
          ?? 0
        );
      }, 0);

      const totalAcumuladoAL = porcentagemExecucaoAcumulada * totalContratoAjustado;
      const qntAcumuladaAL = porcentagemExecucaoAcumulada * quantidadeAjustada;

      novosDados[item.id] = {
        qnt: qntAcumuladaAL - alAcumuladoAnteriorQnt,
        percentual: porcentagemExecucaoAcumulada * 100,
        total: round2(totalAcumuladoAL - alAcumuladoAnteriorTotal),
      };
    });

    return {
      dados: novosDados,
      porcentagemExecucaoAcumulada,
      totalServicosExecutados,
      recalculado: true,
      mensagemErro: null as string | null,
    };
  }

  // Memoizar dados hierárquicos para performance usando mapa de filhos
  const dadosHierarquicosMemoizados = useMemo(() => {
    const cache: { [medicaoId: number]: { [itemId: number]: { qnt: number; percentual: number; total: number } } } = {};

    medicoes.forEach(medicao => {
      // IMPORTANTE: Copiar os dados originais da medição salvos no banco
      // Estes valores NÃO devem ser sobrescritos para itens folha
      const dadosCalculados: { [itemId: number]: { qnt: number; percentual: number; total: number } } = { ...medicao.dados };

      // --- Calcular Administração Local inline (mesmo sem o useEffect ter rodado) ---
      // medicao.id == sequência da medição; usar como seqLimit para não incluir aditivos futuros
      const medicaoSeqInline = medicao.id;
      const hasAdminLocal = items.some(item => item.ehAdministracaoLocal);
      if (hasAdminLocal && !medicao.bloqueada) {
        const sessoesAnteriores = medicoes.filter(m => m.id < medicao.id);
        const { dados } = calcularDistribuicaoAdministracaoLocal({
          medicaoSeq: medicaoSeqInline,
          dadosBase: dadosCalculados,
          sessoesAnteriores,
          dadosCalculadosPorSessao: cache,
        });

        Object.assign(dadosCalculados, dados);
      }
      // --- Fim cálculo AL ---

      // Processar do nível mais profundo até o nível 1 para calcular agregações hierárquicas
      // ATENÇÃO: Apenas recalcular valores para itens MACRO (que possuem filhos)
      // Itens FOLHA devem manter os valores originais do banco
      for (let nivel = maxNivelHierarquia; nivel >= 1; nivel--) {
        const codes = codesByLevel.get(nivel) || [];
        codes.forEach(code => {
          const parent = itemsByCode.get(code);
          if (!parent) return;
          const filhos = childrenByCode.get(code) || [];
          
          // Se não tem filhos, é um item folha - NÃO recalcular, manter valor original
          if (filhos.length === 0) return;

          // Item MACRO: calcular somando os valores dos filhos
          let qntTotal = 0;
          let valorTotal = 0;
          filhos.forEach(filho => {
            const dadosFilho = dadosCalculados[filho.id] || { qnt: 0, percentual: 0, total: 0 };
            qntTotal += dadosFilho.qnt || 0;
            valorTotal += dadosFilho.total || 0;
          });

          const totalContratoParent = calcularTotalContratoComAditivos(parent, medicao.id);
          const percentualCalculado = totalContratoParent > 0 ? (valorTotal / totalContratoParent) * 100 : 0;
          
          // Sobrescrever APENAS para itens MACRO (pais)
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
  }, [medicoes, itemsByCode, childrenByCode, maxNivelHierarquia, codesByLevel, items, aditivos]);


  // Função para calcular percentual baseado na quantidade
  const calcularPercentual = (quantidade: number, quantidadeTotal: number) => {
    if (quantidadeTotal === 0) return 0;
    return (quantidade / quantidadeTotal) * 100;
  };

  // Sincronizar resumo financeiro (localStorage + evento) SEMPRE, antes de retornos condicionais
  React.useEffect(() => {
    if (!obra?.id) return;

    // 1) Valor Total Original = soma dos itens folha (valorTotal importado)
    const valorTotalOriginal = items
      .filter(item => ehItemFolha(item.item) && item.origem !== 'extracontratual')
      .reduce((total, item) => total + item.valorTotal, 0);

    // 2) Total Aditivo = soma dos aditivos de todos os itens
    const totalAditivo = aditivos.reduce((aditivoSum, aditivo) => {
      return aditivoSum + items.reduce((itemSum, item) => {
        const aditivoData = aditivo.dados[item.id];
        return itemSum + (aditivoData?.total || 0);
      }, 0);
    }, 0);

    // 3) Total do Contrato (final) = soma dos itens FOLHA (MICROs) com aditivos
    // IMPORTANTE: Somar apenas itens folha para evitar dupla contagem
    const totalContrato = items
      .filter(item => ehItemFolha(item.item))
      .reduce((sum, item) => sum + calcularTotalContratoComAditivos(item), 0);

    // 4) Serviços Executados (medição atual)
    const medicaoAtualData = medicaoAtual ? medicoes.find(m => m.id === medicaoAtual) : null;
    const servicosExecutados = medicaoAtualData
      ? Object.values(medicaoAtualData.dados).reduce((sum, d: any) => sum + (d.total || 0), 0)
      : 0;

    const resumoFinanceiro = {
      obraId: obra.id,
      valorTotalOriginal,
      totalAditivo,
      totalContrato,
      servicosExecutados,
      valorAcumulado: valorAcumuladoCalculado,
    };

    try {
      localStorage.setItem(`resumo_financeiro_${obra.id}`, JSON.stringify(resumoFinanceiro));
      window.dispatchEvent(new CustomEvent('medicaoAtualizada', { detail: resumoFinanceiro }));
    } catch {}
  }, [obra?.id, items, aditivos, medicoes, medicaoAtual, valorAcumuladoCalculado]);

  // Função para calcular total baseado na quantidade e valor unitário (sem truncamento para preservar precisão)
  const calcularTotal = (quantidade: number, valorUnitario: number) => {
    return quantidade * valorUnitario;
  };

  const obterValorUnitarioPrecisoItem = (item: Item) => {
    const quantidade = Number(item.quantidade || 0);
    const totalBase = Math.abs(Number(item.totalContrato || 0)) > 0
      ? Number(item.totalContrato || 0)
      : Number(item.valorTotal || 0);

    if (Math.abs(quantidade) > 1e-12 && Math.abs(totalBase) > 0) {
      return totalBase / quantidade;
    }

    return Number(item.valorUnitario || 0);
  };

  const obterValorUnitarioCalculoAditivo = (
    item: Item,
    dadosAtuais: { qnt: number; percentual: number; total: number; valorUnitario?: number }
  ) => {
    const valorUnitarioItem = obterValorUnitarioPrecisoItem(item);
    if (Math.abs(valorUnitarioItem) > 1e-12) return valorUnitarioItem;

    if (Math.abs(Number(dadosAtuais.qnt || 0)) > 1e-12 && Math.abs(Number(dadosAtuais.total || 0)) > 0) {
      return Number(dadosAtuais.total || 0) / Number(dadosAtuais.qnt || 0);
    }

    return Number(dadosAtuais.valorUnitario || 0);
  };

  // Função para calcular e distribuir Administração Local
  const calcularEDistribuirAdministracaoLocal = (silent = false, medicoesOverride?: typeof medicoes) => {
    const medicoesFonte = medicoesOverride ?? medicoes;
    const medicaoAtualData = medicoesFonte.find(m => m.id === medicaoAtual);
    if (!medicaoAtualData) return;
    // Medições bloqueadas têm seus valores congelados em banco (qtd/pct/total_congelado).
    // Não recalcular AL para elas — preserva os valores que foram pagos.
    if (medicaoAtualData.bloqueada) return;

    const medicaoSeq = medicaoAtualData.id;
    const sessoesAnterioresBloqueadas = medicoesFonte.filter(m => m.bloqueada && m.id < medicaoSeq);

    const {
      dados,
      porcentagemExecucaoAcumulada,
      recalculado,
      mensagemErro,
    } = calcularDistribuicaoAdministracaoLocal({
      medicaoSeq,
      dadosBase: medicaoAtualData.dados,
      sessoesAnteriores: sessoesAnterioresBloqueadas,
      dadosCalculadosPorSessao: dadosHierarquicosMemoizados,
    });

    if (!recalculado) {
      if (!silent && mensagemErro) toast.error(mensagemErro);
      return;
    }

    setMedicoes(prevMedicoes =>
      prevMedicoes.map(medicao =>
        medicao.id === medicaoAtual
          ? {
              ...medicao,
              dados,
            }
          : medicao
      )
    );

    if (!silent) {
      toast.success(`Administração Local calculada! Porcentagem de execução acumulada: ${(porcentagemExecucaoAcumulada * 100).toFixed(2)}%`);
    }
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

  // Debounce por célula (aditivo)
  const debouncersAditivoRef = React.useRef(new Map<string, number>());
  const onChangeAditivoDebounced = (itemId: number, aditivoId: number, campo: string, valor: string, delay = 150) => {
    const key = `${aditivoId}:${itemId}:${campo}`;
    const prev = debouncersAditivoRef.current.get(key);
    if (prev) window.clearTimeout(prev);
    const timeout = window.setTimeout(() => {
      atualizarAditivo(itemId, aditivoId, campo, valor);
      debouncersAditivoRef.current.delete(key);
    }, delay);
    debouncersAditivoRef.current.set(key, timeout);
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

    // Para itens extracontratuais, a quantidade já está definida em item.quantidade
    // (vinda da planilha do aditivo), então NÃO devemos somar novamente qntAditivoAcum
    const ehExtracontratual = item.origem === 'extracontratual';
    
    // Considerar QNT adicionada pelos aditivos publicados anteriores a esta medição
    // Apenas para itens contratuais originais (não extracontratuais)
    const qntAditivoAcum = ehExtracontratual 
      ? 0 
      : aditivos
          .filter(a => a.bloqueada && (a.sequencia ?? 0) <= medicaoId)
          .reduce((sum, a) => sum + (a.dados[itemId]?.qnt || 0), 0);

    const quantidadeProjetoAjustada = (item.quantidade || 0) + qntAditivoAcum;

    const qntProposta = campo === 'percentual' 
      ? (valorNumerico / 100) * quantidadeProjetoAjustada
      : valorNumerico;

    const disponivel = quantidadeProjetoAjustada - qntAcumAnterior;
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
            const percentualCalculado = quantidadeProjetoAjustada > 0 ? (qntProposta / quantidadeProjetoAjustada) * 100 : 0;
            novosDados[itemId].percentual = percentualCalculado;
            novosDados[itemId].total = (percentualCalculado / 100) * calcularTotalContratoComAditivos(item, medicaoId);
          } else if (campo === 'percentual') {
            const qntEquivalente = qntProposta;
            novosDados[itemId].qnt = qntEquivalente;
            novosDados[itemId].total = (valorNumerico / 100) * calcularTotalContratoComAditivos(item, medicaoId);
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

  // Efeito para calcular automaticamente Administração Local quando a medição ativa ou os itens mudam.
  // IMPORTANTE: não incluir `medicoes` nas dependências pois calcularEDistribuirAdministracaoLocal
  // chama setMedicoes, o que causaria um loop infinito ao reabrir uma medição.
  useEffect(() => {
    // Verificar se há itens marcados como Administração Local
    const hasAdminLocal = items.some(item => item.ehAdministracaoLocal);
    
    // Só calcular se houver itens de Admin Local e houver uma medição ativa
    if (hasAdminLocal && medicaoAtual) {
      // Usar timeout para evitar cálculos excessivos durante edição
      const timeoutId = setTimeout(() => {
        calcularEDistribuirAdministracaoLocal(true); // silent=true para não mostrar toast
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, aditivos, medicaoAtual]);

  // Função para atualizar dados de aditivo
  const atualizarAditivo = (itemId: number, aditivoId: number, campo: string, valor: string) => {
    const valorNumerico = parseFloat(valor) || 0;
    
    setAditivos(prevAditivos =>
      prevAditivos.map(aditivo => {
        if (aditivo.id === aditivoId) {
          const dadosAtuais = aditivo.dados[itemId] || { qnt: 0, percentual: 0, total: 0, valorUnitario: 0 };
          
          // Se o valor não mudou, não fazer nada (evita recálculos desnecessários no TAB)
          if (campo === 'qnt' && Math.abs(dadosAtuais.qnt - valorNumerico) < 1e-9) {
            return aditivo;
          }
          
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
              
              // Saldo acumulado (qtd e total) deste item considerando o orçamento
              // original + todos os outros aditivos com sequência <= a do aditivo atual.
              const seqAtual = aditivo.sequencia ?? 0;
              const qtdAcumOutros = prevAditivos.reduce((sum, a) => {
                if (a.id === aditivoId) return sum;
                if ((a.sequencia ?? 0) > seqAtual) return sum;
                return sum + Number(a.dados[itemId]?.qnt || 0);
              }, 0);
              const totalAcumOutros = prevAditivos.reduce((sum, a) => {
                if (a.id === aditivoId) return sum;
                if ((a.sequencia ?? 0) > seqAtual) return sum;
                return sum + Number(a.dados[itemId]?.total || 0);
              }, 0);
              const qtdAcumAnterior = item.quantidade + qtdAcumOutros;
              const totalAcumAnterior = item.valorTotal + totalAcumOutros;
              
              // SUPRESSÃO EXATA: quando o aditivo zera a quantidade acumulada do
              // item, forçar o total = -totalAcumAnterior para garantir saldo
              // exato (sem resíduo de centavos por arredondamento de preço unit.).
              const ehSupressaoExata = qtdAcumAnterior > 0
                && Math.abs(valorNumerico + qtdAcumAnterior) < 1e-6;
              
              const valorUnitarioAditivo = obterValorUnitarioCalculoAditivo(item, dadosAtuais);
              
              if (ehSupressaoExata) {
                novosDados[itemId].total = -totalAcumAnterior;
                if (valorUnitarioAditivo > 0) {
                  novosDados[itemId].valorUnitario = valorUnitarioAditivo;
                } else {
                  novosDados[itemId].valorUnitario = obterValorUnitarioPrecisoItem(item);
                }
              } else if (valorUnitarioAditivo > 0) {
                // Usar valor unitário específico do aditivo (sem truncamento)
                novosDados[itemId].total = valorNumerico * valorUnitarioAditivo;
                novosDados[itemId].valorUnitario = valorUnitarioAditivo; // Preservar
              } else {
                // Para itens sem valor unitário específico salvo no aditivo,
                // derivar o valor unitário preciso do total/quantidade do item-base.
                const valorUnitarioPreciso = obterValorUnitarioPrecisoItem(item);
                novosDados[itemId].total = valorNumerico * valorUnitarioPreciso;
                novosDados[itemId].valorUnitario = valorUnitarioPreciso;
              }
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
        // CORREÇÃO: Considerar valores diferentes de zero (positivos OU negativos para supressões)
        const hasData = (d.qnt ?? 0) !== 0 || (d.percentual ?? 0) !== 0 || (d.total ?? 0) !== 0;
        if (!hasData) return arr;
        arr.push({ 
          item_code: it.item.trim(), 
          qtd: d.qnt || 0, 
          pct: d.percentual || 0, 
          total: d.total || 0,
          valor_unitario: d.valorUnitario || 0 // Valor unitário específico do aditivo
        });
        return arr;
      }, [] as { item_code: string; qtd: number; pct: number; total: number; valor_unitario?: number }[]);

      await upsertAditivoItems(ad.sessionId, payload);
      toast.success(`${ad.nome} salvo com sucesso!`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar aditivo');
    }
  };

  // Salvar e publicar (bloquear) aditivo
  const publicarAditivo = async (aditivoLocalId: number) => {
    const ad = aditivos.find(a => a.id === aditivoLocalId);
    if (!ad || !ad.sessionId) {
      toast.error('Aditivo inválido');
      return;
    }
    try {
      const payload = items.reduce((arr, it) => {
        const d = ad.dados[it.id];
        if (!d) return arr;
        // CORREÇÃO: Considerar valores diferentes de zero (positivos OU negativos para supressões)
        const hasData = (d.qnt ?? 0) !== 0 || (d.percentual ?? 0) !== 0 || (d.total ?? 0) !== 0;
        if (!hasData) return arr;
        arr.push({ 
          item_code: it.item.trim(), 
          qtd: d.qnt || 0, 
          pct: d.percentual || 0, 
          total: d.total || 0,
          valor_unitario: d.valorUnitario || 0 // Valor unitário específico do aditivo
        });
        return arr;
      }, [] as { item_code: string; qtd: number; pct: number; total: number; valor_unitario?: number }[]);

      await upsertAditivoItems(ad.sessionId, payload);
      await blockAditivoSession(ad.sessionId);
      setAditivos(prev => prev.map(a => a.id === aditivoLocalId ? { ...a, bloqueada: true } : a));
      
      // Registrar ação no log
      if (obra) {
        await logAditivoBloqueado(obra.id, aditivoLocalId);
      }
      
      toast.success('Aditivo publicado.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao publicar aditivo');
    }
  };

  const editarAditivo = async (aditivoLocalId: number) => {
    const ad = aditivos.find(a => a.id === aditivoLocalId);
    if (!ad || !ad.sessionId) return;
    try {
      await reopenAditivoSession(ad.sessionId);
      setAditivos(prev => prev.map(a => a.id === aditivoLocalId ? { ...a, bloqueada: false } : a));
      
      // Registrar ação no log
      if (obra) {
        await logAditivoReaberto(obra.id, aditivoLocalId);
      }
      
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
      // Buscar prazo_dias da sessão do aditivo ANTES de excluir
      const { data: sessaoAditivo } = await supabase
        .from('aditivo_sessions')
        .select('prazo_dias')
        .eq('id', ad.sessionId)
        .single();
      
      const prazoDias = sessaoAditivo?.prazo_dias || 0;
      
      // Excluir sessão do aditivo e seus itens
      await deleteAditivoSession(ad.sessionId);
      
      // Excluir itens que foram importados neste aditivo usando a sequencia (não o id)
      if (id) {
        const { error: deleteItemsError } = await supabase
          .from('orcamento_items')
          .delete()
          .eq('obra_id', id)
          .eq('aditivo_num', ad.sequencia); // Usar a sequencia, não o id
        
        if (deleteItemsError) {
          console.error('Erro ao excluir itens do aditivo:', deleteItemsError);
          throw deleteItemsError;
        }
        
        // Se o aditivo tinha prazo, remover os dias do aditivo_prazo da obra
        if (prazoDias > 0) {
          const { data: obraAtual } = await supabase
            .from('obras')
            .select('aditivo_prazo, data_inicio, tempo_obra')
            .eq('id', id)
            .single();
          
          const currentPrazo = obraAtual?.aditivo_prazo || 0;
          const novoPrazo = Math.max(0, currentPrazo - prazoDias);
          
          // Recalcular data de término
          let novaPrevisaoTermino: string | null = null;
          if (obraAtual?.data_inicio) {
            const dataInicio = new Date(obraAtual.data_inicio);
            const tempoObra = obraAtual.tempo_obra || 0;
            const prazoTotal = tempoObra + novoPrazo;
            if (prazoTotal > 0) {
              const dataTermino = new Date(dataInicio);
              dataTermino.setDate(dataTermino.getDate() + prazoTotal);
              novaPrevisaoTermino = dataTermino.toISOString().split('T')[0];
            }
          }
          
          const updateData: { aditivo_prazo: number; previsao_termino?: string } = { aditivo_prazo: novoPrazo };
          if (novaPrevisaoTermino) {
            updateData.previsao_termino = novaPrevisaoTermino;
          }
          
          await supabase
            .from('obras')
            .update(updateData)
            .eq('id', id);
          
          // Atualizar estado local
          if (obra) {
            setObra({ 
              ...obra, 
              aditivo_prazo: novoPrazo,
              ...(novaPrevisaoTermino && { previsao_termino: novaPrevisaoTermino })
            });
          }
          
          toast.info(`Prazo do aditivo removido: -${prazoDias} dias.`);
        }
        
        // Recarregar os itens da obra do banco para garantir consistência
        await fetchMedicoesSalvas();
      }
      
      // Limpar mapeamento do localStorage
      try {
        const mapKey = `aditivo_numbers_${id}`;
        const current = JSON.parse(localStorage.getItem(mapKey) || '{}') || {};
        delete current[ad.sessionId];
        localStorage.setItem(mapKey, JSON.stringify(current));
      } catch {}
      
      // Remover aditivo do estado local
      setAditivos(prev => prev.filter(a => a.id !== aditivoLocalId));
      
      toast.success('Aditivo e planilha importada excluídos.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao excluir aditivo');
    }
  };
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
      valorTotalSemDesconto: 0,
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
      
      // Calcular automaticamente após marcar/desmarcar
      setTimeout(() => {
        calcularEDistribuirAdministracaoLocal();
      }, 300);
    } catch (error) {
      console.error('Erro ao atualizar administração local:', error);
      toast.error('Erro ao atualizar status de administração local');
    }
  };

  // Estado do dialog "Nova Medição"
  const [novaMedicaoOpen, setNovaMedicaoOpen] = useState(false);
  const [proximaSequenciaPrevista, setProximaSequenciaPrevista] = useState(1);

  // Abre o dialog para coletar datas antes de criar a medição
  const criarNovaMedicao = () => {
    const maxSeq = medicoes.reduce((max, m) => (m.id > max ? m.id : max), 0);
    setProximaSequenciaPrevista(maxSeq + 1);
    setNovaMedicaoOpen(true);
  };

  // Cria a medição efetivamente após confirmar as datas no dialog
  const confirmarCriarNovaMedicao = async (datas: NovaMedicaoData) => {
    if (!id) return;
    try {
      const { data: last, error: lastErr } = await supabase
        .from('medicao_sessions')
        .select('sequencia')
        .eq('obra_id', id)
        .order('sequencia', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastErr) throw lastErr;

      let nextSeq = (last?.sequencia ?? 0) + 1;

      let { data: inserted, error: insertErr } = await supabase
        .from('medicao_sessions')
        .insert({
          obra_id: id,
          sequencia: nextSeq,
          status: 'aberta',
          ...(datas as any),
        } as any)
        .select('id, sequencia, status, created_at')
        .single();

      if (insertErr && (insertErr as any).code === '23505') {
        const { data: last2 } = await supabase
          .from('medicao_sessions')
          .select('sequencia')
          .eq('obra_id', id)
          .order('sequencia', { ascending: false })
          .limit(1)
          .maybeSingle();
        nextSeq = (last2?.sequencia ?? nextSeq) + 1;

        const retry = await supabase
          .from('medicao_sessions')
          .insert({
            obra_id: id,
            sequencia: nextSeq,
            status: 'aberta',
            ...(datas as any),
          } as any)
          .select('id, sequencia, status, created_at')
          .single();
        inserted = retry.data as any;
        insertErr = retry.error as any;
      }

      if (insertErr) throw insertErr;
      const newSession = inserted as any;

      const novaMedicao: Medicao = {
        id: newSession.sequencia,
        sessionId: newSession.id,
        nome: `${newSession.sequencia}ª MEDIÇÃO`,
        dados: {},
        bloqueada: newSession.status === 'bloqueada',
      };

      setMedicoes(prev => [...prev, novaMedicao].sort((a, b) => a.id - b.id));
      setMedicaoAtual(novaMedicao.id);
      setNovaMedicaoOpen(false);
      toast.success(`${nextSeq}ª Medição criada com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao criar medição:', error);
      const msg = error?.code === '42501' ? 'Sem permissão para criar medição.' : 'Erro ao criar medição';
      toast.error(msg);
    }
  };

  // Função para encontrar próximo número de aditivo disponível (sequencial com reaproveitamento de lacunas)
  const getProximoNumeroAditivo = () => {
    const numerosExistentes = aditivos
      .map(a => a.id)
      .filter((n): n is number => typeof n === 'number' && n > 0)
      .sort((a, b) => a - b);

    // Se não há aditivos, começa com 1
    if (numerosExistentes.length === 0) return 1;

    // Encontrar a primeira lacuna na sequência 1,2,3...
    for (let i = 1; i <= numerosExistentes.length + 1; i++) {
      if (!numerosExistentes.includes(i)) return i;
    }

    // Fallback
    return numerosExistentes.length + 1;
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
    
    // Remove símbolos de moeda e espaços
    let cleaned = str.replace(/[R$\s]/g, '');
    
    // Detectar formato automaticamente baseado na posição dos separadores
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Formato brasileiro: 1.234,56 (vírgula é decimal)
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // Formato americano: 1,234.56 (ponto é decimal)
      cleaned = cleaned.replace(/,/g, '');
    }
    // Se só tem um tipo de separador, parseFloat lida corretamente
    
    // Remove qualquer caractere não numérico restante (exceto ponto e sinal)
    cleaned = cleaned.replace(/[^0-9.-]/g, '');
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // removed remap helpers: no remapping per user decision


  // Confirmação do modal de Novo Aditivo
  // Função para exportar planilha de medição em XLS com seleção de medições
  const handleExportarPlanilhaXLS = async (selectedMedicoes: number[], apenasItensAcima: boolean) => {
    if (!obra || selectedMedicoes.length === 0) {
      toast.error('Selecione ao menos uma medição para exportar');
      return;
    }

    // Verificar se todas as medições selecionadas estão bloqueadas
    const medicoesParaExportar = medicoes.filter(m => selectedMedicoes.includes(m.id)).sort((a, b) => a.id - b.id);
    const todasBloqueadas = medicoesParaExportar.every(m => m.bloqueada);
    if (!todasBloqueadas) {
      toast.error('Todas as medições selecionadas devem estar bloqueadas');
      return;
    }

    // Filtrar itens: se apenasItensAcima (macros), pegar apenas nível 1
    const itensParaExportar = apenasItensAcima 
      ? items.filter(item => item.nivel === 1)
      : items;

    // Usar a maior medição selecionada como referência para acumulados
    const maiorMedicaoId = Math.max(...selectedMedicoes);

    try {
      // Preparar dados para exportação
      const exportData: any[] = [];

      // Adicionar colunas de aditivos bloqueados que alterem valor
      const aditivosBloqueados = aditivos
        .filter(a => a.bloqueada)
        .filter(a => Object.values(a.dados).some((d: any) => (d.total || 0) !== 0 || (d.qnt || 0) !== 0))
        .sort((a, b) => a.id - b.id);

      // PRIMEIRA LINHA: Títulos dos agrupamentos
      const headerRow1: any = {
        'Item': '',
        'Código': 'Planilha Orçamentária',
        'Descrição': '',
        'Und': '',
        'Quant.': '',
        'Valor unit com BDI e Desc.': '',
        'Total com BDI e Desconto': '',
      };

      // Título do grupo de aditivos
      const tituloAditivos = aditivosBloqueados.map(a => `ADITIVO ${a.id}`).join(' | ');
      aditivosBloqueados.forEach((aditivo, idx) => {
        headerRow1[`Aditivo${aditivo.id}_QNT`] = idx === 0 ? tituloAditivos : '';
        headerRow1[`Aditivo${aditivo.id}_PCT`] = '';
        headerRow1[`Aditivo${aditivo.id}_TOTAL`] = '';
      });

      headerRow1['TOTAL_CONTRATO'] = 'TOTAL CONTRATO';
      
      // Adicionar coluna para cada medição selecionada
      medicoesParaExportar.forEach(med => {
        headerRow1[`Medicao${med.id}_QNT`] = `${med.id}ª MEDIÇÃO`;
        headerRow1[`Medicao${med.id}_PCT`] = '';
        headerRow1[`Medicao${med.id}_TOTAL`] = '';
      });
      
      headerRow1['Acum_QNT'] = 'ACUMULADA';
      headerRow1['Acum_PCT'] = '';
      headerRow1['Acum_TOTAL'] = '';

      exportData.push(headerRow1);

      // SEGUNDA LINHA: Subcolunas (QNT, %, TOTAL)
      const headerRow2: any = {
        'Item': 'Item',
        'Código': 'Código',
        'Descrição': 'Descrição',
        'Und': 'Und',
        'Quant.': 'Quant.',
        'Valor unit com BDI e Desc.': 'Valor unit com BDI e Desc.',
        'Total com BDI e Desconto': 'Total com BDI e Desconto',
      };

      aditivosBloqueados.forEach(aditivo => {
        headerRow2[`Aditivo${aditivo.id}_QNT`] = 'QNT';
        headerRow2[`Aditivo${aditivo.id}_PCT`] = '%';
        headerRow2[`Aditivo${aditivo.id}_TOTAL`] = 'TOTAL';
      });

      headerRow2['TOTAL_CONTRATO'] = '';
      
      medicoesParaExportar.forEach(med => {
        headerRow2[`Medicao${med.id}_QNT`] = 'QNT';
        headerRow2[`Medicao${med.id}_PCT`] = '%';
        headerRow2[`Medicao${med.id}_TOTAL`] = 'TOTAL';
      });
      
      headerRow2['Acum_QNT'] = 'QNT';
      headerRow2['Acum_PCT'] = '%';
      headerRow2['Acum_TOTAL'] = 'TOTAL';

      exportData.push(headerRow2);

      // Adicionar dados dos itens
      itensParaExportar.forEach(item => {
        const row: any = {
          'Item': item.item,
          'Código': item.codigo,
          'Descrição': item.descricao,
          'Und': item.und,
          'Quant.': item.quantidade,
          'Valor unit com BDI e Desc.': item.valorUnitario,
          'Total com BDI e Desconto': item.valorTotal,
        };

        // Dados de aditivos bloqueados
        aditivosBloqueados.forEach(aditivo => {
          const aditivoData = aditivo.dados[item.id] || { qnt: 0, percentual: 0, total: 0 };
          row[`Aditivo${aditivo.id}_QNT`] = aditivoData.qnt;
          row[`Aditivo${aditivo.id}_PCT`] = aditivoData.percentual;
          row[`Aditivo${aditivo.id}_TOTAL`] = aditivoData.total;
        });

        // Total contrato com aditivos
        const totalContrato = calcularTotalContratoComAditivos(item, maiorMedicaoId);
        row['TOTAL_CONTRATO'] = totalContrato;

        // Dados de cada medição selecionada - usar dados hierárquicos
        medicoesParaExportar.forEach(med => {
          const medicaoData = dadosHierarquicosMemoizados[med.id]?.[item.id] || { qnt: 0, percentual: 0, total: 0 };
          row[`Medicao${med.id}_QNT`] = medicaoData.qnt;
          row[`Medicao${med.id}_PCT`] = totalContrato > 0 ? (medicaoData.total / totalContrato) * 100 : 0;
          row[`Medicao${med.id}_TOTAL`] = medicaoData.total;
        });

        // Dados acumulados (até a maior medição)
        row['Acum_QNT'] = calcularQuantidadeAcumulada(item.id);
        row['Acum_PCT'] = calcularPercentualAcumulado(item.id);
        row['Acum_TOTAL'] = calcularValorAcumuladoItem(item.id);

        exportData.push(row);
      });

      // Calcular totais (apenas itens folha/MICRO, excluindo MACROS)
      const itensParaTotais = apenasItensAcima ? itensParaExportar : itensParaExportar.filter(item => ehItemFolha(item.item));
      
      const totalTotalContrato = itensParaTotais
        .reduce((sum, item) => sum + calcularTotalContratoComAditivos(item, maiorMedicaoId), 0);
      
      // Totais por medição
      const totaisPorMedicao: Record<number, number> = {};
      medicoesParaExportar.forEach(med => {
        totaisPorMedicao[med.id] = itensParaTotais.reduce((sum, item) => {
          const medicaoData = apenasItensAcima 
            ? (dadosHierarquicosMemoizados[med.id]?.[item.id] || { total: 0 })
            : (med.dados[item.id] || { total: 0 });
          return sum + (medicaoData.total || 0);
        }, 0);
      });

      const totalAcumulado = itensParaTotais
        .reduce((sum, item) => sum + calcularValorAcumuladoItem(item.id), 0);

      // Adicionar linha de totais
      const totalRow: any = {
        'Item': '',
        'Código': '',
        'Descrição': 'TOTAL',
        'Und': '',
        'Quant.': '',
        'Valor unit com BDI e Desc.': '',
        'Total com BDI e Desconto': '',
      };

      aditivosBloqueados.forEach(aditivo => {
        totalRow[`Aditivo${aditivo.id}_QNT`] = '';
        totalRow[`Aditivo${aditivo.id}_PCT`] = '';
        totalRow[`Aditivo${aditivo.id}_TOTAL`] = '';
      });

      totalRow['TOTAL_CONTRATO'] = totalTotalContrato;
      
      medicoesParaExportar.forEach(med => {
        totalRow[`Medicao${med.id}_QNT`] = '';
        totalRow[`Medicao${med.id}_PCT`] = '';
        totalRow[`Medicao${med.id}_TOTAL`] = totaisPorMedicao[med.id];
      });
      
      totalRow['Acum_QNT'] = '';
      totalRow['Acum_PCT'] = '';
      totalRow['Acum_TOTAL'] = totalAcumulado;

      exportData.push(totalRow);

      // Criar dados como array de arrays para excelUtils
      const exportRows: any[][] = exportData.map(row => Object.values(row));

      // Ajustar largura das colunas
      const colWidthValues = [8, 12, 40, 6, 10, 12, 12];
      aditivosBloqueados.forEach(() => { colWidthValues.push(10, 8, 12); });
      colWidthValues.push(14);
      medicoesParaExportar.forEach(() => { colWidthValues.push(10, 8, 12); });
      colWidthValues.push(10, 8, 12);

      // Definir merges para o cabeçalho
      const merges: any[] = [];
      merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });
      let currentCol = 7;
      aditivosBloqueados.forEach(() => {
        merges.push({ s: { r: 0, c: currentCol }, e: { r: 0, c: currentCol + 2 } });
        currentCol += 3;
      });
      merges.push({ s: { r: 0, c: currentCol }, e: { r: 1, c: currentCol } });
      currentCol += 1;
      medicoesParaExportar.forEach(() => {
        merges.push({ s: { r: 0, c: currentCol }, e: { r: 0, c: currentCol + 2 } });
        currentCol += 3;
      });
      merges.push({ s: { r: 0, c: currentCol }, e: { r: 0, c: currentCol + 2 } });

      // Gerar e fazer download do arquivo
      const nomeAba = medicoesParaExportar.length === 1 
        ? `Medição ${medicoesParaExportar[0].id}`
        : `Medições ${medicoesParaExportar[0].id}-${medicoesParaExportar[medicoesParaExportar.length - 1].id}`;
      const tipoItens = apenasItensAcima ? 'Macros' : 'Completa';
      const medicoesLabel = medicoesParaExportar.length === 1 
        ? `Med${medicoesParaExportar[0].id}` 
        : `Med${medicoesParaExportar[0].id}-${medicoesParaExportar[medicoesParaExportar.length - 1].id}`;
      const fileName = `Medicao_${medicoesLabel}_${tipoItens}_${obra.nome.replace(/[^a-z0-9]/gi, '_')}.xlsx`;

      await writeExcelFile(exportData, fileName, {
        sheetName: nomeAba.substring(0, 31),
        columns: colWidthValues.map(w => ({ width: w })),
        merges,
      });

      toast.success(`Planilha exportada com ${medicoesParaExportar.length} medição(ões)!`);
    } catch (error) {
      console.error('Erro ao exportar planilha:', error);
      toast.error('Erro ao exportar planilha');
    }
  };

  // Função para exportar planilha de medição em PDF
  const exportarPlanilhaPDF = () => {
    if (!obra || !medicaoAtual) {
      toast.error('Selecione uma medição para exportar');
      return;
    }

    const medicaoAtualObj = medicoes.find(m => m.id === medicaoAtual);
    if (!medicaoAtualObj) {
      toast.error('Medição não encontrada');
      return;
    }

    if (!medicaoAtualObj.bloqueada) {
      toast.error('Salve e bloqueie a medição antes de exportar a planilha');
      return;
    }

    try {
      // Filtrar apenas aditivos bloqueados que alteram valor (excluir aditivos apenas de prazo)
      const aditivosBloqueados = aditivos
        .filter(a => a.bloqueada)
        .filter(a => Object.values(a.dados).some((d: any) => (d.total || 0) !== 0 || (d.qnt || 0) !== 0))
        .sort((a, b) => a.id - b.id);
      const dataAtual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      
      // Formatador de moeda
      const formatMoney = (valor: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(valor);
      };

      // Calcular totais (apenas itens folha/MICRO, excluindo MACROS)
      // IMPORTANTE: arredondar cada item para 2 casas ANTES de somar, mantendo
      // paridade com "Serviços Executados" exibido na tela (medicaoCalculo.ts).
      const round2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
      const totalTotalContratoPDF = round2(items
        .filter(item => ehItemFolha(item.item))
        .reduce((sum, item) => sum + round2(calcularTotalContratoComAditivos(item, medicaoAtual)), 0));
      const totalMedicaoAtualPDF = round2(items
        .filter(item => ehItemFolha(item.item))
        .reduce((sum, item) => {
          const medicaoData = medicaoAtualObj.dados[item.id] || { qnt: 0, percentual: 0, total: 0 };
          return sum + round2(medicaoData.total);
        }, 0));
      const totalAcumuladoPDF = round2(items
        .filter(item => ehItemFolha(item.item))
        .reduce((sum, item) => sum + round2(calcularValorAcumuladoItem(item.id)), 0));
      const percentualExecucao = totalTotalContratoPDF > 0 ? (totalAcumuladoPDF / totalTotalContratoPDF) * 100 : 0;
      
      // Criar conteúdo HTML profissional
      let htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Arial', sans-serif; 
                font-size: 8px; 
                background: white;
                color: #000;
              }
              .header {
                text-align: center;
                margin-bottom: 15px;
                border-bottom: 2px solid #94a3b8;
                padding-bottom: 10px;
              }
              .header h1 { 
                font-size: 16px;
                color: #1e293b;
                margin-bottom: 5px;
                text-transform: uppercase;
                font-weight: bold;
              }
              .header h2 { 
                font-size: 14px;
                color: #475569;
                margin-bottom: 3px;
              }
              .info-section {
                margin: 12px 0;
                background: #f1f5f9;
                padding: 8px 14px;
                border-left: 4px solid #3b82f6;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .info-col {
                display: flex;
                flex-direction: column;
                gap: 4px;
              }
              .info-col.right {
                text-align: right;
              }
              .info-row {
                font-size: 9px;
                line-height: 1.4;
              }
              .info-label {
                font-weight: bold;
                color: #1e293b;
              }
              .info-value {
                color: #475569;
              }
              .summary-section {
                margin: 15px 0;
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
              }
              .summary-card {
                background: #a5b4fc;
                padding: 10px;
                border-radius: 6px;
                color: #1e293b;
                text-align: center;
                border: 1px solid #818cf8;
              }
              .summary-card.green {
                background: #86efac;
                border-color: #4ade80;
              }
              .summary-card.blue {
                background: #7dd3fc;
                border-color: #38bdf8;
              }
              .summary-card.orange {
                background: #fde047;
                border-color: #facc15;
              }
              .summary-label {
                font-size: 7px;
                text-transform: uppercase;
                margin-bottom: 4px;
                font-weight: 600;
              }
              .summary-value {
                font-size: 11px;
                font-weight: bold;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                font-size: 7px;
                margin-top: 10px;
              }
              th, td { 
                border: 0.3px solid #bdc3c7; 
                padding: 4px 5px; 
                text-align: left;
                vertical-align: middle;
              }
              tr {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              thead {
                display: table-header-group;
              }
              th { 
                background: #d4d9fc;
                color: #000; 
                font-weight: bold; 
                text-align: center; 
                font-size: 7px;
                padding: 5px 4px;
              }
              .sub-header { 
                background: #e8ebfe;
                color: #000;
                font-weight: bold; 
                text-align: center;
              }
              .nivel-1 {
                background: #f1f5f9;
                font-weight: bold;
              }
              .nivel-2 {
                background: #f8fafc;
              }
              .macro-item {
                background: rgb(200, 200, 200);
                font-weight: bold;
              }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .descricao-col { 
                max-width: 200px; 
                white-space: normal;
                line-height: 1.4;
                word-wrap: break-word;
                padding: 5px 4px;
              }
              .totals-row {
                background: #fef08a;
                font-weight: bold;
                border-top: 3px solid #1e293b;
                font-size: 8px;
              }
              .footer {
                margin-top: 20px;
                padding-top: 10px;
                border-top: 2px solid #bdc3c7;
                font-size: 7px;
                color: #7f8c8d;
                text-align: center;
              }
            </style>
          </head>
          <body>
      `;

      // ---- Conteúdo do body: cabeçalho + resumo + tabela ----
      const nomeObra = obra.nome;
      const nomeContrato = obra.n_contrato || '—';
      const nomeEmpresa = obra.empresa_responsavel || '—';
      const nomeMedicao = medicaoAtualObj.nome;

      // Cabeçalho
      htmlContent += `
          <div style="padding: 10px 14px;">
            <div class="header">
              <h1>${nomeObra}</h1>
              <h2>${nomeMedicao}</h2>
            </div>
            <div class="info-section">
              <div class="info-col">
                <div class="info-row"><span class="info-label">Município: </span><span class="info-value">${obra.municipio || '—'}</span></div>
                <div class="info-row"><span class="info-label">Nº do Contrato: </span><span class="info-value">${nomeContrato}</span></div>
              </div>
              <div class="info-col right">
                <div class="info-row"><span class="info-label">Data da Medição: </span><span class="info-value">${dataAtual}</span></div>
                <div class="info-row"><span class="info-label">Empresa: </span><span class="info-value">${nomeEmpresa}</span></div>
              </div>
            </div>
            <div class="summary-section">
              <div class="summary-card">
                <div class="summary-label">Total Contrato</div>
                <div class="summary-value">${formatMoney(totalTotalContratoPDF)}</div>
              </div>
              <div class="summary-card blue">
                <div class="summary-label">Esta Medição</div>
                <div class="summary-value">${formatMoney(totalMedicaoAtualPDF)}</div>
              </div>
              <div class="summary-card green">
                <div class="summary-label">Acumulado</div>
                <div class="summary-value">${formatMoney(totalAcumuladoPDF)}</div>
              </div>
              <div class="summary-card orange">
                <div class="summary-label">% Execução</div>
                <div class="summary-value">${percentualExecucao.toFixed(2).replace('.', ',')}%</div>
              </div>
            </div>
      `;

      // ---- Cabeçalho da tabela ----
      let tableHeaderRow1 = `<th rowspan="2">Item</th><th rowspan="2">Cód.</th><th rowspan="2" class="descricao-col">Descrição</th><th rowspan="2">Un.</th><th colspan="3">Contrato</th>`;
      aditivosBloqueados.forEach(a => {
        tableHeaderRow1 += `<th colspan="3">Aditivo ${a.id}</th>`;
      });
      tableHeaderRow1 += `<th colspan="3">Total Contrato c/ Aditivos</th>`;
      tableHeaderRow1 += `<th colspan="3">${nomeMedicao}</th>`;
      tableHeaderRow1 += `<th colspan="3">Acumulado</th>`;

      const subHeaders = `<th class="sub-header">QNT</th><th class="sub-header">%</th><th class="sub-header">TOTAL</th>`;
      let tableHeaderRow2 = subHeaders; // Contrato
      aditivosBloqueados.forEach(() => { tableHeaderRow2 += subHeaders; });
      tableHeaderRow2 += subHeaders; // Total c/ Aditivos
      tableHeaderRow2 += subHeaders; // Medição atual
      tableHeaderRow2 += subHeaders; // Acumulado

      htmlContent += `
            <table>
              <thead>
                <tr>${tableHeaderRow1}</tr>
                <tr>${tableHeaderRow2}</tr>
              </thead>
              <tbody>
      `;

      // ---- Linhas de dados ----
      const formatQnt = (v: number) =>
        Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formatPct = (v: number) =>
        Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

      items.forEach(item => {
        const isMacro = !ehItemFolha(item.item);
        const rowClass = isMacro ? 'macro-item' : (item.nivel === 1 ? 'nivel-1' : 'nivel-2');
        const indent = item.nivel > 1 ? `padding-left:${(item.nivel - 1) * 8}px;` : '';

        // Contrato
        const qntContrato = item.quantidade || 0;
        const pctContrato = '';
        const totalContrato = item.valorTotal || 0;

        // Aditivos
        let aditivoCols = '';
        aditivosBloqueados.forEach(a => {
          const ad = a.dados[item.id] || { qnt: 0, percentual: 0, total: 0 };
          aditivoCols += `<td class="text-right">${isMacro ? '' : formatQnt(ad.qnt)}</td>
            <td class="text-right">${isMacro ? '' : formatPct(ad.percentual)}</td>
            <td class="text-right">${isMacro ? '' : formatMoney(ad.total)}</td>`;
        });

        // Total c/ aditivos
        const totalComAditivos = calcularTotalContratoComAditivos(item, medicaoAtual);

        // Medição atual
        const medicaoData = medicaoAtualObj.dados[item.id] || { qnt: 0, percentual: 0, total: 0 };

        // Acumulado
        const acumTotal = calcularValorAcumuladoItem(item.id);
        const acumPct = totalComAditivos > 0 ? (acumTotal / totalComAditivos) * 100 : 0;

        htmlContent += `
          <tr class="${rowClass}">
            <td class="text-center">${item.item}</td>
            <td class="text-center">${item.codigo}</td>
            <td class="descricao-col" style="${indent}">${item.descricao}</td>
            <td class="text-center">${item.und}</td>
            <td class="text-right">${isMacro ? '' : formatQnt(qntContrato)}</td>
            <td class="text-right">${isMacro ? '' : pctContrato}</td>
            <td class="text-right">${formatMoney(totalContrato)}</td>
            ${aditivoCols}
            <td class="text-right">${isMacro ? '' : formatQnt(qntContrato)}</td>
            <td class="text-right"></td>
            <td class="text-right">${formatMoney(totalComAditivos)}</td>
            <td class="text-right">${isMacro ? '' : formatQnt(medicaoData.qnt)}</td>
            <td class="text-right">${isMacro ? '' : formatPct(medicaoData.percentual)}</td>
            <td class="text-right">${isMacro ? '' : formatMoney(medicaoData.total)}</td>
            <td class="text-right">${isMacro ? '' : formatQnt(acumPct)}</td>
            <td class="text-right">${isMacro ? '' : formatPct(acumPct)}</td>
            <td class="text-right">${isMacro ? '' : formatMoney(acumTotal)}</td>
          </tr>
        `;
      });

      // Linha de totais
      htmlContent += `
          <tr class="totals-row">
            <td colspan="4" class="text-right">TOTAL</td>
            <td></td><td></td><td class="text-right">${formatMoney(totalTotalContratoPDF)}</td>
      `;
      aditivosBloqueados.forEach(() => {
        htmlContent += `<td></td><td></td><td></td>`;
      });
      htmlContent += `
            <td></td><td></td><td class="text-right">${formatMoney(totalTotalContratoPDF)}</td>
            <td></td><td></td><td class="text-right">${formatMoney(totalMedicaoAtualPDF)}</td>
            <td></td><td class="text-right">${percentualExecucao.toFixed(2).replace('.', ',')}%</td><td class="text-right">${formatMoney(totalAcumuladoPDF)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Documento gerado em ${dataAtual}</p>
      </div>
    </div>
  </body>
</html>
      `;

      // Largura A4 paisagem em pixels a 150dpi ≈ 1587px — garante que todo o conteúdo caiba
      const A4_LANDSCAPE_PX = 1587;

      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.top = '-99999px';
      tempDiv.style.left = '-99999px';
      tempDiv.style.width = `${A4_LANDSCAPE_PX}px`;
      tempDiv.style.background = 'white';
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Medicao_${medicaoAtual}_${obra.nome.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: {
          scale: 1.5,
          useCORS: true,
          logging: false,
          allowTaint: true,
          width: A4_LANDSCAPE_PX,
          windowWidth: A4_LANDSCAPE_PX,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape' as const,
          compress: true,
        },
      };

      generatePdfFromElementAutoPage(tempDiv, opt).then(() => {
        document.body.removeChild(tempDiv);
        toast.success('PDF exportado com sucesso!');
      }).catch((error: any) => {
        console.error('Erro ao exportar PDF:', error);
        if (tempDiv && tempDiv.parentNode) {
          document.body.removeChild(tempDiv);
        }
        toast.error('Erro ao exportar PDF');
      });

    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const confirmarNovoAditivo = async ({ extracontratual, file, sequenciaEfetiva, temAditivoPrazo, diasAditivoPrazo }: { extracontratual: boolean; file?: File | null; sequenciaEfetiva: number; temAditivoPrazo: boolean; diasAditivoPrazo: number; }) => {
    if (!id) {
      toast.error('Obra inválida');
      return;
    }

    // PRIMEIRO criar sessão do aditivo no Supabase (evita duplicação por double-click)
    let newSession;
    try {
      newSession = await createAditivoSession(id, sequenciaEfetiva);
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível criar a sessão do aditivo.');
      return;
    }

    // DEPOIS atualizar aditivo de prazo (só executa se sessão foi criada com sucesso)
    if (temAditivoPrazo && diasAditivoPrazo > 0) {
      try {
        // Salvar prazo_dias na sessão do aditivo para poder remover depois
        await supabase
          .from('aditivo_sessions')
          .update({ prazo_dias: diasAditivoPrazo })
          .eq('id', newSession.id);
        
        // Buscar valor atual do banco para evitar race condition com estado local
        const { data: obraAtual } = await supabase
          .from('obras')
          .select('aditivo_prazo, data_inicio, tempo_obra')
          .eq('id', id)
          .single();
        
        const currentPrazo = obraAtual?.aditivo_prazo || 0;
        const novoPrazo = currentPrazo + diasAditivoPrazo;
        
        // Calcular nova data de término
        let novaPrevisaoTermino: string | null = null;
        if (obraAtual?.data_inicio) {
          const dataInicio = new Date(obraAtual.data_inicio);
          const tempoObra = obraAtual.tempo_obra || 0;
          const prazoTotal = tempoObra + novoPrazo;
          if (prazoTotal > 0) {
            const dataTermino = new Date(dataInicio);
            dataTermino.setDate(dataTermino.getDate() + prazoTotal);
            novaPrevisaoTermino = dataTermino.toISOString().split('T')[0];
          }
        }
        
        const updateData: { aditivo_prazo: number; previsao_termino?: string } = { aditivo_prazo: novoPrazo };
        if (novaPrevisaoTermino) {
          updateData.previsao_termino = novaPrevisaoTermino;
        }
        
        const { error } = await supabase
          .from('obras')
          .update(updateData)
          .eq('id', id);
        
        if (error) throw error;
        
        // Atualizar estado local da obra
        if (obra) {
          setObra({ 
            ...obra, 
            aditivo_prazo: novoPrazo,
            ...(novaPrevisaoTermino && { previsao_termino: novaPrevisaoTermino })
          });
        }
        
        toast.success(`Aditivo de prazo: +${diasAditivoPrazo} dias adicionados. Nova data de término: ${novaPrevisaoTermino ? new Date(novaPrevisaoTermino + 'T00:00:00').toLocaleDateString('pt-BR') : 'não calculada'}.`);
      } catch (error) {
        console.error('Erro ao atualizar prazo:', error);
        toast.error('Erro ao atualizar aditivo de prazo.');
      }
    }

    // Determinar número sequencial do aditivo (independente da medição)
    const numeroAditivo = getProximoNumeroAditivo();

    // Adicionar aditivo em memória com vínculo da sessão
    const novoAditivo: Aditivo = {
      id: numeroAditivo, // número sequencial do aditivo
      nome: `ADITIVO ${numeroAditivo}`,
      dados: {},
      sessionId: newSession.id,
      sequencia: newSession.sequencia, // medição em que passa a valer
      bloqueada: newSession.status === 'bloqueada',
      created_at: newSession.created_at,
    };
    setAditivos(prev => [...prev, novoAditivo]);

    // Persistir mapeamento sessão -> número do aditivo
    try {
      const mapKey = `aditivo_numbers_${id}`;
      const current = JSON.parse(localStorage.getItem(mapKey) || '{}') || {};
      current[newSession.id] = numeroAditivo;
      localStorage.setItem(mapKey, JSON.stringify(current));
    } catch {}

    // Registrar ação de criação de aditivo
    if (obra) {
      await logAditivoCriado(obra.id, numeroAditivo);
    }

    if (!extracontratual || !file) {
      toast.success(`Aditivo ${numeroAditivo} criado.`);
      return;
    }


    try {
      // 2) Ler planilha (.xlsx ou .csv)
      let rows: any[][];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        rows = await readCsvAsExcel(text);
      } else {
        const buf = await file.arrayBuffer();
        rows = await readExcelFile(buf);
      }
      if (!rows || rows.length < 2) throw new Error('Planilha vazia');

      // 3) Detectar se primeira linha é cabeçalho ou dados
      const primeiraLinha = rows[0];
      let headerRowIndex = 0;
      let hasHeader = false;
      
      // Verificar se primeira linha parece ser cabeçalho (contém texto descritivo comum)
      if (primeiraLinha && primeiraLinha.length > 0) {
        const primeiroItem = String(primeiraLinha[0] || '').toLowerCase().trim();
        const segundoItem = String(primeiraLinha[1] || '').toLowerCase().trim();
        
        // Se primeira coluna contém palavras como "item", "código" ou segunda coluna contém "descrição"
        hasHeader = primeiroItem.includes('item') || primeiroItem.includes('codigo') || 
                   segundoItem.includes('descricao') || segundoItem.includes('descrição');
      }
      
      // Usar percentual de desconto da obra (cadastrado na importação inicial)
      const descontoObra = (obra?.percentual_desconto ?? 0) / 100;
      // Exceção: obra de São Félix do Araguaia teve a planilha original elaborada
      // sem truncamento do desconto, então aqui aplicamos arredondamento para casar
      // com o valor que foi efetivamente contratado.
      const OBRA_SEM_TRUNCAR_DESCONTO = '9c544a84-2130-4074-9b23-1f58e9b84bcf';
      const aplicarDesconto = (totalSemDesconto: number) => {
        const bruto = (totalSemDesconto - (totalSemDesconto * descontoObra)) * 100;
        return (obra?.id === OBRA_SEM_TRUNCAR_DESCONTO ? Math.round(bruto) : Math.trunc(bruto)) / 100;
      };
      
      let idx;
      if (hasHeader) {
        // Mapear cabeçalhos normalmente - novo formato de 9 colunas
        const header = rows[0].map(h => normalizeHeader(h));
        idx = {
          item: header.findIndex(h => h && h === 'item'),
          codigo: header.findIndex(h => h && h === 'codigo'),
          banco: header.findIndex(h => h && h === 'banco'),
          descricao: header.findIndex(h => h && h === 'descricao'),
          und: header.findIndex(h => h && (h === 'und' || h === 'unidade')),
          quant: header.findIndex(h => h && h.startsWith('quant')),
          valorUnit: header.findIndex(h => h && h === 'valor unit'),
          valorUnitBDI: header.findIndex(h => h && (h.includes('valor unit com bdi') || h.includes('valor unitario com bdi'))),
          totalSemDesconto: header.findIndex(h => h && (h.includes('total sem desconto') || h.includes('valor total') || h === 'total')),
        };
        
        // Validar cabeçalhos obrigatórios
        const camposObrigatorios = ['item', 'codigo', 'descricao', 'und', 'quant', 'totalSemDesconto'];
        const camposFaltantes = camposObrigatorios.filter(campo => idx[campo as keyof typeof idx] === -1);
        
        if (camposFaltantes.length > 0) {
          const cabecalhosDetectados = header.filter(h => h && h.trim()).join(', ');
          const faltantesTexto = camposFaltantes.map(campo => {
            switch(campo) {
              case 'totalSemDesconto': return 'Total sem Desconto';
              default: return campo.charAt(0).toUpperCase() + campo.slice(1);
            }
          }).join(', ');
          
          throw new Error(`Cabeçalho inválido. Faltando: ${faltantesTexto}. Encontrado: ${cabecalhosDetectados || 'nenhum cabeçalho válido'}.`);
        }
        
        headerRowIndex = 1;
      } else {
        // Sem cabeçalho: mapear por posição - novo formato de 9 colunas
        // A: Item, B: Código, C: Banco, D: Descrição, E: Und, F: Quant, G: Valor Unit, H: Valor Unit com BDI, I: Total sem Desconto
        idx = {
          item: 0,              // Coluna A - item
          codigo: 1,            // Coluna B - código
          banco: 2,             // Coluna C - banco
          descricao: 3,         // Coluna D - descrição
          und: 4,               // Coluna E - unidade
          quant: 5,             // Coluna F - quantidade
          valorUnit: 6,         // Coluna G - valor unitário
          valorUnitBDI: 7,      // Coluna H - valor unitário com BDI
          totalSemDesconto: 8,  // Coluna I - total sem desconto
        };
        
        // Procurar a primeira linha com ao menos 9 colunas (pula títulos como 'EXTRACONTRATUAL', se houver)
        const candidateIndex = rows.findIndex(r => Array.isArray(r) && r.length >= 9);
        if (candidateIndex === -1) {
          const cols = primeiraLinha ? primeiraLinha.length : 0;
          throw new Error(`Não foi possível localizar linhas de itens com 9 colunas. Verifique se sua planilha possui as colunas: Item, Código, Banco, Descrição, Und, Quant., Valor Unit, Valor Unit com BDI, Total sem Desconto. Primeira linha possui ${cols} colunas.`);
        }
        
        // Processar desde o início para incluir linhas de estrutura (ex.: "4", "4.1") antes da 1ª linha completa
        headerRowIndex = 0;
      }

      const body = rows.slice(headerRowIndex);
      const baseOrdem = items.reduce((m, it) => Math.max(m, it.ordem || 0), 0);

      // Incluir TODOS os itens existentes (contratuais E extracontratuais de aditivos anteriores)
      // pois itens extracontratuais de aditivos anteriores já fazem parte do contrato
      const existentes = new Set(items.map(it => (it.item || '').trim()));
      const novos: Item[] = [];
      const duplicados: string[] = [];
      const vistosNoArquivo = new Set<string>();
      // Array para armazenar itens contratuais que aparecem na planilha do aditivo
      const itensContratuaisDoAditivo: { id: number; qnt: number; total: number; valorUnitario: number }[] = [];
      
      body.forEach((r, i) => {
        const code = idx.item >= 0 ? String(r[idx.item] ?? '').trim() : '';
        const descricao = idx.descricao >= 0 ? String(r[idx.descricao] ?? '').trim() : '';
        const und = idx.und >= 0 ? String(r[idx.und] ?? '').trim() : '';
        const codigoBanco = idx.codigo >= 0 ? String(r[idx.codigo] ?? '').trim() : '';
        const banco = idx.banco >= 0 ? String(r[idx.banco] ?? '').trim() : '';
        const quant = parseNumber(idx.quant >= 0 ? r[idx.quant] : 0);
        
        // Buscar Total sem Desconto e aplicar desconto da obra
        const totalSemDesconto = parseNumber(idx.totalSemDesconto >= 0 ? r[idx.totalSemDesconto] : 0);
        // Aplicar desconto: TRUNCAR(totalSemDesconto - (totalSemDesconto * desconto%), 2)
        const valorTotalComDesconto = aplicarDesconto(totalSemDesconto);
        // Ignorar linhas completamente vazias (considerar valores negativos como conteúdo para supressões)
        const hasAnyContent = code || descricao || und || codigoBanco || quant !== 0 || totalSemDesconto !== 0;
        if (!hasAnyContent) {
          console.log(`Linha ${i + 1} ignorada: vazia`);
          return;
        }

        // Ignorar apenas linhas que são cabeçalhos genéricos (sem código de item)
        // Mas permitir linhas de estrutura que têm código de item (ex: "4", "4.1")
        const ehCabecalhoGenerico = !code && !codigoBanco && quant === 0 && totalSemDesconto === 0 && 
                                   descricao && (descricao.toUpperCase().includes('SINAPI') || descricao.toUpperCase().includes('ITEM'));
        if (ehCabecalhoGenerico) {
          console.log(`Linha ${i + 1} ignorada: cabeçalho genérico`);
          return;
        }

        // Para itens de estrutura/categoria (que têm código mas sem valor), permitir importação
        // Para itens com valores (positivos ou negativos), exigir código obrigatoriamente
        if (!code && (quant !== 0 || totalSemDesconto !== 0)) {
          console.log(`Linha ${i + 1} ignorada: item com valores mas sem código`);
          return;
        }

        const nivel = code.split('.').length;
        
        // Extrair valor unitário com BDI da planilha (para uso no cálculo do aditivo)
        const valorUnitBDI = parseNumber(idx.valorUnitBDI >= 0 ? r[idx.valorUnitBDI] : 0);
        
        // Verificar se é item contratual (já existe) ou extracontratual (novo)
        if (existentes.has(code)) {
          // Item CONTRATUAL - já existe no orçamento base
          // Não criar novo, mas registrar valores para o aditivo
          if (!vistosNoArquivo.has(code)) {
            vistosNoArquivo.add(code);
            // Encontrar o item existente para obter o ID
            const itemExistente = items.find(it => it.item.trim() === code);
            if (itemExistente && quant !== 0 && nivel > 1) {
              // Salvar valores para processar depois no dadosAditivo
              // NÃO aplicar desconto - itens contratuais já tiveram desconto aplicado na planilha original
              // Itens extracontratuais de aditivos anteriores também já tiveram desconto aplicado
              // Sempre usar o valor unitário PRECISO do item-base (totalContrato/quantidade)
              // para o cálculo do aditivo, evitando diferenças de centavos causadas por
              // VU truncado/arredondado na planilha do aditivo.
              const vuPrecisoBase = obterValorUnitarioPrecisoItem(itemExistente);
              const valorUnitarioFinal = Math.abs(vuPrecisoBase) > 1e-12
                ? vuPrecisoBase
                : (quant !== 0 ? valorTotalComDesconto / quant : valorUnitBDI);
              const totalFinal = Math.round(quant * valorUnitarioFinal * 100) / 100;
              
              itensContratuaisDoAditivo.push({
                id: itemExistente.id,
                qnt: quant,
                total: totalFinal,
                valorUnitario: valorUnitarioFinal
              });
              console.log(`Linha ${i + 1} - Item CONTRATUAL no aditivo: item=${code}, qnt=${quant}, VU_Preciso=${valorUnitarioFinal}, total=${totalFinal}`);
            }
          }
          return; // Não adicionar aos novos
        }
        
        if (vistosNoArquivo.has(code)) {
          duplicados.push(code);
          return;
        }
        vistosNoArquivo.add(code);

        console.log(`Linha ${i + 1} processada: item=${code}, descricao=${descricao}, quant=${quant}, desconto=${descontoObra * 100}%`);

        // Item EXTRACONTRATUAL - não existe no orçamento base, criar novo
        const origemItem = 'extracontratual';
        
        // Usar ordem sequencial baseada na posição no arquivo, mantendo numeração original
        const ordemVal = baseOrdem + i + 1;
        
        // Salvar valor unitário com BDI para usar no cálculo do aditivo
        const valorUnitarioParaAditivo = quant !== 0
          ? valorTotalComDesconto / quant
          : valorUnitBDI;
        
        const novo: Item = {
          id: stableIdForRow(code, codigoBanco, ordemVal),
          item: code, // Manter código original da planilha
          codigo: codigoBanco,
          banco: banco,
          descricao,
          und,
          quantidade: (nivel === 1 ? 0 : quant),
          valorUnitario: (nivel === 1 ? 0 : valorUnitarioParaAditivo),
          valorTotal: valorTotalComDesconto,
          valorTotalSemDesconto: totalSemDesconto, // Valor original para cálculos de aditivo
          aditivo: { qnt: 0, percentual: 0, total: 0 },
          totalContrato: 0,
          importado: true,
          nivel,
          ehAdministracaoLocal: false,
          ordem: ordemVal,
          origem: origemItem,
        };
        // Guardar valorUnitario do aditivo para referência posterior
        (novo as any).valorUnitarioAditivo = valorUnitarioParaAditivo;
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
        origem: it.origem, // Usar a origem definida na lógica anterior
        aditivo_num: newSession.sequencia,
      } as any));

      const { error: insertErr } = await supabase.from('orcamento_items').insert(rowsToInsert as any);
      if (insertErr) throw insertErr;

      // 6) Preencher automaticamente a coluna "QNT ADITIVO 1" apenas para os itens importados na planilha do aditivo
      const dadosAditivo: { [itemId: number]: { qnt: number; percentual: number; total: number; valorUnitario?: number } } = {};
      
      // Função para verificar se um item é do último nível (não tem filhos)
      const ehUltimoNivel = (item: Item, todosItens: Item[]): boolean => {
        const prefixo = item.item + '.';
        return !todosItens.some(outroItem => outroItem.item.startsWith(prefixo));
      };

      // 1) Preencher dados do aditivo para itens CONTRATUAIS (que já existem mas têm valores diferentes no aditivo)
      itensContratuaisDoAditivo.forEach(itemContratual => {
        dadosAditivo[itemContratual.id] = {
          qnt: itemContratual.qnt,
          percentual: 0,
          total: itemContratual.total,
          valorUnitario: itemContratual.valorUnitario // Valor unitário específico do aditivo
        };
      });
      
      // 2) Preencher dados do aditivo para itens EXTRACONTRATUAIS (novos) do último nível
      // Incluir valores negativos (supressões)
      novos.forEach(item => {
        if (item.quantidade !== 0 && ehUltimoNivel(item, novos)) {
          // Usar o valorUnitario específico do aditivo se disponível
          const valorUnitarioAditivo = (item as any).valorUnitarioAditivo || item.valorUnitario;
          dadosAditivo[item.id] = {
            qnt: item.quantidade,
            percentual: 0,
            total: item.valorTotal,
            valorUnitario: valorUnitarioAditivo // Valor unitário específico do aditivo
          };
        }
      });
      
      // Atualizar o aditivo com os dados preenchidos usando o numeroAditivo correto
      setAditivos(prev => prev.map(aditivo => 
        aditivo.id === numeroAditivo 
          ? { ...aditivo, dados: dadosAditivo }
          : aditivo
      ));

      const totalItens = novos.length + itensContratuaisDoAditivo.length;
      toast.success(`Aditivo ${numeroAditivo} criado com planilha anexada. ${totalItens} itens processados (${itensContratuaisDoAditivo.length} contratuais, ${novos.length} extracontratuais).`);

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

  // Função para reimportar planilha de um aditivo existente (sem criar novo)
  const reimportarPlanilhaAditivo = async (file: File, aditivoId: number) => {
    if (!id || !obra) {
      toast.error('Obra inválida');
      return;
    }

    const aditivo = aditivos.find(a => a.id === aditivoId);
    if (!aditivo) {
      toast.error('Aditivo não encontrado');
      return;
    }

    if (aditivo.bloqueada) {
      toast.error('Não é possível reimportar planilha de um aditivo bloqueado');
      return;
    }

    const sessionId = aditivo.sessionId;
    if (!sessionId) {
      toast.error('Sessão do aditivo não encontrada');
      return;
    }

    try {
      // 1) Limpar itens do aditivo existentes no banco
      const { error: deleteAditivoItemsErr } = await supabase
        .from('aditivo_items')
        .delete()
        .eq('aditivo_id', sessionId);
      if (deleteAditivoItemsErr) throw deleteAditivoItemsErr;

      // 2) Limpar itens extracontratuais do orcamento_items associados a este aditivo
      const { error: deleteOrcamentoItemsErr } = await supabase
        .from('orcamento_items')
        .delete()
        .eq('obra_id', id)
        .eq('aditivo_num', aditivo.sequencia)
        .eq('origem', 'extracontratual');
      if (deleteOrcamentoItemsErr) throw deleteOrcamentoItemsErr;

      // 3) Ler planilha
      let rows: any[][];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        rows = await readCsvAsExcel(text);
      } else {
        const buf = await file.arrayBuffer();
        rows = await readExcelFile(buf);
      }
      if (!rows || rows.length < 2) throw new Error('Planilha vazia');

      // 4) Detectar cabeçalhos (mesma lógica de confirmarNovoAditivo)
      const primeiraLinha = rows[0];
      let headerRowIndex = 0;
      let hasHeader = false;
      
      if (primeiraLinha && primeiraLinha.length > 0) {
        const primeiroItem = String(primeiraLinha[0] || '').toLowerCase().trim();
        const segundoItem = String(primeiraLinha[1] || '').toLowerCase().trim();
        hasHeader = primeiroItem.includes('item') || primeiroItem.includes('codigo') || 
                   segundoItem.includes('descricao') || segundoItem.includes('descrição');
      }
      
      const descontoObra = (obra?.percentual_desconto ?? 0) / 100;
      const OBRA_SEM_TRUNCAR_DESCONTO = '9c544a84-2130-4074-9b23-1f58e9b84bcf';
      const aplicarDesconto = (totalSemDesconto: number) => {
        const bruto = (totalSemDesconto - (totalSemDesconto * descontoObra)) * 100;
        return (obra?.id === OBRA_SEM_TRUNCAR_DESCONTO ? Math.round(bruto) : Math.trunc(bruto)) / 100;
      };
      
      let idx;
      if (hasHeader) {
        const header = rows[0].map(h => normalizeHeader(h));
        idx = {
          item: header.findIndex(h => h && h === 'item'),
          codigo: header.findIndex(h => h && h === 'codigo'),
          banco: header.findIndex(h => h && h === 'banco'),
          descricao: header.findIndex(h => h && h === 'descricao'),
          und: header.findIndex(h => h && (h === 'und' || h === 'unidade')),
          quant: header.findIndex(h => h && h.startsWith('quant')),
          valorUnit: header.findIndex(h => h && h === 'valor unit'),
          valorUnitBDI: header.findIndex(h => h && (h.includes('valor unit com bdi') || h.includes('valor unitario com bdi'))),
          totalSemDesconto: header.findIndex(h => h && (h.includes('total sem desconto') || h.includes('valor total') || h === 'total')),
        };
        
        const camposObrigatorios = ['item', 'codigo', 'descricao', 'und', 'quant', 'totalSemDesconto'];
        const camposFaltantes = camposObrigatorios.filter(campo => idx[campo as keyof typeof idx] === -1);
        
        if (camposFaltantes.length > 0) {
          const cabecalhosDetectados = header.filter(h => h && h.trim()).join(', ');
          throw new Error(`Cabeçalho inválido. Faltando: ${camposFaltantes.join(', ')}. Encontrado: ${cabecalhosDetectados || 'nenhum'}.`);
        }
        headerRowIndex = 1;
      } else {
        idx = {
          item: 0, codigo: 1, banco: 2, descricao: 3, und: 4, quant: 5,
          valorUnit: 6, valorUnitBDI: 7, totalSemDesconto: 8,
        };
        const candidateIndex = rows.findIndex(r => Array.isArray(r) && r.length >= 9);
        if (candidateIndex === -1) {
          throw new Error(`Não foi possível localizar linhas de itens com 9 colunas.`);
        }
        headerRowIndex = 0;
      }

      const body = rows.slice(headerRowIndex);
      const baseOrdem = items.reduce((m, it) => Math.max(m, it.ordem || 0), 0);
      // Incluir TODOS os itens existentes (contratuais E extracontratuais de aditivos anteriores)
      const existentes = new Set(items.map(it => (it.item || '').trim()));
      const novos: Item[] = [];
      const vistosNoArquivo = new Set<string>();
      const itensContratuaisDoAditivo: { id: number; qnt: number; total: number; valorUnitario: number }[] = [];

      body.forEach((r, i) => {
        const code = idx.item >= 0 ? String(r[idx.item] ?? '').trim() : '';
        const descricao = idx.descricao >= 0 ? String(r[idx.descricao] ?? '').trim() : '';
        const und = idx.und >= 0 ? String(r[idx.und] ?? '').trim() : '';
        const codigoBanco = idx.codigo >= 0 ? String(r[idx.codigo] ?? '').trim() : '';
        const banco = idx.banco >= 0 ? String(r[idx.banco] ?? '').trim() : '';
        const quant = parseNumber(idx.quant >= 0 ? r[idx.quant] : 0);
        const totalSemDesconto = parseNumber(idx.totalSemDesconto >= 0 ? r[idx.totalSemDesconto] : 0);
        const valorTotalComDesconto = Math.trunc((totalSemDesconto - (totalSemDesconto * descontoObra)) * 100) / 100;
        const valorUnitBDI = parseNumber(idx.valorUnitBDI >= 0 ? r[idx.valorUnitBDI] : 0);

        const hasAnyContent = code || descricao || und || codigoBanco || quant !== 0 || totalSemDesconto !== 0;
        if (!hasAnyContent) return;

        const ehCabecalhoGenerico = !code && !codigoBanco && quant === 0 && totalSemDesconto === 0 && 
                                   descricao && (descricao.toUpperCase().includes('SINAPI') || descricao.toUpperCase().includes('ITEM'));
        if (ehCabecalhoGenerico) return;

        if (!code && (quant !== 0 || totalSemDesconto !== 0)) return;

        const nivel = code.split('.').length;

        // Verificar se é item contratual ou extracontratual
        if (existentes.has(code)) {
          if (!vistosNoArquivo.has(code)) {
            vistosNoArquivo.add(code);
            const itemExistente = items.find(it => it.item.trim() === code);
            if (itemExistente && quant !== 0 && nivel > 1) {
              // NÃO aplicar desconto - itens contratuais/extracontratuais anteriores já tiveram desconto
              // Sempre usar o VU PRECISO do item-base (totalContrato/quantidade)
              const vuPrecisoBase = obterValorUnitarioPrecisoItem(itemExistente);
              const valorUnitarioFinal = Math.abs(vuPrecisoBase) > 1e-12
                ? vuPrecisoBase
                : (quant !== 0 ? valorTotalComDesconto / quant : valorUnitBDI);
              const totalFinal = Math.round(quant * valorUnitarioFinal * 100) / 100;
              
              itensContratuaisDoAditivo.push({
                id: itemExistente.id,
                qnt: quant,
                total: totalFinal,
                valorUnitario: valorUnitarioFinal
              });
            }
          }
          return;
        }

        if (vistosNoArquivo.has(code)) return;
        vistosNoArquivo.add(code);

        const valorUnitarioParaAditivo = quant !== 0
          ? valorTotalComDesconto / quant
          : valorUnitBDI;

        const ordemVal = baseOrdem + i + 1;
        const novo: Item = {
          id: stableIdForRow(code, codigoBanco, ordemVal),
          item: code,
          codigo: codigoBanco,
          banco: banco,
          descricao,
          und,
          quantidade: quant,
          valorUnitario: valorUnitarioParaAditivo,
          valorTotal: 0,
          valorTotalSemDesconto: totalSemDesconto,
          aditivo: { qnt: 0, percentual: 0, total: 0 },
          totalContrato: valorTotalComDesconto,
          importado: true,
          nivel,
          ehAdministracaoLocal: false,
          ordem: ordemVal,
          origem: 'extracontratual',
        };
        // Armazenar valorUnitarioAditivo temporariamente para uso posterior
        (novo as any).valorUnitarioAditivo = valorUnitarioParaAditivo;
        novos.push(novo);
      });

      // 5) Inserir novos itens extracontratuais no banco
      if (novos.length > 0) {
        const rowsToInsert = novos.map((it) => ({
          obra_id: id,
          item: it.item,
          codigo: it.codigo,
          banco: it.banco,
          descricao: it.descricao,
          unidade: it.und,
          quantidade: it.quantidade,
          valor_unitario: it.valorUnitario,
          valor_total: it.valorTotal,
          total_contrato: it.totalContrato,
          nivel: it.nivel,
          eh_administracao_local: it.ehAdministracaoLocal,
          ordem: it.ordem,
          origem: it.origem,
          aditivo_num: aditivo.sequencia,
        } as any));

        const { error: insertErr } = await supabase.from('orcamento_items').insert(rowsToInsert as any);
        if (insertErr) throw insertErr;
      }

      // 5.1) Inserir itens do aditivo no banco (aditivo_items) - CORREÇÃO: faltava salvar no banco!
      const aditivoItemsToInsert: any[] = [];
      
      // Itens contratuais
      itensContratuaisDoAditivo.forEach(itemContratual => {
        const itemOriginal = items.find(it => it.id === itemContratual.id);
        if (itemOriginal) {
          aditivoItemsToInsert.push({
            aditivo_id: sessionId,
            item_code: itemOriginal.item.trim(),
            qtd: itemContratual.qnt,
            pct: 0,
            total: itemContratual.total,
            valor_unitario: itemContratual.valorUnitario,
          });
        }
      });
      
      // Itens extracontratuais (incluir valores negativos para supressões)
      novos.forEach(item => {
        if (item.quantidade !== 0 && item.nivel > 1) {
          const valorUnitarioAditivo = (item as any).valorUnitarioAditivo || item.valorUnitario;
          aditivoItemsToInsert.push({
            aditivo_id: sessionId,
            item_code: item.item.trim(),
            qtd: item.quantidade,
            pct: 0,
            total: item.totalContrato,
            valor_unitario: valorUnitarioAditivo,
          });
        }
      });
      
      if (aditivoItemsToInsert.length > 0) {
        const { error: insertAditivoItemsErr } = await supabase
          .from('aditivo_items')
          .insert(aditivoItemsToInsert);
        if (insertAditivoItemsErr) throw insertAditivoItemsErr;
      }

      // 6) Atualizar dados do aditivo em memória
      const dadosAditivo: { [itemId: number]: { qnt: number; percentual: number; total: number; valorUnitario?: number } } = {};
      
      const ehUltimoNivel = (item: Item, todosItens: Item[]): boolean => {
        const prefixo = item.item + '.';
        return !todosItens.some(outroItem => outroItem.item.startsWith(prefixo));
      };

      itensContratuaisDoAditivo.forEach(itemContratual => {
        dadosAditivo[itemContratual.id] = {
          qnt: itemContratual.qnt,
          percentual: 0,
          total: itemContratual.total,
          valorUnitario: itemContratual.valorUnitario
        };
      });
      
      novos.forEach(item => {
        if (item.quantidade !== 0 && ehUltimoNivel(item, novos)) {
          const valorUnitarioAditivo = (item as any).valorUnitarioAditivo || item.valorUnitario;
          dadosAditivo[item.id] = {
            qnt: item.quantidade,
            percentual: 0,
            total: item.valorTotal,
            valorUnitario: valorUnitarioAditivo
          };
        }
      });

      // Atualizar aditivo em memória
      setAditivos(prev => prev.map(a => 
        a.id === aditivoId 
          ? { ...a, dados: dadosAditivo }
          : a
      ));

      // Recarregar itens do orçamento para incluir os novos extracontratuais
      await fetchMedicoesSalvas();

      const totalItens = novos.length + itensContratuaisDoAditivo.length;
      toast.success(`Planilha reimportada. ${totalItens} itens processados (${itensContratuaisDoAditivo.length} contratuais, ${novos.length} extracontratuais).`);

    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao reimportar planilha. Verifique o layout.');
    }
  };

  // Handler para quando o arquivo é selecionado
  const handleReimportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && reimportarAditivoId !== null) {
      await reimportarPlanilhaAditivo(file, reimportarAditivoId);
    }
    // Limpar input e estado
    if (fileInputReimportRef.current) {
      fileInputReimportRef.current.value = '';
    }
    setReimportarAditivoId(null);
  };

  // Função para salvar medição (sem bloquear - para editores)
  const salvarMedicao = async (medicaoId: number) => {
    const medicao = medicoes.find(m => m.id === medicaoId);
    if (!medicao || !obra) return;

    // Verificar se há dados preenchidos
    const temDados = Object.values(medicao.dados).some(dados => 
      dados.qnt > 0 || dados.percentual > 0 || dados.total > 0
    );

    if (!temDados) {
      toast.error('Não há dados para salvar.');
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
        // Para itens extracontratuais, a quantidade já está definida em item.quantidade
        const ehExtracontratual = item.origem === 'extracontratual';
        const qntAditivoAcum = ehExtracontratual 
          ? 0 
          : aditivos
              .filter(a => a.bloqueada && (a.sequencia ?? 0) <= medicaoId)
              .reduce((sum, a) => sum + (a.dados[itemId]?.qnt || 0), 0);
        const quantidadeProjetoAjustada = (item.quantidade || 0) + qntAditivoAcum;
        const disponivel = quantidadeProjetoAjustada - qntAcumAnterior;
        if (dados.qnt > disponivel + 0.005) {
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
      if (!medicao.sessionId) {
        toast.error('Sessão de medição inválida. Recarregue a página.');
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? null;

      const payload = Object.entries(medicao.dados)
        .map(([itemIdStr, dados]) => {
          const itemId = parseInt(itemIdStr);
          const item = items.find(i => i.id === itemId);
          if (!item || !item.item || !item.item.trim()) return null;

          const qtd = Number(dados.qnt) || 0;
          const totalContrato = calcularTotalContratoComAditivos(item, medicaoId);

          let total = 0;
          let pct = 0;

          if (totalContrato > 0) {
            if (dados.total !== undefined && dados.total !== null && !isNaN(Number(dados.total as number))) {
              total = Number(dados.total);
              pct = (total / totalContrato) * 100;
            } else if (qtd > 0) {
              total = (qtd / (item.quantidade || 1)) * totalContrato;
              pct = (total / totalContrato) * 100;
            }
          }

          return {
            item_code: item.item.trim(),
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

      // Remover do banco quaisquer itens dessa medição que tenham sido apagados na interface
      const { data: existingItems, error: existingError } = await supabase
        .from('medicao_items')
        .select('item_code')
        .eq('medicao_id', medicao.sessionId);

      if (existingError) throw existingError;

      const payloadCodes = new Set(payload.map(p => p.item_code.trim()));
      const existingCodes = new Set(
        (existingItems || [])
          .map((it: any) => (it.item_code || '').trim())
          .filter((code: string) => !!code)
      );

      const codesToDelete = Array.from(existingCodes).filter(code => !payloadCodes.has(code));

      if (codesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('medicao_items')
          .delete()
          .eq('medicao_id', medicao.sessionId)
          .in('item_code', codesToDelete);

        if (deleteError) throw deleteError;
      }

      await upsertItems(medicao.sessionId, payload, userId);

      // Registrar ação no log
      if (obra) {
        await logMedicaoSalva(obra.id, medicaoId);
      }

      toast.success('Medição salva com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar medição:', error);
      toast.error(`Erro ao salvar medição no banco: ${ (error as any)?.message || 'Tente novamente.'}`);
    }
  };

  // Função para bloquear medição (para editores)
  const bloquearMedicao = async (medicaoId: number) => {
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

    try {
      if (!medicao.sessionId) {
        toast.error('Sessão de medição inválida. Recarregue a página.');
        return;
      }

      await blockSession(medicao.sessionId);

      setMedicoes(prevMedicoes =>
        prevMedicoes.map(m =>
          m.id === medicaoId
            ? {
                ...m,
                bloqueada: true,
                dataBloqueio: new Date().toISOString(),
                usuarioBloqueio: 'Usuário Atual',
              }
            : m
        )
      );

      // Registrar ação no log
      await logMedicaoBloqueada(obra.id, medicaoId);

      toast.success('Medição bloqueada.');
      
      // Calcular valores financeiros corretos
      const valorTotalOriginalCorreto = items
        .filter(item => ehItemFolha(item.item) && item.origem !== 'extracontratual')
        .reduce((total, item) => total + item.valorTotal, 0);
      
      const totalAditivoCorreto = aditivos
        .filter(a => a.bloqueada)
        .reduce((adSum, a) => {
          return adSum + items.reduce((itemSum, item) => itemSum + (a.dados[item.id]?.total || 0), 0);
        }, 0);
      
      const totalContratoCorreto = valorTotalOriginalCorreto + totalAditivoCorreto;

      const resumoFinanceiro = {
        obraId: obra.id,
        valorTotalOriginal: valorTotalOriginalCorreto,
        totalAditivo: totalAditivoCorreto,
        totalContrato: totalContratoCorreto,
        servicosExecutados: totalServicosExecutados,
        valorAcumulado: valorAcumuladoTotal,
      };

      localStorage.setItem(`resumo_financeiro_${obra.id}`, JSON.stringify(resumoFinanceiro));
      window.dispatchEvent(new CustomEvent('medicaoAtualizada', { detail: resumoFinanceiro }));
    } catch (error) {
      console.error('Erro ao bloquear medição:', error);
      toast.error(`Erro ao bloquear medição: ${ (error as any)?.message || 'Tente novamente.'}`);
    }
  };

  // Função para salvar e bloquear medição (mantido para admins)
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
        const qntAditivoAcum = aditivos
          .filter(a => a.bloqueada && (a.sequencia ?? 0) <= medicaoId)
          .reduce((sum, a) => sum + (a.dados[itemId]?.qnt || 0), 0);
        const quantidadeProjetoAjustada = (item.quantidade || 0) + qntAditivoAcum;
        const disponivel = quantidadeProjetoAjustada - qntAcumAnterior;
        if (dados.qnt > disponivel + 0.005) {
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
      if (!medicao.sessionId) {
        toast.error('Sessão de medição inválida. Recarregue a página.');
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? null;

      const payload = Object.entries(medicao.dados)
        .map(([itemIdStr, dados]) => {
          const itemId = parseInt(itemIdStr);
          const item = items.find(i => i.id === itemId);
          if (!item || !item.item || !item.item.trim()) return null;

          const qtd = Number(dados.qnt) || 0;
          if (qtd <= 0) return null;
          const totalContrato = calcularTotalContratoComAditivos(item, medicaoId);
          const total = dados.total && !isNaN(dados.total)
            ? Number(dados.total)
            : (totalContrato > 0 ? (qtd / (item.quantidade || 1)) * totalContrato : 0);
          const pct = totalContrato > 0 ? (total / totalContrato) * 100 : 0;

          return {
            item_code: item.item.trim(),
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
                dataBloqueio: new Date().toISOString(),
                usuarioBloqueio: 'Usuário Atual',
              }
            : m
        )
      );

      // Registrar ação no log
      await logMedicaoBloqueada(obra.id, medicaoId);

      toast.success('Medição publicada.');
      // Calcular valores financeiros corretos
      const valorTotalOriginalCorreto = items
        .filter(item => ehItemFolha(item.item) && item.origem !== 'extracontratual')
        .reduce((total, item) => total + item.valorTotal, 0);
      
      const totalAditivoCorreto = aditivos
        .filter(a => a.bloqueada)
        .reduce((adSum, a) => {
          return adSum + items.reduce((itemSum, item) => itemSum + (a.dados[item.id]?.total || 0), 0);
        }, 0);
      
      const totalContratoCorreto = valorTotalOriginalCorreto + totalAditivoCorreto;

      const resumoFinanceiro = {
        obraId: obra.id,
        valorTotalOriginal: valorTotalOriginalCorreto,
        totalAditivo: totalAditivoCorreto,
        totalContrato: totalContratoCorreto,
        servicosExecutados: totalServicosExecutados,
        valorAcumulado: valorAcumuladoTotal,
      };

      localStorage.setItem(`resumo_financeiro_${obra.id}`, JSON.stringify(resumoFinanceiro));
      window.dispatchEvent(new CustomEvent('medicaoAtualizada', { detail: resumoFinanceiro }));

      
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
      // Registrar ação no log
      if (obra) {
        await logMedicaoReaberta(obra.id, medicaoId);
      }
      toast.success('Medição reaberta.');
    } catch (error) {
      console.error('Erro ao reabrir medição:', error);
      toast.error('Erro ao reabrir medição');
    }
  };

  // Função para excluir medição (admins e fiscais da obra)
  const excluirMedicao = async (medicaoId: number) => {
    if (!canEdit) {
      toast.error('Você não tem permissão para excluir medições desta obra.');
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

      // Registrar log de ação
      if (id) {
        await logMedicaoExcluida(id, medicaoId);
      }

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
  const limparPlanilha = async () => {
    if (!id) return;

    setConfirm({ open: false });

    try {
      // Deletar itens de medição, se houver
      const medicaoIds = medicoes.map(m => m.sessionId).filter(Boolean) as string[];
      if (medicaoIds.length > 0) {
        const { error: medicaoItemsError } = await supabase
          .from('medicao_items')
          .delete()
          .in('medicao_id', medicaoIds);
        if (medicaoItemsError) console.warn('Erro ao deletar medicao_items:', medicaoItemsError);
      }

      // Deletar as sessões de medição
      const { error: medicaoSessionsError } = await supabase
        .from('medicao_sessions')
        .delete()
        .eq('obra_id', id);
      if (medicaoSessionsError) console.warn('Erro ao deletar medicao_sessions:', medicaoSessionsError);

      // Deletar itens de aditivo, se houver
      const aditivoIds = aditivos.map(a => a.sessionId).filter(Boolean) as string[];
      if (aditivoIds.length > 0) {
        const { error: aditivoItemsError } = await supabase
          .from('aditivo_items')
          .delete()
          .in('aditivo_id', aditivoIds);
        if (aditivoItemsError) console.warn('Erro ao deletar aditivo_items:', aditivoItemsError);
      }

      // Deletar as sessões de aditivo
      const { error: aditivoSessionsError } = await supabase
        .from('aditivo_sessions')
        .delete()
        .eq('obra_id', id);
      if (aditivoSessionsError) console.warn('Erro ao deletar aditivo_sessions:', aditivoSessionsError);

      // Deletar todos os itens orçamentários da obra
      const { error: deleteError } = await supabase
        .from('orcamento_items')
        .delete()
        .eq('obra_id', id);

      if (deleteError) throw deleteError;

      // Limpar estados locais após exclusão bem-sucedida
      setItems([]);
      setMedicoes([]);
      setAditivos([]);
      setMedicaoAtual(null);

      // Recarregar dados para sincronizar com o banco
      await fetchMedicoesSalvas();

      toast.success('Planilha excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir planilha:', error);
      toast.error('Erro ao excluir planilha');
    }
  };

  const salvarPercentualDesconto = async () => {
    if (!id || !obra) return;
    
    const desconto = parseFloat(novoDesconto);
    if (isNaN(desconto) || desconto < 0 || desconto > 100) {
      toast.error('Percentual de desconto inválido (0-100)');
      return;
    }

    try {
      const { error } = await supabase
        .from('obras')
        .update({ percentual_desconto: desconto } as any)
        .eq('id', id);
      
      if (error) throw error;
      
      setObra(prev => prev ? { ...prev, percentual_desconto: desconto } : prev);
      setEditandoDesconto(false);
      toast.success('Percentual de desconto atualizado');
    } catch (error) {
      console.error('Erro ao salvar desconto:', error);
      toast.error('Erro ao salvar percentual de desconto');
    }
  };

  const importarDados = async (dadosImportados: Item[], percentualDesconto?: number) => {
    if (!id) return;

    try {
      // Salvar percentual de desconto na obra
      if (percentualDesconto !== undefined) {
        const { error: updateError } = await supabase
          .from('obras')
          .update({ percentual_desconto: percentualDesconto } as any)
          .eq('id', id);
        
        if (updateError) {
          console.error('Erro ao salvar percentual de desconto:', updateError);
        } else {
          // Atualizar estado local da obra
          setObra(prev => prev ? { ...prev, percentual_desconto: percentualDesconto } : prev);
        }
      }

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
        valorTotalSemDesconto: item.valorTotalSemDesconto || 0,
        aditivo: { qnt: 0, percentual: 0, total: 0 },
        totalContrato: item.valorTotal,
        importado: true,
        nivel: item.nivel || 1,
        ehAdministracaoLocal: item.ehAdministracaoLocal || false,
        ordem: item.ordem ?? idx,
        origem: 'contratual'
      }));

      setItems(dadosComNivel);

      // Salvar no banco de dados
      const itemsParaSalvar = dadosComNivel.map((item) => ({
        obra_id: id,
        item: item.item,
        codigo: item.codigo,
        banco: item.banco,
        descricao: item.descricao,
        unidade: item.und,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        valor_total: item.valorTotal,
        valor_total_sem_desconto: item.valorTotalSemDesconto,
        total_contrato: item.totalContrato,
        nivel: item.nivel,
        eh_administracao_local: item.ehAdministracaoLocal,
        ordem: item.ordem,
        origem: 'contratual'
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
      
      // Registrar ação no log
      await logPlanilhaImportada(id, dadosImportados.length);
      
      // Limpar dados de medições ao importar nova planilha
      setMedicoes(medicoes.map(medicao => ({ ...medicao, dados: {} })));
      toast.success('Planilha importada e salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar planilha:', error);
      toast.error('Erro ao salvar planilha no banco de dados');
    }
  };

  const importarDadosDoRDO = async (dadosImportados: { [itemCode: string]: number }) => {
    if (!id || !medicaoAtual) {
      toast.error('Selecione uma medição antes de importar do RDO');
      return;
    }

    const medicaoAtualObj = medicoes.find(m => m.id === medicaoAtual);
    if (!medicaoAtualObj) {
      toast.error('Medição atual não encontrada');
      return;
    }

    if (medicaoAtualObj.bloqueada) {
      toast.error('Não é possível importar para uma medição bloqueada');
      return;
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? null;

      // Para cada código importado, encontrar o item correspondente e preencher a qtd
      const novoDados = { ...medicaoAtualObj.dados };
      let itensAtualizados = 0;

      // Calcular quantidade acumulada anterior (de medições já bloqueadas) para cada item
      const medicaoIndex = medicoes.findIndex(m => m.id === medicaoAtual);
      const qntAcumAnteriorMap = new Map<number, number>();
      for (let i = 0; i < medicaoIndex; i++) {
        const dh = dadosHierarquicosMemoizados[medicoes[i].id];
        if (!dh) continue;
        Object.entries(dh).forEach(([idStr, val]: [string, any]) => {
          const iid = parseInt(idStr);
          qntAcumAnteriorMap.set(iid, (qntAcumAnteriorMap.get(iid) || 0) + (val.qnt || 0));
        });
      }

      const naoEncontrados: string[] = [];
      const naoFolhas: string[] = [];
      Object.entries(dadosImportados).forEach(([itemCode, qtdExecutada]) => {
        // Priorizar match pelo código hierárquico (item) antes do código de banco,
        // para evitar que um item "banco" coincida com um código hierárquico de outro.
        const codigoNormalizado = itemCode.trim();
        const item = items.find(i => (i.item || '').trim() === codigoNormalizado)
          || items.find(i => (i.codigo || '').trim() === codigoNormalizado);

        if (!item) {
          naoEncontrados.push(itemCode);
          console.warn('[ImportRDO] Item não encontrado:', itemCode, 'qtd:', qtdExecutada);
          return;
        }
        if (!ehItemFolha(item.item)) {
          naoFolhas.push(itemCode);
          console.warn('[ImportRDO] Ignorado (não é folha):', itemCode, '→ item:', item.item);
          return;
        }

        const ehExtracontratual = item.origem === 'extracontratual';
        const qntAditivoAcum = ehExtracontratual
          ? 0
          : aditivos
              .filter(a => a.bloqueada && (a.sequencia ?? 0) <= medicaoAtual)
              .reduce((sum, a) => sum + (a.dados[item.id]?.qnt || 0), 0);
        const quantidadeTotal = (item.quantidade || 0) + qntAditivoAcum;

        const qntAcumAnterior = qntAcumAnteriorMap.get(item.id) || 0;
        const disponivel = quantidadeTotal - qntAcumAnterior;

        const qtdLimitada = Math.min(qtdExecutada, Math.max(0, disponivel));

        const totalContratoItem = calcularTotalContratoComAditivos(item, medicaoAtual);

        const percentual = quantidadeTotal > 0 ? Math.min(100, (qtdLimitada / quantidadeTotal) * 100) : 0;
        // IMPORTANTE: calcular o total a partir do percentual × totalContrato (e não qtd × valorUnitario),
        // pois em alguns itens o valor_unitario armazenado pode não refletir BDI/desconto corretamente,
        // enquanto total_contrato é sempre a fonte de verdade. Igual à lógica de atualizarMedicao().
        const valorTotal = (percentual / 100) * totalContratoItem;
        const totalFinal = percentual >= 100 ? totalContratoItem : valorTotal;

        console.log('[ImportRDO] OK', itemCode, '→ id:', item.id, 'qtd:', qtdLimitada, 'disp:', disponivel);

        novoDados[item.id] = {
          qnt: qtdLimitada,
          percentual,
          total: totalFinal
        };
        itensAtualizados++;
      });
      console.log('[ImportRDO] Resumo - atualizados:', itensAtualizados,
        'não encontrados:', naoEncontrados, 'não folha:', naoFolhas,
        'total no payload:', Object.keys(dadosImportados).length);

      // Atualizar estado local
      const medicoesAtualizadas = medicoes.map(m => 
        m.id === medicaoAtual 
          ? { ...m, dados: novoDados }
          : m
      );
      setMedicoes(medicoesAtualizadas);

      // Salvar no banco de dados
      if (medicaoAtualObj.sessionId) {
        const payload = Object.entries(novoDados)
          .map(([itemIdStr, valores]) => {
            const itemId = parseInt(itemIdStr);
            const item = items.find(i => i.id === itemId);
            if (!item || !item.item || !item.item.trim()) return null;

            return {
              item_code: item.item.trim(),
              qtd: Number(valores.qnt) || 0,
              pct: Number(valores.percentual) || 0,
              total: Number(valores.total) || 0
            };
          })
          .filter((item): item is { item_code: string; qtd: number; pct: number; total: number } => {
            if (!item) return false;
            return item.qtd !== 0 || item.pct !== 0 || item.total !== 0;
          });

        const { data: existingItems, error: existingError } = await supabase
          .from('medicao_items')
          .select('item_code')
          .eq('medicao_id', medicaoAtualObj.sessionId);

        if (existingError) throw existingError;

        const payloadCodes = new Set(payload.map(p => p.item_code.trim()));
        const existingCodes = new Set(
          (existingItems || [])
            .map((it: any) => (it.item_code || '').trim())
            .filter((code: string) => !!code)
        );

        const codesToDelete = Array.from(existingCodes).filter(code => !payloadCodes.has(code));

        if (codesToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('medicao_items')
            .delete()
            .eq('medicao_id', medicaoAtualObj.sessionId)
            .in('item_code', codesToDelete);

          if (deleteError) throw deleteError;
        }

        await upsertItems(medicaoAtualObj.sessionId, payload, userId);
      }

      toast.success(`${itensAtualizados} itens importados do RDO com sucesso!`);

      // Recalcular automaticamente a Administração Local após a importação,
      // para que o valor de "Serviços Executados" já inclua a parcela proporcional
      // da Admin. Local sem precisar desmarcar/remarcar manualmente.
      if (items.some(i => i.ehAdministracaoLocal)) {
        calcularEDistribuirAdministracaoLocal(true, medicoesAtualizadas);
      }
    } catch (error) {
      console.error('Erro ao importar dados do RDO:', error);
      toast.error('Erro ao importar dados do RDO');
    }
  };

  // Preenche automaticamente o saldo restante de cada item folha (última medição).
  // Usa o quantitativo total ajustado (original + aditivos publicados até esta medição)
  // menos o acumulado das medições anteriores, preservando todas as casas decimais.
  const preencherUltimaMedicao = async () => {
    if (!id || !medicaoAtual) {
      toast.error('Selecione uma medição antes de preencher como última medição');
      return;
    }
    const medicaoAtualObj = medicoes.find(m => m.id === medicaoAtual);
    if (!medicaoAtualObj) {
      toast.error('Medição atual não encontrada');
      return;
    }
    if (medicaoAtualObj.bloqueada) {
      toast.error('Não é possível preencher uma medição bloqueada');
      return;
    }
    const ok = window.confirm(
      'Esta ação preencherá automaticamente TODOS os itens folha desta medição com o saldo restante (quantitativo total - quantitativo já pago em medições anteriores). Os valores atuais desta medição serão sobrescritos. Deseja continuar?'
    );
    if (!ok) return;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? null;

      // Acumulado anterior por item (medições anteriores na sequência)
      const medicaoIndex = medicoes.findIndex(m => m.id === medicaoAtual);
      const qntAcumAnteriorMap = new Map<number, number>();
      const totalAcumAnteriorMap = new Map<number, number>();
      for (let i = 0; i < medicaoIndex; i++) {
        const dh = dadosHierarquicosMemoizados[medicoes[i].id];
        if (dh) {
          Object.entries(dh).forEach(([idStr, val]: [string, any]) => {
            const iid = parseInt(idStr);
            qntAcumAnteriorMap.set(iid, (qntAcumAnteriorMap.get(iid) || 0) + (val.qnt || 0));
          });
        }
        Object.entries(medicoes[i].dados).forEach(([idStr, val]: [string, any]) => {
          const iid = parseInt(idStr);
          totalAcumAnteriorMap.set(iid, (totalAcumAnteriorMap.get(iid) || 0) + (val.total || 0));
        });
      }

      const novoDados: typeof medicaoAtualObj.dados = { ...medicaoAtualObj.dados };
      let atualizados = 0;

      items.forEach(item => {
        if (!ehItemFolha(item.item)) return;
        if (item.ehAdministracaoLocal) return; // AL é distribuída automaticamente

        const ehExtracontratual = item.origem === 'extracontratual';
        const qntAditivoAcum = ehExtracontratual
          ? 0
          : aditivos
              .filter(a => a.bloqueada && (a.sequencia ?? 0) <= medicaoAtual)
              .reduce((sum, a) => sum + (a.dados[item.id]?.qnt || 0), 0);

        const quantidadeTotal = (item.quantidade || 0) + qntAditivoAcum;
        const qntAcumAnterior = qntAcumAnteriorMap.get(item.id) || 0;
        const disponivel = quantidadeTotal - qntAcumAnterior;

        if (disponivel <= 1e-9) {
          novoDados[item.id] = { qnt: 0, percentual: 0, total: 0 };
          return;
        }

        const totalContratoItem = calcularTotalContratoComAditivos(item, medicaoAtual);
        const percentual = quantidadeTotal > 0 ? (disponivel / quantidadeTotal) * 100 : 0;
        // Se este período encerra o item (100%), usar o saldo de contrato remanescente
        // para garantir que a soma das medições bata exatamente com o contrato.
        const totalAcumAnteriorContrato = totalAcumAnteriorMap.get(item.id) || 0;
        const saldoContrato = totalContratoItem - totalAcumAnteriorContrato;
        const total = percentual >= 100 - 1e-9
          ? saldoContrato
          : (percentual / 100) * totalContratoItem;

        novoDados[item.id] = { qnt: disponivel, percentual, total };
        atualizados++;
      });

      const medicoesAtualizadas = medicoes.map(m =>
        m.id === medicaoAtual ? { ...m, dados: novoDados } : m
      );
      setMedicoes(medicoesAtualizadas);

      if (medicaoAtualObj.sessionId) {
        const payload = Object.entries(novoDados)
          .map(([itemIdStr, valores]) => {
            const itemId = parseInt(itemIdStr);
            const item = items.find(i => i.id === itemId);
            if (!item || !item.item || !item.item.trim()) return null;
            return {
              item_code: item.item.trim(),
              qtd: Number(valores.qnt) || 0,
              pct: Number(valores.percentual) || 0,
              total: Number(valores.total) || 0,
            };
          })
          .filter((p): p is { item_code: string; qtd: number; pct: number; total: number } => {
            if (!p) return false;
            return p.qtd !== 0 || p.pct !== 0 || p.total !== 0;
          });

        const { data: existingItems, error: existingError } = await supabase
          .from('medicao_items')
          .select('item_code')
          .eq('medicao_id', medicaoAtualObj.sessionId);
        if (existingError) throw existingError;

        const payloadCodes = new Set(payload.map(p => p.item_code.trim()));
        const existingCodes = new Set(
          (existingItems || [])
            .map((it: any) => (it.item_code || '').trim())
            .filter((c: string) => !!c)
        );
        const codesToDelete = Array.from(existingCodes).filter(c => !payloadCodes.has(c));
        if (codesToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('medicao_items')
            .delete()
            .eq('medicao_id', medicaoAtualObj.sessionId)
            .in('item_code', codesToDelete);
          if (deleteError) throw deleteError;
        }

        await upsertItems(medicaoAtualObj.sessionId, payload, userId);
      }

      toast.success(`Última medição: ${atualizados} itens preenchidos com o saldo restante.`);

      if (items.some(i => i.ehAdministracaoLocal)) {
        calcularEDistribuirAdministracaoLocal(true, medicoesAtualizadas);
      }
    } catch (error) {
      console.error('Erro ao preencher última medição:', error);
      toast.error('Erro ao preencher última medição');
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
  // INCLUINDO a medição atual em edição (não salva ainda)
  const calcularValorAcumuladoItem = (itemId: number): number => {
    if (!medicaoAtual) return 0;
    
    // Para itens MACRO (que têm filhos), somar o acumulado dos filhos
    const item = items.find(i => i.id === itemId);
    if (item) {
      const filhos = childrenByCode.get(item.item.trim()) || [];
      if (filhos.length > 0) {
        return filhos.reduce((sum, filho) => sum + calcularValorAcumuladoItem(filho.id), 0);
      }
    }
    
    // Para itens MICRO (folhas), somar medições
    let totalAcumulado = 0;
    
    // Somar medições anteriores (bloqueadas)
    const sessionsParaSomar = medicoes.filter(m => m.bloqueada && m.id < medicaoAtual);
    sessionsParaSomar.forEach(medicao => {
      const dadosHierarquicos = dadosHierarquicosMemoizados[medicao.id];
      if (dadosHierarquicos && dadosHierarquicos[itemId]) {
        totalAcumulado += dadosHierarquicos[itemId].total || 0;
      }
    });
    
    // Somar também a medição atual (em edição - não salva ainda)
    const medicaoAtualObj = medicoes.find(m => m.id === medicaoAtual);
    if (medicaoAtualObj && medicaoAtualObj.dados[itemId]) {
      totalAcumulado += medicaoAtualObj.dados[itemId].total || 0;
    }
    
    return totalAcumulado;
  };

  // Função para calcular percentual acumulado
  const calcularPercentualAcumulado = (itemId: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;
    
    // Para itens MACRO (que têm filhos), calcular o percentual baseado nos filhos
    const filhos = childrenByCode.get(item.item.trim()) || [];
    if (filhos.length > 0) {
      // Somar o total acumulado dos filhos
      const totalAcumuladoFilhos = filhos.reduce((sum, filho) => {
        return sum + calcularValorAcumuladoItem(filho.id);
      }, 0);
      
      // Somar o total do contrato dos filhos (incluindo aditivos)
      const totalContratoFilhos = filhos.reduce((sum, filho) => {
        return sum + calcularTotalContratoComAditivos(filho, medicaoAtual!);
      }, 0);
      
      if (totalContratoFilhos === 0) return 0;
      
      let pct = (totalAcumuladoFilhos / totalContratoFilhos) * 100;
      
      // Limitar percentuais extremos para evitar valores absurdos
      if (pct > 9999) pct = 9999;
      if (pct < -9999) pct = -9999;
      
      return pct;
    }
    
    // Para itens MICRO (folhas), usar o cálculo direto
    const totalAcumulado = calcularValorAcumuladoItem(itemId);
    const totalContratoItem = calcularTotalContratoComAditivos(item, medicaoAtual!);
    
    if (totalContratoItem === 0) return 0;
    
    let pct = (totalAcumulado / totalContratoItem) * 100;
    
    // Limitar percentuais extremos para evitar valores absurdos
    if (pct > 9999) pct = 9999;
    if (pct < -9999) pct = -9999;
    
    return pct;
  };

  // Função para calcular quantidade acumulada com hierarquia
  // INCLUINDO a medição atual em edição (não salva ainda)
  const calcularQuantidadeAcumulada = (itemId: number) => {
    if (!medicaoAtual) return 0;
    
    let qntAcumulada = 0;
    
    // Somar medições anteriores (bloqueadas)
    const medicoesAnteriores = medicoes.filter(m => m.bloqueada && m.id < medicaoAtual);
    medicoesAnteriores.forEach(medicao => {
      const dadosHierarquicos = dadosHierarquicosMemoizados[medicao.id];
      if (dadosHierarquicos && dadosHierarquicos[itemId]) {
        qntAcumulada += dadosHierarquicos[itemId].qnt || 0;
      }
    });
    
    // Somar também a medição atual (em edição - não salva ainda)
    const medicaoAtualObj = medicoes.find(m => m.id === medicaoAtual);
    if (medicaoAtualObj && medicaoAtualObj.dados[itemId]) {
      qntAcumulada += medicaoAtualObj.dados[itemId].qnt || 0;
    }
    
    return qntAcumulada;
  };

  // Função para formatar moeda — TRUNCA em 2 casas (não arredonda) para preservar
  // a precisão real. O cálculo interno continua usando todas as casas decimais.
  const formatCurrency = (value: number) => {
    const v = Number(value) || 0;
    const truncado = Math.trunc(v * 100) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(truncado);
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

  // Calcular totais gerais (apenas itens folha/MICRO, excluindo MACROS)
  const totaisGerais = {
    valorTotal: items.filter(item => ehItemFolha(item.item)).reduce((sum, item) => sum + item.valorTotal, 0),
    aditivoTotal: aditivos.reduce((aditivoSum, aditivo) => {
      return aditivoSum + items.filter(item => ehItemFolha(item.item)).reduce((itemSum, item) => {
        const aditivoData = aditivo.dados[item.id];
        return itemSum + (aditivoData?.total || 0);
      }, 0);
    }, 0),
    totalContrato: items.filter(item => ehItemFolha(item.item)).reduce((sum, item) => sum + calcularTotalContratoComAditivos(item), 0),
    administracaoLocalTotal: items
      .filter(item => item.ehAdministracaoLocal && ehItemFolha(item.item))
      .reduce((sum, item) => sum + calcularTotalContratoComAditivos(item), 0)
  };

  // Calcular total de serviços executados na medição atual
  // Usa medicao.dados (estado após useEffect de AL) para incluir administração local calculada
  const medicaoAtualData = medicaoAtual ? medicoes.find(m => m.id === medicaoAtual) : null;
  const totalServicosExecutados = medicaoAtualData
    ? Math.round(
        items
          .filter(item => ehItemFolha(item.item))
          .reduce((sum, item) => {
            const dados = medicaoAtualData.dados[item.id];
            // Arredonda cada item individualmente para 2 casas decimais
            // ocultando a terceira casa e evitando divergências de R$0,01
            return sum + Math.round((dados?.total || 0) * 100) / 100;
          }, 0)
        * 100) / 100
    : 0;

  const valorAcumuladoTotal = valorAcumuladoCalculado;

  return (
    <SimpleHeader>
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

        {/* Sistema de Abas */}
        <Tabs defaultValue="medicao-atual" className="w-full">
          <TabsList className={`grid w-full ${canEdit ? 'grid-cols-3' : 'grid-cols-2'} mb-6`}>
            <TabsTrigger value="medicao-atual">Medição Atual</TabsTrigger>
            <TabsTrigger value="analise-financeira">Análise Financeira</TabsTrigger>
            {canEdit && <TabsTrigger value="gestao">Gestão</TabsTrigger>}
          </TabsList>

          {/* ABA 1: MEDIÇÃO ATUAL */}
          <TabsContent value="medicao-atual" className="space-y-6">
            {/* Indicador da Medição Selecionada */}
            {medicaoAtual && (
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">Visualizando:</span>
                <select
                  className="text-sm font-semibold bg-primary text-primary-foreground px-3 py-1 rounded-md cursor-pointer"
                  value={medicaoAtual}
                  onChange={(e) => setMedicaoAtual(Number(e.target.value))}
                >
                  {medicoes.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome}{m.bloqueada ? ' (Bloqueada)' : ''}
                    </option>
                  ))}
                </select>
                {medicoes.find(m => m.id === medicaoAtual)?.bloqueada && (
                  <Badge variant="secondary" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Bloqueada
                  </Badge>
                )}
                {isAdmin && medicoes.find(m => m.id === medicaoAtual)?.bloqueada && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-7 text-xs"
                    onClick={() => setModalAjustarCongeladaOpen(true)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Ajustar valores congelados
                  </Button>
                )}
              </div>
            )}
            
            {/* Resumo Financeiro Detalhado */}
            <div className="cards-grid">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Valor Inicial do Contrato</div>
                  <div className="text-2xl font-bold">{formatCurrency(resumoFinanceiro.valorInicialContrato)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Geral do Aditivo</div>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(resumoFinanceiro.totalGeralAditivo)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Valor Contrato Pós Aditivo</div>
                  <div className="text-2xl font-bold text-green-700">{formatCurrency(resumoFinanceiro.valorContratoPosAditivo)}</div>
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
                  <div className="text-2xl font-bold text-cyan-600">{formatCurrency(valorAcumuladoTotal)}</div>
                  {resumoFinanceiro.valorContratoPosAditivo > 0 && (
                    <div className="text-sm font-semibold text-cyan-700 mt-1">
                      {Math.min((valorAcumuladoTotal / resumoFinanceiro.valorContratoPosAditivo) * 100, 100).toFixed(1)}%
                    </div>
                  )}
                </CardContent>
              </Card>
              {canEdit && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground flex items-center justify-between">
                      <span>Desconto da Obra</span>
                      {!editandoDesconto && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => {
                            setNovoDesconto(String(obra?.percentual_desconto ?? 0));
                            setEditandoDesconto(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {editandoDesconto ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={novoDesconto}
                          onChange={(e) => setNovoDesconto(e.target.value)}
                          className="h-8 w-24 text-sm"
                          placeholder="0.00"
                        />
                        <span className="text-sm">%</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={salvarPercentualDesconto}>
                          <Check className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditandoDesconto(false)}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-purple-600">
                        {(obra?.percentual_desconto ?? 0).toFixed(2)}%
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
            {/* Tabela Principal */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Planilha Orçamentária</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-2"
                          disabled={!medicaoAtual}
                        >
                          <Download className="h-4 w-4" />
                          Exportar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setExportDialogAberto(true)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Exportar Planilha XLS
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportarPlanilhaPDF}>
                          <FileText className="h-4 w-4 mr-2" />
                          Exportar Planilha PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const medicaoAtualObj = medicoes.find(m => m.id === medicaoAtual);
                          if (!medicaoAtualObj?.bloqueada) {
                            toast.error('Salve e bloqueie a medição antes de gerar o relatório');
                            return;
                          }
                          setModalRelatorioAberto(true);
                        }}>
                          <FileText className="h-4 w-4 mr-2" />
                          Relatório Técnico
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {canEdit && (
                      <>
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
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                          onClick={preencherUltimaMedicao}
                          title="Preenche todos os itens folha desta medição com o saldo restante (quantitativo total - já pago)"
                        >
                          <Calculator className="h-4 w-4" />
                          Última Medição
                        </Button>
                        <Dialog open={modalImportarRDOAberto} onOpenChange={setModalImportarRDOAberto}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              Importar do RDO
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <ImportarDoRDO 
                              obraId={id!}
                              medicaoId={medicoes.find(m => m.id === medicaoAtual)?.sessionId || ''}
                              onImportar={importarDadosDoRDO}
                              onFechar={() => setModalImportarRDOAberto(false)}
                            />
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                    {items.length > 0 && canEdit && (
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirm({ open: true, type: 'limpar-planilha' });
                        }}
                        title="Excluir planilha"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
          <CardContent className="p-1">
            <div className="table-wrap border rounded-lg overflow-hidden">
                <Table className="text-xs table-fixed">
                  <colgroup>
                    <col style={{ width: '50px' }} />
                    <col style={{ width: '70px' }} />
                    <col style={{ width: '300px' }} />
                    <col style={{ width: '50px' }} />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '90px' }} />
                    <col style={{ width: '120px' }} />
                     {mostrarAditivos && aditivosComValor.map((ad) => (
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
                    {/* Primeira linha: Agrupamentos */}
                    <TableRow className="bg-slate-200 border-b">
                      <TableHead colSpan={7} className="font-bold text-center border border-gray-300 px-1 py-2 text-xs">
                        Planilha Orçamentária
                      </TableHead>
                      {mostrarAditivos && aditivosComValor.length > 0 && (
                        <TableHead colSpan={aditivosComValor.length * 3} className="bg-blue-100 font-bold text-center border border-blue-300 px-1 py-2 text-xs">
                          {aditivosComValor.map(a => a.nome).join(' | ')}
                        </TableHead>
                      )}
                      <TableHead className="bg-green-100 font-bold text-center border border-green-300 px-1 py-2 text-xs">
                        TOTAL CONTRATO
                      </TableHead>
                      <TableHead colSpan={3} className="bg-yellow-100 font-bold text-center border border-yellow-300 px-1 py-2 text-xs">
                        {medicaoAtual}ª MEDIÇÃO
                      </TableHead>
                      <TableHead colSpan={3} className="bg-purple-100 font-bold text-center border border-purple-300 px-1 py-2 text-xs">
                        ACUMULADA
                      </TableHead>
                      <TableHead rowSpan={2} className="font-bold text-center border border-gray-300 px-1 py-2 text-xs align-middle">
                        Admin. Local
                      </TableHead>
                    </TableRow>
                    
                    {/* Segunda linha: Subcolunas */}
                    <TableRow className="bg-slate-100 border-b-2">
                      <TableHead className="w-[50px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Item</TableHead>
                      <TableHead className="w-[70px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Código Banco</TableHead>
                      <TableHead className="w-[300px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Descrição</TableHead>
                      <TableHead className="w-[50px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Und</TableHead>
                      <TableHead className="w-[80px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Quant.</TableHead>
                      <TableHead className="w-[90px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Valor unit com BDI e Desc.</TableHead>
                      <TableHead className="w-[120px] font-bold text-center border border-gray-300 px-1 py-2 text-xs">Valor total com BDI e Desconto</TableHead>
                      {mostrarAditivos && aditivosComValor.map(aditivo => (
                        <React.Fragment key={`subheader-${aditivo.id}`}>
                          <TableHead className="w-[70px] bg-blue-100 font-bold text-center border border-blue-300 px-1 py-2 text-xs">QNT</TableHead>
                          <TableHead className="w-[50px] bg-blue-100 font-bold text-center border border-blue-300 px-1 py-2 text-xs">%</TableHead>
                          <TableHead className="w-[80px] bg-blue-100 font-bold text-center border border-blue-300 px-1 py-2 text-xs">TOTAL</TableHead>
                        </React.Fragment>
                      ))}
                      <TableHead className="w-[120px] bg-green-100 font-bold text-center border border-green-300 px-1 py-2 text-xs"></TableHead>
                      <TableHead className="w-[70px] bg-yellow-100 font-bold text-center border border-yellow-300 px-1 py-2 text-xs">QNT</TableHead>
                      <TableHead className="w-[50px] bg-yellow-100 font-bold text-center border border-yellow-300 px-1 py-2 text-xs">%</TableHead>
                      <TableHead className="w-[80px] bg-yellow-100 font-bold text-center border border-yellow-300 px-1 py-2 text-xs">TOTAL</TableHead>
                      <TableHead className="w-[70px] bg-purple-100 font-bold text-center border border-purple-300 px-1 py-2 text-xs">QNT</TableHead>
                      <TableHead className="w-[50px] bg-purple-100 font-bold text-center border border-purple-300 px-1 py-2 text-xs">%</TableHead>
                      <TableHead className="w-[80px] bg-purple-100 font-bold text-center border border-purple-300 px-1 py-2 text-xs">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...items].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(item => {
                      // Usar dados hierárquicos memoizados para performance
                      const medicaoData = medicaoAtual ? (dadosHierarquicosMemoizados[medicaoAtual]?.[item.id] || { qnt: 0, percentual: 0, total: 0 }) : { qnt: 0, percentual: 0, total: 0 };
                      const estiloLinha = obterEstiloLinha(item);
                       const medicaoAtualObj = medicaoAtual ? medicoes.find(m => m.id === medicaoAtual) : null;
                       
                       // Descendentes do item (IDs) para somatórios hierárquicos
                       const descendantIds = (() => {
                         const ids: number[] = [];
                         const stack: string[] = [item.item];
                         while (stack.length) {
                           const code = stack.pop()!;
                           const children = childrenByCode.get(code) || [];
                           for (const child of children) {
                             ids.push(child.id);
                             stack.push(child.item);
                           }
                         }
                         return ids;
                       })();
                       
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
                              {ehItemFolha(item.item)
                                ? item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : ''}
                            </div>
                          </TableCell>
                          {/* Valor unit com BDI e Desc. */}
                          <TableCell className="border border-gray-300 p-1">
                            <div className="text-right font-mono text-xs px-1">
                              {ehItemFolha(item.item)
                                ? `R$ ${(item.quantidade > 0 ? item.valorTotal / item.quantidade : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : ''}
                            </div>
                          </TableCell>
                          {/* Valor total com BDI e Desconto */}
                          <TableCell className="border border-gray-300 p-1">
                            <div className="text-right font-mono text-xs px-1">
                              R$ {(() => {
                                // Para itens folha, mostrar valor próprio
                                if (ehItemFolha(item.item)) {
                                  return item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                }
                                
                                // Para itens pai, somar valores dos filhos diretos
                                const filhosDirectos = items.filter(filho => {
                                  const paiDoFilho = filho.item.split('.').slice(0, -1).join('.');
                                  return paiDoFilho === item.item;
                                });
                                
                                const somaFilhos = filhosDirectos.reduce((sum, filho) => sum + filho.valorTotal, 0);
                                return somaFilhos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                              })()}
                            </div>
                          </TableCell>
                           {mostrarAditivos && aditivosComValor.map(aditivo => {
                             const aditivoData = aditivo.dados[item.id] || { qnt: 0, percentual: 0, total: 0 };
                             return (
                               <React.Fragment key={`aditivo-${aditivo.id}-${item.id}`}>
                                 <TableCell className="bg-blue-100 border border-blue-300 p-1">
                                   <Input
                                     key={`adit-${aditivo.id}-${item.id}`}
                                     type="number"
                                     defaultValue={aditivoData.qnt || ''}
                                     onChange={(e) => onChangeAditivoDebounced(item.id, aditivo.id, 'qnt', e.target.value)}
                                     onBlur={(e) => {
                                       const key = `${aditivo.id}:${item.id}:qnt`;
                                       const prev = debouncersAditivoRef.current.get(key);
                                       if (prev) {
                                         window.clearTimeout(prev);
                                         debouncersAditivoRef.current.delete(key);
                                       }
                                       atualizarAditivo(item.id, aditivo.id, 'qnt', e.target.value);
                                     }}
                                     className="w-full h-6 text-xs font-mono text-right border-0 bg-transparent p-1"
                                     step="0.01"
                                     min="0"
                                     disabled={aditivo.bloqueada || !canEdit}
                                   />
                                 </TableCell>
                                 <TableCell className="bg-blue-100 border border-blue-300 p-1">
                                   <div className="text-center font-mono text-xs px-1">
                                     {aditivoData.percentual.toFixed(2)}%
                                   </div>
                                 </TableCell>
                                 <TableCell className="bg-blue-100 border border-blue-300 p-1">
                                   <div className="text-right font-mono text-xs px-1">
                                     {(() => {
                                       const totalAditivoExibido = ehItemFolha(item.item)
                                         ? aditivoData.total
                                         : descendantIds.reduce((sum, id) => sum + ((aditivo.dados[id]?.total) || 0), 0);
                                       return `R$ ${totalAditivoExibido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                     })()}
                                   </div>
                                 </TableCell>
                               </React.Fragment>
                             );
                           })}
                          <TableCell className="bg-green-100 border border-green-300 p-1">
                            <div className="text-right font-mono text-xs px-1 font-bold">
                              {(() => {
                                // Para itens folha, mostrar valor próprio
                                if (ehItemFolha(item.item)) {
                                  const somaAditivosBloqueados = aditivos
                                    .filter(a => a.bloqueada)
                                    .reduce((sumA, a) => sumA + ((a.dados[item.id]?.total) || 0), 0);
                                  // Para itens extracontratuais, o valorTotal já vem do aditivo, então usar apenas o aditivo
                                  // Para itens contratuais, somar valorTotal (contrato original) + aditivos
                                  const valorBase = item.origem === 'extracontratual' ? 0 : item.valorTotal;
                                  const totalContratoVisual = valorBase + somaAditivosBloqueados;
                                  return `R$ ${totalContratoVisual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                }
                                
                                // Para itens pai, somar valores dos filhos diretos
                                const filhosDirectos = items.filter(filho => {
                                  const paiDoFilho = filho.item.split('.').slice(0, -1).join('.');
                                  return paiDoFilho === item.item;
                                });
                                
                                const somaFilhos = filhosDirectos.reduce((sum, filho) => {
                                  const somaAditivosFilho = aditivos
                                    .filter(a => a.bloqueada)
                                    .reduce((sumA, a) => sumA + ((a.dados[filho.id]?.total) || 0), 0);
                                  // Para itens extracontratuais, não somar valorTotal (já está no aditivo)
                                  const valorBaseFilho = filho.origem === 'extracontratual' ? 0 : filho.valorTotal;
                                  return sum + valorBaseFilho + somaAditivosFilho;
                                }, 0);
                                
                                return `R$ ${somaFilhos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="bg-yellow-100 border border-yellow-300 p-1">
                            {medicaoAtual && medicaoAtualObj ? (
                              ehItemFolha(item.item) && !item.ehAdministracaoLocal ? (
                                <Input
                                  key={`med-${medicaoAtual}-${item.id}`}
                                  type="number"
                                  defaultValue={medicaoData.qnt || ''}
                                  onChange={(e) => onChangeMedicaoDebounced(item.id, medicaoAtual, 'qnt', e.target.value)}
                                  onBlur={(e) => {
                                    const key = `${medicaoAtual}:${item.id}:qnt`;
                                    const prev = debouncersRef.current.get(key);
                                    if (prev) {
                                      window.clearTimeout(prev);
                                      debouncersRef.current.delete(key);
                                    }
                                    atualizarMedicao(item.id, medicaoAtual, 'qnt', e.target.value);
                                  }}
                                  className="w-full h-6 text-xs font-mono text-right border-0 bg-transparent p-1"
                                  step="0.01"
                                  min="0"
                                  disabled={medicaoAtualObj.bloqueada || !canEdit}
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
                             {(() => {
                               const totalContratoVisual = medicaoAtual
                                 ? calcularTotalContratoComAditivos(item, medicaoAtual)
                                 : (() => {
                                     const somaAditivosTodos = aditivos.reduce((sumA, a) => sumA + descendantIds.reduce((s, id) => s + ((a.dados[id]?.total) || 0), 0), 0);
                                     return item.valorTotal + somaAditivosTodos;
                                   })();
                               
                               // Validação melhorada para cálculo de percentual
                               if (totalContratoVisual === 0) return '0,00%';
                               
                               let pct = (medicaoData.total / totalContratoVisual) * 100;
                               
                               // Limitar percentuais extremos para evitar valores absurdos
                               if (pct > 9999) pct = 9999;
                               if (pct < -9999) pct = -9999;
                               
                               return pct.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
                             })()}
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
                                disabled={!canEdit}
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
          </CardContent>
        </Card>
      </TabsContent>

      {/* ABA 2: ANÁLISE FINANCEIRA */}
      <TabsContent value="analise-financeira" className="space-y-6">
        {/* Resumo do Contrato */}
        <ResumoContrato 
          valorTotalOriginal={calcularValorTotalOriginal}
          aditivos={aditivos}
          items={items}
          ehItemPrimeiroNivel={ehItemPrimeiroNivel}
          medicaoAtual={medicaoAtual}
          canEdit={canEdit}
          marcos={dadosMedicaoFinanceiro.marcos}
          totalContrato={dadosMedicaoFinanceiro.totalContrato}
        />

        {/* Cronograma Financeiro */}
        <CronogramaView obraId={obra.id} canEdit={canEdit} />
      </TabsContent>

      {/* ABA 3: GESTÃO */}
      <TabsContent value="gestao" className="space-y-6">
        {/* Medições */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Medições
              </CardTitle>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <>
                    <ImportarCronograma 
                      obraId={obra.id} 
                      onSuccess={async () => {
                        await logCronogramaImportado(obra.id, 0);
                        toast.success('Cronograma importado com sucesso!');
                      }}
                    />
                    <Button onClick={criarNovaMedicao} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Nova Medição
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <div className="flex flex-wrap items-center gap-2">
                {medicoes.map((m) => {
                  const isActive = medicaoAtual === m.id;
                  const label = `${m.bloqueada ? '🔒' : '✏️'} ${m.id}ª Medição`;
                  const iso = m.dataBloqueio ? new Date(m.dataBloqueio).toISOString() : '';
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <Button
                        variant={isActive ? 'secondary' : 'outline'}
                        size="sm"
                        className="h-8 rounded-full px-3"
                        onClick={() => setMedicaoAtual(m.id)}
                        title={m.bloqueada && m.dataBloqueio ? relativeTimePTBR(m.dataBloqueio) : ''}
                      >
                        {label}
                      </Button>

                      {isActive && (
                        <>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Ações da medição">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[200px]">
                              {m.bloqueada ? (
                                <>
                                  {isAdmin && (
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        setConfirm({ open: true, type: 'reabrir-medicao', medicaoId: m.id });
                                      }}
                                    >
                                      🔓 Reabrir
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setConfirm({ open: true, type: 'excluir-medicao', medicaoId: m.id });
                                    }}
                                  >
                                    🗑️ Excluir
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  {isAdmin ? (
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        salvarEBloquearMedicao(m.id);
                                      }}
                                    >
                                      ✅ Salvar e Bloquear
                                    </DropdownMenuItem>
                                  ) : (
                                    <>
                                      <DropdownMenuItem
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          salvarMedicao(m.id);
                                        }}
                                      >
                                        💾 Salvar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          bloquearMedicao(m.id);
                                        }}
                                      >
                                        🔒 Bloquear
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setConfirm({ open: true, type: 'excluir-medicao', medicaoId: m.id });
                                    }}
                                  >
                                    🗑️ Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {m.bloqueada && m.dataBloqueio && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="text-xs text-muted-foreground">
                                  Concluída · {formatDateTimePTBR(m.dataBloqueio)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <span>{iso}</span>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Aditivos */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Aditivos
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={mostrarAditivos ? 'secondary' : 'outline'}
                  onClick={() => setMostrarAditivos(!mostrarAditivos)}
                  className="flex items-center gap-2"
                >
                  {mostrarAditivos ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {mostrarAditivos ? 'Ocultar' : 'Mostrar'} Aditivos
                </Button>
                {canEdit && (
                  <Button onClick={() => setNovoAditivoAberto(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Aditivo
                  </Button>
                )}
                <NovoAditivoModal
                  open={novoAditivoAberto}
                  onOpenChange={setNovoAditivoAberto}
                  onConfirm={confirmarNovoAditivo}
                  sequenciasDisponiveis={(() => { 
                    const maxSeq = medicoes.length ? Math.max(...medicoes.map(m => m.id)) : 0; 
                    // Incluir opção 0 (Antes da 1ª Medição) + todas as medições existentes + próxima
                    return [0, ...Array.from({ length: maxSeq + 1 }, (_, i) => i + 1)]; 
                  })()}
                  defaultSequencia={(() => { 
                    // Se não há medições, sugerir 0 (antes da 1ª medição)
                    const maxSeq = medicoes.length ? Math.max(...medicoes.map(m => m.id)) : 0; 
                    return maxSeq === 0 ? 0 : maxSeq + 1; 
                  })()}
                />
              </div>
            </div>
          </CardHeader>
          {mostrarAditivos && (
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                {aditivos.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <Badge variant="outline" className="h-8 rounded-full px-3 text-sm">
                      {a.nome}
                    </Badge>
                    <Badge variant={a.bloqueada ? 'default' : 'secondary'} className="text-xs">
                      {a.bloqueada ? 'Publicado' : 'Rascunho'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Ações do aditivo">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[200px]">
                        {a.bloqueada ? (
                          <>
                            {canEdit && (
                              <>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    editarAditivo(a.id);
                                  }}
                                >
                                  ✏️ Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setConfirm({ open: true, type: 'excluir-aditivo', aditivoId: a.id });
                                  }}
                                >
                                  🗑️ Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {canEdit && (
                              <>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setReimportarAditivoId(a.id);
                                    fileInputReimportRef.current?.click();
                                  }}
                                >
                                  📥 Importar Planilha
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    salvarAditivo(a.id);
                                  }}
                                >
                                  💾 Salvar rascunho
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    publicarAditivo(a.id);
                                  }}
                                >
                                  ✅ Salvar e Publicar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setConfirm({ open: true, type: 'excluir-aditivo', aditivoId: a.id });
                                  }}
                                >
                                  🗑️ Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Histórico de Alterações */}
        <ObraAuditLogs obraId={obra.id} />
      </TabsContent>
    </Tabs>

    {/* Modal Relatório Técnico */}
    {obra && medicaoAtual && (
      <RelatorioMedicaoModal
        open={modalRelatorioAberto}
        onOpenChange={setModalRelatorioAberto}
        obra={obra}
        medicaoAtual={medicaoAtual}
        items={items}
        medicoes={medicoes}
        aditivos={aditivos}
        calcularValorAcumuladoItem={calcularValorAcumuladoItem}
        calcularTotalContratoComAditivos={calcularTotalContratoComAditivos}
        dadosHierarquicos={dadosHierarquicosMemoizados}
      />
    )}

    {/* Modal Admin — Ajustar valores congelados */}
    {isAdmin && id && (
      <AjustarMedicaoCongeladaModal
        open={modalAjustarCongeladaOpen}
        onOpenChange={setModalAjustarCongeladaOpen}
        medicaoSessionId={medicoes.find(m => m.id === medicaoAtual)?.sessionId || null}
        obraId={id}
        medicaoNome={medicoes.find(m => m.id === medicaoAtual)?.nome || ''}
        onSaved={() => fetchMedicoesSalvas()}
      />
    )}


    <NovaMedicaoDialog
      open={novaMedicaoOpen}
      onOpenChange={setNovaMedicaoOpen}
      proximaSequencia={proximaSequenciaPrevista}
      onConfirm={confirmarCriarNovaMedicao}
    />

    {/* Modal Exportar XLS com seleção de medições */}
    <ExportMedicaoDialog
      open={exportDialogAberto}
      onOpenChange={setExportDialogAberto}
      medicoes={medicoes}
      medicaoAtual={medicaoAtual}
      onExport={handleExportarPlanilhaXLS}
    />

    {/* Confirmações - Movido para fora das Tabs para aparecer em qualquer aba */}
    <AlertDialog open={confirm.open} onOpenChange={(open) => setConfirm((c) => ({ ...c, open }))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirm.type === 'reabrir-medicao' && 'Reabrir medição?'}
            {confirm.type === 'excluir-medicao' && 'Excluir medição?'}
            {confirm.type === 'excluir-aditivo' && 'Excluir aditivo?'}
            {confirm.type === 'limpar-planilha' && 'Excluir planilha orçamentária?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {confirm.type === 'reabrir-medicao' && 'A medição voltará para edição.'}
            {confirm.type === 'limpar-planilha' && (
              <div className="space-y-2">
                <p className="font-semibold text-destructive">⚠️ Atenção: Esta ação é irreversível!</p>
                <p>Todos os dados da planilha orçamentária serão excluídos.</p>
                <p className="text-destructive font-medium">
                  As atividades do RDO (Diário de Obra) vinculadas a esta planilha também serão perdidas permanentemente, 
                  incluindo todos os quantitativos executados lançados nos relatórios diários.
                </p>
                <p className="text-muted-foreground text-sm">
                  Os relatórios (capas do RDO) permanecerão, mas as atividades precisarão ser preenchidas novamente após reimportar a planilha.
                </p>
              </div>
            )}
            {(confirm.type === 'excluir-medicao' || confirm.type === 'excluir-aditivo') && 'Esta ação não pode ser desfeita.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (confirm.type === 'reabrir-medicao' && confirm.medicaoId != null) {
                reabrirMedicao(confirm.medicaoId);
              }
              if (confirm.type === 'excluir-medicao' && confirm.medicaoId != null) {
                excluirMedicao(confirm.medicaoId);
              }
              if (confirm.type === 'excluir-aditivo' && confirm.aditivoId != null) {
                excluirAditivo(confirm.aditivoId);
              }
              if (confirm.type === 'limpar-planilha') {
                limparPlanilha();
              }
              setConfirm({ open: false });
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

        {/* Input oculto para reimportar planilha de aditivo */}
        <input
          ref={fileInputReimportRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={handleReimportFileChange}
          style={{ display: 'none' }}
        />
        </div>
      </div>
    </SimpleHeader>
  );
}