import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Loader2, Upload, Image, X, GripVertical, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Obra {
  id: string;
  nome: string;
  municipio: string;
  valor_total: number;
  valor_aditivado?: number;
  n_contrato?: string;
  empresa_responsavel?: string;
  data_inicio?: string;
  tempo_obra?: number;
}

interface Item {
  id: number;
  item: string;
  codigo: string;
  descricao: string;
  und: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  totalContrato: number;
  nivel: number;
  ehAdministracaoLocal: boolean;
}

interface Medicao {
  id: number;
  sessionId?: string;
  nome: string;
  dados: { [itemId: number]: { qnt: number; percentual: number; total: number } };
  bloqueada?: boolean;
}

interface GrupoMedicao {
  item: string;
  descricao: string;
  executado: number;
  executadoAcum: number;
}

interface FotoRelatorio {
  id: string;
  url: string;
  legenda: string;
  data?: string;
  fromRdo: boolean;
}

interface RdoMedia {
  id: string;
  file_url: string;
  descricao: string | null;
  data: string;
  report_id: string;
}

interface RelatorioMedicaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obra: Obra;
  medicaoAtual: number;
  items: Item[];
  medicoes: Medicao[];
  calcularValorAcumuladoItem: (itemId: number) => number;
  calcularTotalContratoComAditivos: (item: Item, medicaoId: number) => number;
  dadosHierarquicos: { [medicaoId: number]: { [itemId: number]: { qnt: number; percentual: number; total: number } } };
}

export function RelatorioMedicaoModal({
  open,
  onOpenChange,
  obra,
  medicaoAtual,
  items,
  medicoes,
  calcularValorAcumuladoItem,
  calcularTotalContratoComAditivos,
  dadosHierarquicos
}: RelatorioMedicaoModalProps) {
  const [servicosExecutados, setServicosExecutados] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [dataRelatorio, setDataRelatorio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fiscalNome, setFiscalNome] = useState('');
  const [fiscalCargo, setFiscalCargo] = useState('');
  const [gerando, setGerando] = useState(false);
  
  // Estado para fotos
  const [fotosRelatorio, setFotosRelatorio] = useState<FotoRelatorio[]>([]);
  const [rdoMedias, setRdoMedias] = useState<RdoMedia[]>([]);
  const [selectedRdoIds, setSelectedRdoIds] = useState<Set<string>>(new Set());
  const [loadingRdoMedias, setLoadingRdoMedias] = useState(false);
  const [dataVistoria, setDataVistoria] = useState('');

  // Função para converter número da medição em ordinal por extenso
  const numeroMedicaoExtenso = (num: number): string => {
    const ordinais: { [key: number]: string } = {
      1: 'primeira', 2: 'segunda', 3: 'terceira', 4: 'quarta', 5: 'quinta',
      6: 'sexta', 7: 'sétima', 8: 'oitava', 9: 'nona', 10: 'décima',
      11: 'décima primeira', 12: 'décima segunda', 13: 'décima terceira', 
      14: 'décima quarta', 15: 'décima quinta', 16: 'décima sexta',
      17: 'décima sétima', 18: 'décima oitava', 19: 'décima nona', 20: 'vigésima'
    };
    return ordinais[num] || `${num}ª`;
  };

  // Buscar fotos do RDO quando período mudar
  useEffect(() => {
    const fetchRdoMedias = async () => {
      if (!obra.id || !periodoInicio || !periodoFim) {
        setRdoMedias([]);
        return;
      }

      setLoadingRdoMedias(true);
      try {
        const { data, error } = await supabase
          .from('rdo_media')
          .select(`
            id,
            file_url,
            descricao,
            report_id,
            rdo_reports!inner(data, obra_id)
          `)
          .eq('rdo_reports.obra_id', obra.id)
          .gte('rdo_reports.data', periodoInicio)
          .lte('rdo_reports.data', periodoFim)
          .eq('tipo', 'foto')
          .order('created_at', { ascending: true });

        if (error) throw error;

        const medias: RdoMedia[] = (data || []).map((item: any) => ({
          id: item.id,
          file_url: item.file_url,
          descricao: item.descricao,
          data: item.rdo_reports?.data,
          report_id: item.report_id
        }));

        setRdoMedias(medias);
      } catch (error) {
        console.error('Erro ao buscar fotos do RDO:', error);
      } finally {
        setLoadingRdoMedias(false);
      }
    };

    fetchRdoMedias();
  }, [obra.id, periodoInicio, periodoFim]);

  // Agrupar fotos RDO por data
  const rdoMediasByDate = useMemo(() => {
    const grouped: { [date: string]: RdoMedia[] } = {};
    rdoMedias.forEach(media => {
      const date = media.data || 'Sem data';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(media);
    });
    return grouped;
  }, [rdoMedias]);

  // Selecionar/desselecionar foto do RDO
  const toggleRdoPhoto = (media: RdoMedia) => {
    const newSelected = new Set(selectedRdoIds);
    if (newSelected.has(media.id)) {
      newSelected.delete(media.id);
      setFotosRelatorio(prev => prev.filter(f => f.id !== media.id));
    } else {
      newSelected.add(media.id);
      setFotosRelatorio(prev => [...prev, {
        id: media.id,
        url: media.file_url,
        legenda: media.descricao || '',
        data: media.data,
        fromRdo: true
      }]);
    }
    setSelectedRdoIds(newSelected);
  };

  // Selecionar todas as fotos de uma data
  const selectAllFromDate = (date: string, select: boolean) => {
    const mediasDate = rdoMediasByDate[date] || [];
    const newSelected = new Set(selectedRdoIds);
    
    if (select) {
      mediasDate.forEach(media => {
        if (!newSelected.has(media.id)) {
          newSelected.add(media.id);
          setFotosRelatorio(prev => [...prev, {
            id: media.id,
            url: media.file_url,
            legenda: media.descricao || '',
            data: media.data,
            fromRdo: true
          }]);
        }
      });
    } else {
      mediasDate.forEach(media => {
        newSelected.delete(media.id);
      });
      setFotosRelatorio(prev => prev.filter(f => !mediasDate.some(m => m.id === f.id)));
    }
    
    setSelectedRdoIds(newSelected);
  };

  // Upload de fotos do computador
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setFotosRelatorio(prev => [...prev, {
          id: `upload-${Date.now()}-${i}`,
          url: dataUrl,
          legenda: '',
          fromRdo: false
        }]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Remover foto
  const removeFoto = (fotoId: string) => {
    setFotosRelatorio(prev => prev.filter(f => f.id !== fotoId));
    setSelectedRdoIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(fotoId);
      return newSet;
    });
  };

  // Atualizar legenda
  const updateLegenda = (fotoId: string, legenda: string) => {
    setFotosRelatorio(prev => prev.map(f => 
      f.id === fotoId ? { ...f, legenda } : f
    ));
  };

  // Mover foto para cima/baixo
  const moveFoto = (index: number, direction: 'up' | 'down') => {
    const newFotos = [...fotosRelatorio];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newFotos.length) return;
    [newFotos[index], newFotos[newIndex]] = [newFotos[newIndex], newFotos[index]];
    setFotosRelatorio(newFotos);
  };

  // Calcular grupos de primeiro nível (MACROs)
  const gruposMedicao = useMemo(() => {
    const medicaoAtualObj = medicoes.find(m => m.id === medicaoAtual);
    if (!medicaoAtualObj) return [];

    const gruposPrincipais = items.filter(item => {
      const parts = item.item.split('.');
      return parts.length === 1 && !isNaN(parseInt(parts[0]));
    });

    return gruposPrincipais.map(grupo => {
      const itemsDoGrupo = items.filter(item => 
        item.item.startsWith(grupo.item + '.') || item.item === grupo.item
      );

      let executado = 0;
      let executadoAcum = 0;
      
      itemsDoGrupo.forEach(item => {
        const dadosMedicao = dadosHierarquicos[medicaoAtual]?.[item.id];
        if (dadosMedicao) {
          executado += dadosMedicao.total;
        }
        executadoAcum += calcularValorAcumuladoItem(item.id);
      });

      return {
        item: grupo.item,
        descricao: grupo.descricao,
        executado,
        executadoAcum
      } as GrupoMedicao;
    }).filter(g => g.executado > 0 || g.executadoAcum > 0);
  }, [items, medicoes, medicaoAtual, dadosHierarquicos, calcularValorAcumuladoItem]);

  // Calcular totais
  const totais = useMemo(() => {
    const medicaoAtualObj = medicoes.find(m => m.id === medicaoAtual);
    if (!medicaoAtualObj) return { executado: 0, executadoAcum: 0, contrato: 0, percentual: 0 };

    const ehItemFolha = (itemCode: string) => {
      return !items.some(other => 
        other.item !== itemCode && 
        other.item.startsWith(itemCode + '.')
      );
    };

    let totalContrato = 0;
    let totalExecutado = 0;
    let totalExecutadoAcum = 0;

    items.filter(item => ehItemFolha(item.item)).forEach(item => {
      totalContrato += calcularTotalContratoComAditivos(item, medicaoAtual);
      
      const dadosMedicao = dadosHierarquicos[medicaoAtual]?.[item.id];
      if (dadosMedicao) {
        totalExecutado += dadosMedicao.total;
      }
      totalExecutadoAcum += calcularValorAcumuladoItem(item.id);
    });

    return {
      executado: totalExecutado,
      executadoAcum: totalExecutadoAcum,
      contrato: totalContrato,
      percentual: totalContrato > 0 ? (totalExecutadoAcum / totalContrato) * 100 : 0
    };
  }, [items, medicoes, medicaoAtual, dadosHierarquicos, calcularValorAcumuladoItem, calcularTotalContratoComAditivos]);

  const formatMoney = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatMoneyExtenso = (valor: number) => {
    const formatarExtenso = (num: number): string => {
      if (num === 0) return 'zero reais';
      
      const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
      const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
      const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
      const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

      const inteiro = Math.floor(num);
      const centavos = Math.round((num - inteiro) * 100);

      let resultado = '';
      
      if (inteiro >= 1000) {
        const milhares = Math.floor(inteiro / 1000);
        if (milhares === 1) {
          resultado += 'mil ';
        } else {
          resultado += formatarExtenso(milhares).replace(' reais', '') + ' mil ';
        }
      }

      const resto = inteiro % 1000;
      if (resto >= 100) {
        if (resto === 100) {
          resultado += 'cem ';
        } else {
          resultado += centenas[Math.floor(resto / 100)] + ' ';
        }
      }

      const dezena = resto % 100;
      if (dezena >= 10 && dezena < 20) {
        if (resultado && dezena > 0) resultado += 'e ';
        resultado += especiais[dezena - 10] + ' ';
      } else {
        if (Math.floor(dezena / 10) > 0) {
          if (resultado) resultado += 'e ';
          resultado += dezenas[Math.floor(dezena / 10)] + ' ';
        }
        if (dezena % 10 > 0) {
          if (resultado && Math.floor(dezena / 10) > 0) resultado += 'e ';
          else if (resultado) resultado += 'e ';
          resultado += unidades[dezena % 10] + ' ';
        }
      }

      if (inteiro === 1) {
        resultado += 'real';
      } else if (inteiro > 0) {
        resultado += 'reais';
      }

      if (centavos > 0) {
        if (inteiro > 0) resultado += ' e ';
        if (centavos < 10) {
          resultado += unidades[centavos] + ' centavo' + (centavos === 1 ? '' : 's');
        } else if (centavos < 20) {
          resultado += especiais[centavos - 10] + ' centavos';
        } else {
          resultado += dezenas[Math.floor(centavos / 10)];
          if (centavos % 10 > 0) resultado += ' e ' + unidades[centavos % 10];
          resultado += ' centavos';
        }
      }

      return resultado.trim();
    };

    return formatarExtenso(valor);
  };

  // Gerar páginas do Anexo 01 (2 fotos na primeira página, 3 nas demais - 1 por linha)
  const gerarPaginasAnexo = () => {
    if (fotosRelatorio.length === 0) return '';

    const fotosFirstPage = 2; // Primeira página tem cabeçalho, cabe 2 fotos
    const fotosPerPage = 3;   // Demais páginas cabem 3 fotos (1 por linha)
    const pages: string[] = [];
    const dataVistoriaFormatada = dataVistoria 
      ? format(new Date(dataVistoria + 'T12:00:00'), 'dd/MM/yyyy')
      : format(new Date(dataRelatorio), 'dd/MM/yyyy');

    let fotoIndex = 0;
    let isFirstPage = true;
    let fotosOnCurrentPage = 0;
    let currentPage = '';

    const startNewPage = (withHeader: boolean) => {
      if (withHeader) {
        return `
          <div class="page">
            <div class="header">
              <div class="header-title">DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</div>
              <div class="header-subtitle">DIRETORIA DE INFRAESTRUTURA FÍSICA</div>
            </div>
            <div class="page-content">
              <div style="text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0 15px 0;">
                ANEXO 01
              </div>

              <div style="margin-bottom: 8px; font-size: 11px;">
                <strong>Obra:</strong> ${obra.nome}
              </div>
              <div style="margin-bottom: 8px; font-size: 11px;">
                <strong>Local:</strong> ${obra.municipio} - MT
              </div>
              <div style="margin-bottom: 8px; font-size: 11px;">
                <strong>Data da vistoria:</strong> ${dataVistoriaFormatada}
              </div>
              <div style="margin-bottom: 15px; font-size: 11px; text-align: justify;">
                <strong>Objeto:</strong> As fotos abaixo elencadas apresentam o relatório fotográfico da vistoria realizada pelo ${fiscalCargo || 'Fiscal'} ${fiscalNome || '[Nome do Fiscal]'}. O relatório fotográfico tem como propósito a fiscalização dos serviços executados pela empresa ${obra.empresa_responsavel || '[Empresa]'} ${periodoInicio && periodoFim ? `no período de ${format(new Date(periodoInicio + 'T12:00:00'), 'dd/MM/yyyy')} até ${format(new Date(periodoFim + 'T12:00:00'), 'dd/MM/yyyy')}` : ''}, dando como finalizada a ${medicaoAtual}ª Medição.
              </div>

              <div style="text-align: center; font-size: 14px; font-weight: bold; margin: 10px 0;">
                RELATÓRIO FOTOGRÁFICO
              </div>

              <div class="photo-grid-first">
        `;
      } else {
        return `
          <div class="page">
            <div class="header">
              <div class="header-title">DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</div>
              <div class="header-subtitle">DIRETORIA DE INFRAESTRUTURA FÍSICA</div>
            </div>
            <div class="page-content">
              <div class="photo-grid">
        `;
      }
    };

    const closePage = () => {
      return `
              </div>
            </div>
            <div class="footer">
              Rua 02, Esquina com Rua C, Setor A, Quadra 04, Lote 04, Centro Político Administrativo, Cep 78049-912, Cuiabá-MT. | Site: www.defensoriapublica.mt.gov.br
            </div>
          </div>`;
    };

    const renderPhoto = (foto: FotoRelatorio, index: number, useSmallContainer: boolean) => {
      const containerClass = useSmallContainer ? 'photo-img-container-large' : 'photo-img-container';
      return `
        <div class="photo-item">
          <div class="${containerClass}">
            <img src="${foto.url}" alt="Foto ${index}" class="photo-img" crossorigin="anonymous" />
          </div>
          <div class="photo-caption">Foto ${index} – ${foto.legenda || 'Sem descrição'}</div>
        </div>
      `;
    };

    // Iniciar primeira página
    currentPage = startNewPage(true);

    fotosRelatorio.forEach((foto) => {
      const maxFotos = isFirstPage ? fotosFirstPage : fotosPerPage;
      
      if (fotosOnCurrentPage === maxFotos) {
        // Fechar página atual e iniciar nova
        currentPage += closePage();
        pages.push(currentPage);
        
        isFirstPage = false;
        currentPage = startNewPage(false);
        fotosOnCurrentPage = 0;
      }

      fotoIndex++;
      currentPage += renderPhoto(foto, fotoIndex, isFirstPage);
      fotosOnCurrentPage++;
    });

    // Fechar última página
    currentPage += closePage();
    pages.push(currentPage);

    return pages.join('');
  };

  const gerarPDF = async () => {
    setGerando(true);
    
    try {
      const dataAtual = format(new Date(dataRelatorio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      const mesAno = format(new Date(dataRelatorio), "MMMM/yyyy", { locale: ptBR });
      const percentualAtual = totais.contrato > 0 ? (totais.executado / totais.contrato) * 100 : 0;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @page { size: A4; margin: 2.5cm 15mm 2.0cm 15mm; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Times New Roman', serif; 
                font-size: 12px; 
                line-height: 1.5;
                color: #000;
              }
              
              /* Page structure - flex container */
              .page { 
                display: flex;
                flex-direction: column;
                min-height: 29.7cm;
                page-break-after: always;
              }
              .page:last-child { page-break-after: avoid; }
              
              /* Content area grows to push footer down */
              .page-content {
                flex: 1;
              }
              
              /* Header */
              .header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #1e40af;
                padding-bottom: 10px;
              }
              .header-title {
                font-size: 14px;
                font-weight: bold;
                color: #1e40af;
                text-transform: uppercase;
              }
              .header-subtitle {
                font-size: 12px;
                color: #1e40af;
                margin-top: 5px;
              }
              
              /* Footer - standardized across all pages */
              .footer {
                margin-top: auto;
                height: 1.2cm;
                max-height: 1.2cm;
                overflow: hidden;
                text-align: center;
                font-size: 9pt;
                line-height: 1.2;
                color: #666;
                border-top: 1px solid #ccc;
                padding: 0;
                margin-bottom: 0;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              
              /* Cover Page */
              .cover-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
              }
              .cover-title {
                font-size: 24px;
                font-weight: bold;
                color: #1e40af;
                margin-bottom: 30px;
                text-transform: uppercase;
              }
              .cover-medicao {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 20px;
              }
              .cover-periodo {
                font-size: 16px;
                margin-bottom: 10px;
              }
              .cover-contrato {
                font-size: 16px;
                margin-bottom: 30px;
              }
              .cover-obra {
                font-size: 18px;
                font-weight: bold;
                max-width: 80%;
                margin-bottom: 50px;
              }
              
              /* Sections */
              .section-title {
                font-size: 14px;
                font-weight: bold;
                margin: 20px 0 10px 0;
              }
              .section-content {
                text-align: justify;
                margin-bottom: 15px;
              }
              
              /* Tables */
              .info-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
              }
              .info-table th, .info-table td {
                border: 1px solid #000;
                padding: 8px 10px;
                text-align: left;
              }
              .info-table th {
                background: #e5e7eb;
                font-weight: bold;
                width: 30%;
              }
              
              .medicao-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-size: 11px;
              }
              .medicao-table th, .medicao-table td {
                border: 1px solid #000;
                padding: 6px 8px;
              }
              .medicao-table th {
                background: #d1d5db;
                font-weight: bold;
                text-align: center;
              }
              .medicao-table td.text-right {
                text-align: right;
              }
              .medicao-table tr.total-row {
                font-weight: bold;
                background: #f3f4f6;
              }
              
              /* Signature */
              .signature-section {
                margin-top: 60px;
                text-align: center;
              }
              .signature-line {
                width: 300px;
                border-top: 1px solid #000;
                margin: 0 auto 5px auto;
              }
              .signature-name {
                font-weight: bold;
              }
              .signature-cargo {
                font-size: 11px;
              }
              
              /* Photo Grid - 1 foto por linha */
              .photo-grid {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 10px;
              }
              .photo-grid-first {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 10px;
              }
              .photo-item {
                text-align: center;
              }
              .photo-img-container {
                width: 100%;
                height: 200px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #ccc;
                background: #f9f9f9;
                overflow: hidden;
              }
              .photo-img-container-large {
                width: 100%;
                height: 170px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #ccc;
                background: #f9f9f9;
                overflow: hidden;
              }
              .photo-img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
              }
              .photo-caption {
                font-size: 10px;
                margin-top: 3px;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            <!-- CAPA -->
            <div class="page">
              <div class="header">
                <div class="header-title">DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</div>
                <div class="header-subtitle">DIRETORIA DE INFRAESTRUTURA FÍSICA</div>
              </div>
              <div class="cover-content">
                <div class="cover-title">RELATÓRIO TÉCNICO DE ACOMPANHAMENTO DE REFORMA PREDIAL</div>
                <div class="cover-medicao">${medicaoAtual}ª MEDIÇÃO</div>
                ${periodoInicio && periodoFim ? `
                <div class="cover-periodo">PERÍODO DE EXECUÇÃO DE ${format(new Date(periodoInicio + 'T12:00:00'), "dd/MM/yyyy")} À ${format(new Date(periodoFim + 'T12:00:00'), "dd/MM/yyyy")}</div>
                ` : ''}
                ${obra.n_contrato ? `<div class="cover-contrato">CONTRATO Nº ${obra.n_contrato}</div>` : ''}
                <div class="cover-obra">${obra.nome.toUpperCase()}</div>
              </div>
              <div class="footer">
                Rua 02, Esquina com Rua C, Setor A, Quadra 04, Lote 04, Centro Político Administrativo, Cep 78049-912, Cuiabá-MT. | Site: www.defensoriapublica.mt.gov.br
              </div>
            </div>

            <!-- PÁGINA 2: INTRODUÇÃO -->
            <div class="page">
              <div class="header">
                <div class="header-title">DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</div>
                <div class="header-subtitle">DIRETORIA DE INFRAESTRUTURA FÍSICA</div>
              </div>
              <div class="page-content">
                <div style="text-align: center; font-weight: bold; margin: 20px 0; font-size: 14px;">
                  ${mesAno.charAt(0).toUpperCase() + mesAno.slice(1)}
                </div>
                <div style="text-align: center; font-weight: bold; margin: 10px 0; font-size: 16px;">
                  Relatório Técnico de Acompanhamento de obra
                </div>
                <div style="text-align: center; font-weight: bold; margin: 10px 0 30px 0;">
                  ${medicaoAtual}ª Medição Mensal
                </div>

                <div class="section-title">1. DO PERÍODO DA MEDIÇÃO:</div>
                <div class="section-content">
                  ${periodoInicio && periodoFim ? `
                  O período da medição refere-se à execução de reforma predial entre os dias ${format(new Date(periodoInicio + 'T12:00:00'), "dd/MM/yyyy")} ao dia ${format(new Date(periodoFim + 'T12:00:00'), "dd/MM/yyyy")}.
                  ` : 'Período não informado.'}
                </div>

                <div class="section-title">2. DO OBJETO:</div>
                <div class="section-content">
                  O objeto da medição é ${obra.nome}${obra.n_contrato ? ` (contrato nº ${obra.n_contrato})` : ''}, situado em ${obra.municipio} - MT.
                </div>

                <div class="section-title">3. OBSERVAÇÕES INICIAIS:</div>
                <table class="info-table">
                  <tr>
                    <th>Objeto</th>
                    <td>${obra.nome}</td>
                  </tr>
                  <tr>
                    <th>Empresa Executora</th>
                    <td>${obra.empresa_responsavel || '-'}</td>
                  </tr>
                  <tr>
                    <th>Valor</th>
                    <td>${formatMoney(totais.contrato)}</td>
                  </tr>
                  <tr>
                    <th>Prazo</th>
                    <td>${obra.tempo_obra ? `${obra.tempo_obra} dias` : '-'}</td>
                  </tr>
                  <tr>
                    <th>Data da medição</th>
                    <td>${format(new Date(dataRelatorio), "dd/MM/yyyy")}</td>
                  </tr>
                </table>
                <div style="text-align: center; font-size: 10px; margin-top: 5px;">Tabela 1 - Informações gerais</div>

                <div class="section-content" style="margin-top: 20px;">
                  O presente relatório tem por objetivo apresentar o resultado da ${medicaoAtual}ª medição. Esta verificação ocorre através da medição analisada no canteiro de obra por servidor desta Instituição.
                </div>
              </div>
              <div class="footer">
                Rua 02, Esquina com Rua C, Setor A, Quadra 04, Lote 04, Centro Político Administrativo, Cep 78049-912, Cuiabá-MT. | Site: www.defensoriapublica.mt.gov.br
              </div>
            </div>

            <!-- PÁGINA 3: MEDIÇÃO -->
            <div class="page">
              <div class="header">
                <div class="header-title">DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</div>
                <div class="header-subtitle">DIRETORIA DE INFRAESTRUTURA FÍSICA</div>
              </div>
              <div class="page-content">
                <div class="section-title">4. DA MEDIÇÃO:</div>
                <div class="section-content">
                  O presente relatório tem por objetivo apresentar a ${medicaoAtual}ª medição do referido contrato. Durante o período indicado foram realizadas várias visitas à obra pelo Fiscal do Contrato para o acompanhamento dos serviços.
                </div>
                <div class="section-content">
                  Todos os serviços executados são apresentados na planilha de medição, que indica as quantidades realizadas de cada item.
                </div>
                <div class="section-content">
                  ${periodoInicio && periodoFim ? `
                  O valor que se chega desta ${medicaoAtual}ª medição, referente ao período de ${format(new Date(periodoInicio + 'T12:00:00'), "dd/MM/yyyy")} a ${format(new Date(periodoFim + 'T12:00:00'), "dd/MM/yyyy")}, é de <strong>${formatMoney(totais.executado)}</strong> (${formatMoneyExtenso(totais.executado)}), que representa <strong>${percentualAtual.toFixed(2)}%</strong> do valor do contrato.
                  ` : `
                  O valor desta ${medicaoAtual}ª medição é de <strong>${formatMoney(totais.executado)}</strong> (${formatMoneyExtenso(totais.executado)}), que representa <strong>${percentualAtual.toFixed(2)}%</strong> do valor do contrato.
                  `}
                </div>

                <div style="font-weight: bold; margin: 20px 0 10px 0;">2. MEDIÇÃO ATUAL</div>
                <table class="medicao-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Descrição</th>
                      <th>Executado</th>
                      <th>Executado Acum.</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${gruposMedicao.map(g => `
                      <tr>
                        <td style="text-align: center;">${g.item}</td>
                        <td>${g.descricao}</td>
                        <td class="text-right">${formatMoney(g.executado)}</td>
                        <td class="text-right">${formatMoney(g.executadoAcum)}</td>
                      </tr>
                    `).join('')}
                    <tr class="total-row">
                      <td colspan="2" style="text-align: right;">VALOR TOTAL:</td>
                      <td class="text-right">${formatMoney(totais.executado)}</td>
                      <td class="text-right">${formatMoney(totais.executadoAcum)}</td>
                    </tr>
                    <tr class="total-row">
                      <td colspan="2" style="text-align: right;">PERCENTUAL:</td>
                      <td class="text-right">${percentualAtual.toFixed(2)}%</td>
                      <td class="text-right">${totais.percentual.toFixed(2)}%</td>
                    </tr>
                  </tbody>
                </table>
                <div style="text-align: center; font-size: 10px; margin-top: 5px;">Tabela 2 – Medição Atual</div>
              </div>
              <div class="footer">
                Rua 02, Esquina com Rua C, Setor A, Quadra 04, Lote 04, Centro Político Administrativo, Cep 78049-912, Cuiabá-MT. | Site: www.defensoriapublica.mt.gov.br
              </div>
            </div>

            <!-- PÁGINA 4: SERVIÇOS EXECUTADOS -->
            <div class="page">
              <div class="header">
                <div class="header-title">DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</div>
                <div class="header-subtitle">DIRETORIA DE INFRAESTRUTURA FÍSICA</div>
              </div>
              <div class="page-content">
                <div class="section-title">5. DOS SERVIÇOS EXECUTADOS:</div>
                <div class="section-content">
                  Durante o período da medição, a empresa responsável pela obra executou serviços dos seguintes grupos:
                </div>
                ${servicosExecutados ? `
                <div class="section-content" style="white-space: pre-wrap;">${servicosExecutados}</div>
                ` : '<div class="section-content" style="color: #666; font-style: italic;">Nenhum serviço descrito.</div>'}
                
                <div class="section-content" style="margin-top: 20px;">
                  Todos os serviços executados, assim como aqueles parcialmente executados, foram verificados pelo fiscal da obra. É válido informar que cada um destes serviços está em conformidade com os projetos apresentados e também de acordo com os padrões e especificações requeridos. O fiscal da obra atestou a qualidade e a precisão dos trabalhos realizados, garantindo que cada etapa do projeto atenda às expectativas de qualidade e segurança. No entanto, o atesto da qualidade durante inspeção realizada pelo fiscal não exime a responsabilidade da empresa na ocorrência de vícios ocultos ou não identificados.
                </div>
              </div>
              <div class="footer">
                Rua 02, Esquina com Rua C, Setor A, Quadra 04, Lote 04, Centro Político Administrativo, Cep 78049-912, Cuiabá-MT. | Site: www.defensoriapublica.mt.gov.br
              </div>
            </div>

            <!-- PÁGINA 5: CONCLUSÃO -->
            <div class="page">
              <div class="header">
                <div class="header-title">DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</div>
                <div class="header-subtitle">DIRETORIA DE INFRAESTRUTURA FÍSICA</div>
              </div>
              <div class="page-content">
                <div class="section-title">6. CONCLUSÃO:</div>
                <div class="section-content">
                  Sendo assim, e conforme as informações expostas na tabela 3, a ${numeroMedicaoExtenso(medicaoAtual)} medição contratual resultou no valor de <strong>${formatMoney(totais.executado)}</strong> (${formatMoneyExtenso(totais.executado)}) a ser pago à empresa ${obra.empresa_responsavel || '[Empresa]'}.
                </div>

                <div style="margin-top: 40px;">
                  ${obra.municipio || 'Cuiabá'}/MT, ${dataAtual}.
                </div>

                ${fiscalNome ? `
                <div class="signature-section">
                  <div class="signature-line"></div>
                  <div class="signature-name">${fiscalNome}</div>
                  <div class="signature-cargo">${fiscalCargo || 'Fiscal do Contrato'}</div>
                </div>
                ` : ''}
              </div>
              <div class="footer">
                Rua 02, Esquina com Rua C, Setor A, Quadra 04, Lote 04, Centro Político Administrativo, Cep 78049-912, Cuiabá-MT. | Site: www.defensoriapublica.mt.gov.br
              </div>
            </div>

            <!-- ANEXO 01: RELATÓRIO FOTOGRÁFICO -->
            ${gerarPaginasAnexo()}
          </body>
        </html>
      `;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.width = '210mm';
      tempDiv.style.background = 'white';
      document.body.appendChild(tempDiv);

      const opt = {
        margin: 0,
        filename: `Relatorio_Medicao_${medicaoAtual}_${obra.nome.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          allowTaint: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait'
        },
        pagebreak: { mode: ['css'] }
      };

      await html2pdf().set(opt).from(tempDiv).save();
      document.body.removeChild(tempDiv);
      toast.success('Relatório gerado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório Técnico de Acompanhamento - {medicaoAtual}ª Medição
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados">Dados do Relatório</TabsTrigger>
            <TabsTrigger value="fotos" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Anexo Fotográfico ({fotosRelatorio.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 mt-4">
            {/* Período */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="periodoInicio">Período Início</Label>
                <Input
                  id="periodoInicio"
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="periodoFim">Período Fim</Label>
                <Input
                  id="periodoFim"
                  type="date"
                  value={periodoFim}
                  onChange={(e) => setPeriodoFim(e.target.value)}
                />
              </div>
            </div>

            {/* Data do Relatório */}
            <div>
              <Label htmlFor="dataRelatorio">Data do Relatório</Label>
              <Input
                id="dataRelatorio"
                type="date"
                value={dataRelatorio}
                onChange={(e) => setDataRelatorio(e.target.value)}
              />
            </div>

            {/* Serviços Executados */}
            <div>
              <Label htmlFor="servicosExecutados">5. DOS SERVIÇOS EXECUTADOS (Preenchimento do Fiscal)</Label>
              <Textarea
                id="servicosExecutados"
                placeholder="Descreva os serviços executados durante o período da medição...&#10;&#10;Exemplo:&#10;1. Execução de pintura de parede e calçada;&#10;2. Demolição de contrapiso e execução de rampa;"
                value={servicosExecutados}
                onChange={(e) => setServicosExecutados(e.target.value)}
                rows={6}
                className="mt-1"
              />
            </div>

            {/* Conclusão - Preview */}
            <div className="bg-muted/50 p-3 rounded-lg border">
              <Label className="text-muted-foreground text-xs">6. CONCLUSÃO (gerada automaticamente)</Label>
              <p className="text-sm mt-1">
                Sendo assim, e conforme as informações expostas na tabela 3, a <strong>{numeroMedicaoExtenso(medicaoAtual)}</strong> medição contratual resultou no valor de <strong>{formatMoney(totais.executado)}</strong> ({formatMoneyExtenso(totais.executado)}) a ser pago à empresa <strong>{obra.empresa_responsavel || '[Empresa]'}</strong>.
              </p>
            </div>

            {/* Fiscal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fiscalNome">Nome do Fiscal</Label>
                <Input
                  id="fiscalNome"
                  placeholder="Ex: João da Silva"
                  value={fiscalNome}
                  onChange={(e) => setFiscalNome(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fiscalCargo">Cargo do Fiscal</Label>
                <Input
                  id="fiscalCargo"
                  placeholder="Ex: Engenheiro Civil"
                  value={fiscalCargo}
                  onChange={(e) => setFiscalCargo(e.target.value)}
                />
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Resumo da Medição</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Valor do Contrato:</div>
                <div className="font-medium">{formatMoney(totais.contrato)}</div>
                <div>Valor desta Medição:</div>
                <div className="font-medium">{formatMoney(totais.executado)}</div>
                <div>Valor Acumulado:</div>
                <div className="font-medium">{formatMoney(totais.executadoAcum)}</div>
                <div>% Executado:</div>
                <div className="font-medium">{totais.percentual.toFixed(2)}%</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fotos" className="space-y-4 mt-4">
            {/* Data da Vistoria */}
            <div>
              <Label htmlFor="dataVistoria">Data da Vistoria (Anexo 01)</Label>
              <Input
                id="dataVistoria"
                type="date"
                value={dataVistoria}
                onChange={(e) => setDataVistoria(e.target.value)}
                placeholder="Se não informada, usa a data do relatório"
              />
            </div>

            {/* Upload de fotos */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Clique para adicionar fotos do computador
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ou arraste e solte aqui
                </p>
              </label>
            </div>

            {/* Fotos do RDO */}
            {periodoInicio && periodoFim && (
              <div className="space-y-3">
                <Label>Fotos do RDO ({periodoInicio} a {periodoFim})</Label>
                {loadingRdoMedias ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="ml-2 text-sm">Carregando fotos do RDO...</span>
                  </div>
                ) : Object.keys(rdoMediasByDate).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma foto encontrada no RDO para este período.
                  </p>
                ) : (
                  <ScrollArea className="h-48 border rounded-lg p-2">
                    {Object.entries(rdoMediasByDate).map(([date, medias]) => {
                      const allSelected = medias.every(m => selectedRdoIds.has(m.id));
                      return (
                        <div key={date} className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={(checked) => selectAllFromDate(date, !!checked)}
                            />
                            <span className="font-medium text-sm">
                              {format(new Date(date + 'T12:00:00'), 'dd/MM/yyyy')} ({medias.length} fotos)
                            </span>
                          </div>
                          <div className="grid grid-cols-6 gap-2 ml-6">
                            {medias.map(media => (
                              <div
                                key={media.id}
                                className={`relative cursor-pointer rounded border-2 overflow-hidden ${
                                  selectedRdoIds.has(media.id) ? 'border-primary' : 'border-transparent'
                                }`}
                                onClick={() => toggleRdoPhoto(media)}
                              >
                                <img
                                  src={media.file_url}
                                  alt=""
                                  className="w-full h-12 object-cover"
                                />
                                {selectedRdoIds.has(media.id) && (
                                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                    <div className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs">
                                      ✓
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </ScrollArea>
                )}
              </div>
            )}

            {/* Lista de fotos selecionadas com legendas */}
            {fotosRelatorio.length > 0 && (
              <div className="space-y-3">
                <Label>Fotos Selecionadas ({fotosRelatorio.length})</Label>
                <ScrollArea className="h-64 border rounded-lg p-2">
                  {fotosRelatorio.map((foto, index) => (
                    <div key={foto.id} className="flex items-start gap-3 mb-3 p-2 bg-muted/50 rounded">
                      <div className="flex flex-col gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => moveFoto(index, 'up')}
                          disabled={index === 0}
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-center font-medium">{index + 1}</span>
                      </div>
                      <img
                        src={foto.url}
                        alt=""
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <div className="flex-1">
                        <Input
                          placeholder="Legenda da foto (ex: Execução de pintura em parede)"
                          value={foto.legenda}
                          onChange={(e) => updateLegenda(foto.id, e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          {foto.fromRdo && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              RDO {foto.data ? format(new Date(foto.data + 'T12:00:00'), 'dd/MM') : ''}
                            </span>
                          )}
                          {!foto.fromRdo && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              Upload
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeFoto(foto.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {fotosRelatorio.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma foto selecionada. O ANEXO 01 não será incluído no relatório.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={gerarPDF} disabled={gerando}>
            {gerando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Gerar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
