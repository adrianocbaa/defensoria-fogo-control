import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';

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
  const [conclusao, setConclusao] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [dataRelatorio, setDataRelatorio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fiscalNome, setFiscalNome] = useState('');
  const [fiscalCargo, setFiscalCargo] = useState('');
  const [gerando, setGerando] = useState(false);

  // Calcular grupos de primeiro nível (MACROs)
  const gruposMedicao = useMemo(() => {
    const medicaoAtualObj = medicoes.find(m => m.id === medicaoAtual);
    if (!medicaoAtualObj) return [];

    // Filtrar apenas itens de primeiro nível (grupos principais)
    const gruposPrincipais = items.filter(item => {
      const parts = item.item.split('.');
      return parts.length === 1 && !isNaN(parseInt(parts[0]));
    });

    return gruposPrincipais.map(grupo => {
      // Encontrar todos os itens filhos deste grupo
      const itemsDoGrupo = items.filter(item => 
        item.item.startsWith(grupo.item + '.') || item.item === grupo.item
      );

      // Calcular valor executado nesta medição
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

    // Itens folha (sem filhos)
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
    // Função simplificada para converter número em extenso
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
              @page { size: A4; margin: 20mm 15mm 20mm 15mm; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Times New Roman', serif; 
                font-size: 12px; 
                line-height: 1.5;
                color: #000;
              }
              .page { 
                page-break-after: always; 
                min-height: 250mm;
                position: relative;
              }
              .page:last-child { page-break-after: avoid; }
              
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
              
              /* Cover Page */
              .cover-page {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 250mm;
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
              
              /* Footer */
              .footer {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 9px;
                color: #666;
                border-top: 1px solid #ccc;
                padding-top: 10px;
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
              
              /* List */
              .services-list {
                margin: 10px 0 10px 20px;
              }
              .services-list li {
                margin-bottom: 5px;
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
              <div class="cover-page">
                <div class="cover-title">RELATÓRIO TÉCNICO DE ACOMPANHAMENTO DE REFORMA PREDIAL</div>
                <div class="cover-medicao">${medicaoAtual}ª MEDIÇÃO</div>
                ${periodoInicio && periodoFim ? `
                <div class="cover-periodo">PERÍODO DE EXECUÇÃO DE ${format(new Date(periodoInicio + 'T12:00:00'), "dd/MM/yyyy")} À ${format(new Date(periodoFim + 'T12:00:00'), "dd/MM/yyyy")}</div>
                ` : ''}
                ${obra.n_contrato ? `<div class="cover-contrato">CONTRATO Nº ${obra.n_contrato}</div>` : ''}
                <div class="cover-obra">${obra.nome.toUpperCase()}</div>
              </div>
              <div class="footer">
                Rua 02, Esquina com Rua C, Setor A, Quadra 04, Lote 04, Centro Político Administrativo, Cep 78049-912, Cuiabá-MT.<br/>
                Site: www.defensoriapublica.mt.gov.br
              </div>
            </div>

            <!-- PÁGINA 2: INTRODUÇÃO -->
            <div class="page">
              <div class="header">
                <div class="header-title">DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</div>
                <div class="header-subtitle">DIRETORIA DE INFRAESTRUTURA FÍSICA</div>
              </div>
              
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

              <div class="footer">
                Rua 02, Esquina com Rua C, Setor A, Quadra 04, Lote 04, Centro Político Administrativo, Cep 78049-912, Cuiabá-MT.<br/>
                Site: www.defensoriapublica.mt.gov.br
              </div>
            </div>

            <!-- PÁGINA 3: MEDIÇÃO -->
            <div class="page">
              <div class="header">
                <div class="header-title">DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</div>
                <div class="header-subtitle">DIRETORIA DE INFRAESTRUTURA FÍSICA</div>
              </div>

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

              <div class="footer">
                Rua 02, Esquina com Rua C, Setor A, Quadra 04, Lote 04, Centro Político Administrativo, Cep 78049-912, Cuiabá-MT.<br/>
                Site: www.defensoriapublica.mt.gov.br
              </div>
            </div>

            <!-- PÁGINA 4: SERVIÇOS EXECUTADOS -->
            <div class="page">
              <div class="header">
                <div class="header-title">DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</div>
                <div class="header-subtitle">DIRETORIA DE INFRAESTRUTURA FÍSICA</div>
              </div>

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

              <div class="footer">
                Rua 02, Esquina com Rua C, Setor A, Quadra 04, Lote 04, Centro Político Administrativo, Cep 78049-912, Cuiabá-MT.<br/>
                Site: www.defensoriapublica.mt.gov.br
              </div>
            </div>

            <!-- PÁGINA 5: CONCLUSÃO -->
            <div class="page">
              <div class="header">
                <div class="header-title">DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO</div>
                <div class="header-subtitle">DIRETORIA DE INFRAESTRUTURA FÍSICA</div>
              </div>

              <div class="section-title">6. CONCLUSÃO:</div>
              ${conclusao ? `
              <div class="section-content" style="white-space: pre-wrap;">${conclusao}</div>
              ` : `
              <div class="section-content">
                Sendo assim, e conforme as informações expostas, a ${medicaoAtual}ª medição contratual resultou no valor de <strong>${formatMoney(totais.executado)}</strong> (${formatMoneyExtenso(totais.executado)}) a ser pago à empresa ${obra.empresa_responsavel || '[Empresa]'}.
              </div>
              `}

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

              <div class="footer">
                Rua 02, Esquina com Rua C, Setor A, Quadra 04, Lote 04, Centro Político Administrativo, Cep 78049-912, Cuiabá-MT.<br/>
                Site: www.defensoriapublica.mt.gov.br
              </div>
            </div>
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
          letterRendering: true
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório Técnico de Acompanhamento - {medicaoAtual}ª Medição
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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

          {/* Conclusão */}
          <div>
            <Label htmlFor="conclusao">6. CONCLUSÃO (Opcional - texto personalizado)</Label>
            <Textarea
              id="conclusao"
              placeholder="Deixe em branco para usar o texto padrão ou digite uma conclusão personalizada..."
              value={conclusao}
              onChange={(e) => setConclusao(e.target.value)}
              rows={4}
              className="mt-1"
            />
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
        </div>

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
