import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun, HeadingLevel, PageBreak, Header, Footer, convertInchesToTwip } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  aditivo_prazo?: number;
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

interface TotaisData {
  contrato: number;
  executado: number;
  executadoAcum: number;
  percentual: number;
  valorInicial: number;
  totalAditivo: number;
  aditivosPorSessao: { numero: number; valor: number }[];
}

interface ExportWordParams {
  obra: Obra;
  medicaoAtual: number;
  totais: TotaisData;
  gruposParaRelatorio: GrupoMedicao[];
  servicosExecutados: string;
  periodoInicio: string;
  periodoFim: string;
  dataRelatorio: string;
  fiscalNome: string;
  fiscalCargo: string;
  fotosRelatorio: FotoRelatorio[];
  dataVistoria: string;
}

// Formatação de moeda
const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Número por extenso
const formatMoneyExtenso = (value: number): string => {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  
  const partes = value.toFixed(2).split('.');
  const reais = parseInt(partes[0]);
  const centavos = parseInt(partes[1]);
  
  const numeroParaExtenso = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    if (n < 10) return unidades[n];
    if (n < 20) return especiais[n - 10];
    if (n < 100) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      return dezenas[d] + (u > 0 ? ' e ' + unidades[u] : '');
    }
    if (n < 1000) {
      const c = Math.floor(n / 100);
      const resto = n % 100;
      return centenas[c] + (resto > 0 ? ' e ' + numeroParaExtenso(resto) : '');
    }
    if (n < 1000000) {
      const milhar = Math.floor(n / 1000);
      const resto = n % 1000;
      const milharTexto = milhar === 1 ? 'mil' : numeroParaExtenso(milhar) + ' mil';
      return milharTexto + (resto > 0 ? (resto < 100 ? ' e ' : ' ') + numeroParaExtenso(resto) : '');
    }
    if (n < 1000000000) {
      const milhao = Math.floor(n / 1000000);
      const resto = n % 1000000;
      const milhaoTexto = milhao === 1 ? 'um milhão' : numeroParaExtenso(milhao) + ' milhões';
      return milhaoTexto + (resto > 0 ? (resto < 1000 ? ' e ' : ' ') + numeroParaExtenso(resto) : '');
    }
    return n.toString();
  };
  
  let extenso = '';
  if (reais > 0) {
    extenso = numeroParaExtenso(reais) + (reais === 1 ? ' real' : ' reais');
  }
  if (centavos > 0) {
    if (reais > 0) extenso += ' e ';
    extenso += numeroParaExtenso(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  }
  if (reais === 0 && centavos === 0) {
    extenso = 'zero reais';
  }
  
  return extenso;
};

// Número ordinal por extenso
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

// Função para carregar imagem como ArrayBuffer
const loadImageAsArrayBuffer = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Erro ao carregar imagem:', error);
    return null;
  }
};

export async function exportarWord(params: ExportWordParams): Promise<void> {
  const {
    obra,
    medicaoAtual,
    totais,
    gruposParaRelatorio,
    servicosExecutados,
    periodoInicio,
    periodoFim,
    dataRelatorio,
    fiscalNome,
    fiscalCargo,
    fotosRelatorio,
    dataVistoria
  } = params;

  const mesAno = format(new Date(dataRelatorio), "MMMM/yyyy", { locale: ptBR });
  const percentualAtual = totais.contrato > 0 ? (totais.executado / totais.contrato) * 100 : 0;
  const dataVistoriaFormatada = dataVistoria 
    ? format(new Date(dataVistoria + 'T12:00:00'), 'dd/MM/yyyy')
    : format(new Date(dataRelatorio), 'dd/MM/yyyy');

  // Carregar logo
  let logoImage: ArrayBuffer | null = null;
  try {
    logoImage = await loadImageAsArrayBuffer('/images/logo-dpe-mt.png');
  } catch (error) {
    console.error('Erro ao carregar logo:', error);
  }

  // Criar cabeçalho padrão
  const createHeader = () => {
    const headerChildren: Paragraph[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "DIRETORIA DE INFRAESTRUTURA FÍSICA",
            bold: true,
            size: 20, // 10pt
            font: "Arial",
          }),
        ],
      }),
    ];

    return new Header({
      children: headerChildren,
    });
  };

  // PÁGINA 1: CAPA
  const capaParagraphs: Paragraph[] = [
    new Paragraph({ text: "", spacing: { after: 2000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO",
          bold: true,
          size: 28,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: "DIRETORIA DE INFRAESTRUTURA FÍSICA",
          bold: true,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 3000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "RELATÓRIO TÉCNICO DE ACOMPANHAMENTO DE REFORMA PREDIAL",
          bold: true,
          size: 32,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: `${medicaoAtual}ª MEDIÇÃO`,
          bold: true,
          size: 28,
          font: "Arial",
        }),
      ],
    }),
  ];

  if (periodoInicio && periodoFim) {
    capaParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [
          new TextRun({
            text: `PERÍODO DE EXECUÇÃO DE ${format(new Date(periodoInicio + 'T12:00:00'), "dd/MM/yyyy")} À ${format(new Date(periodoFim + 'T12:00:00'), "dd/MM/yyyy")}`,
            size: 22,
            font: "Arial",
          }),
        ],
      })
    );
  }

  if (obra.n_contrato) {
    capaParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [
          new TextRun({
            text: `CONTRATO Nº ${obra.n_contrato}`,
            size: 22,
            font: "Arial",
          }),
        ],
      })
    );
  }

  capaParagraphs.push(
    new Paragraph({ text: "", spacing: { after: 2000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: obra.nome.toUpperCase(),
          bold: true,
          size: 36,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // PÁGINA 2: INTRODUÇÃO
  const introParagraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: mesAno.charAt(0).toUpperCase() + mesAno.slice(1),
          bold: true,
          size: 28,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Relatório Técnico de Acompanhamento de obra",
          bold: true,
          size: 32,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: `${medicaoAtual}ª Medição Mensal`,
          bold: true,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "1. DO PERÍODO DA MEDIÇÃO:",
          bold: true,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 400 },
      indent: { firstLine: convertInchesToTwip(0.5) },
      children: [
        new TextRun({
          text: periodoInicio && periodoFim 
            ? `O período da medição refere-se à execução de reforma predial entre os dias ${format(new Date(periodoInicio + 'T12:00:00'), "dd/MM/yyyy")} ao dia ${format(new Date(periodoFim + 'T12:00:00'), "dd/MM/yyyy")}.`
            : 'Período não informado.',
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "2. DO OBJETO:",
          bold: true,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 400 },
      indent: { firstLine: convertInchesToTwip(0.5) },
      children: [
        new TextRun({
          text: `O objeto da medição é ${obra.nome}${obra.n_contrato ? ` (contrato nº ${obra.n_contrato})` : ''}, situado em ${obra.municipio} - MT.`,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "3. OBSERVAÇÕES INICIAIS:",
          bold: true,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
  ];

  // Tabela de informações gerais
  const infoRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: { fill: "F2F2F2" },
          children: [new Paragraph({ children: [new TextRun({ text: "Objeto", bold: true, size: 22, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 65, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: obra.nome, size: 22, font: "Arial" })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: "F2F2F2" },
          children: [new Paragraph({ children: [new TextRun({ text: "Empresa Executora", bold: true, size: 22, font: "Arial" })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: obra.empresa_responsavel || '-', size: 22, font: "Arial" })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: "F2F2F2" },
          children: [new Paragraph({ children: [new TextRun({ text: "Valor inicial", bold: true, size: 22, font: "Arial" })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `${formatMoney(totais.valorInicial)} (${formatMoneyExtenso(totais.valorInicial)})`, size: 22, font: "Arial" })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: "F2F2F2" },
          children: [new Paragraph({ children: [new TextRun({ text: "Prazo inicial", bold: true, size: 22, font: "Arial" })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: obra.tempo_obra ? `${obra.tempo_obra} dias` : '-', size: 22, font: "Arial" })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: "F2F2F2" },
          children: [new Paragraph({ children: [new TextRun({ text: "Data da medição", bold: true, size: 22, font: "Arial" })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: format(new Date(dataRelatorio), "dd/MM/yyyy"), size: 22, font: "Arial" })] })],
        }),
      ],
    }),
  ];

  // Adicionar linhas de aditivos
  const numerosOrdinais: { [key: number]: string } = {
    1: '1º', 2: '2º', 3: '3º', 4: '4º', 5: '5º',
    6: '6º', 7: '7º', 8: '8º', 9: '9º', 10: '10º'
  };
  let valorAcumulado = totais.valorInicial;
  
  totais.aditivosPorSessao.forEach((aditivo) => {
    valorAcumulado += aditivo.valor;
    const ordinal = numerosOrdinais[aditivo.numero] || `${aditivo.numero}º`;
    
    infoRows.push(
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "F2F2F2" },
            children: [new Paragraph({ children: [new TextRun({ text: `${ordinal} Aditivo de valor`, bold: true, size: 22, font: "Arial" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${formatMoney(aditivo.valor)} (${formatMoneyExtenso(aditivo.valor)})`, size: 22, font: "Arial" })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "F2F2F2" },
            children: [new Paragraph({ children: [new TextRun({ text: `Valor do contrato após ${ordinal} Aditivo`, bold: true, size: 22, font: "Arial" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${formatMoney(valorAcumulado)} (${formatMoneyExtenso(valorAcumulado)})`, size: 22, font: "Arial" })] })],
          }),
        ],
      })
    );
  });

  if (obra.aditivo_prazo && obra.aditivo_prazo > 0) {
    infoRows.push(
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "F2F2F2" },
            children: [new Paragraph({ children: [new TextRun({ text: "1º Aditivo de prazo", bold: true, size: 22, font: "Arial" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${obra.aditivo_prazo} dias`, size: 22, font: "Arial" })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "F2F2F2" },
            children: [new Paragraph({ children: [new TextRun({ text: "Prazo final após 1º Aditivo de prazo", bold: true, size: 22, font: "Arial" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${(obra.tempo_obra || 0) + obra.aditivo_prazo} dias`, size: 22, font: "Arial" })] })],
          }),
        ],
      })
    );
  }

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    rows: infoRows,
  });

  introParagraphs.push(
    infoTable as unknown as Paragraph,
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 400 },
      children: [
        new TextRun({
          text: "Tabela 1 - Informações gerais",
          size: 20,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 400 },
      indent: { firstLine: convertInchesToTwip(0.5) },
      children: [
        new TextRun({
          text: `O presente relatório tem por objetivo apresentar o resultado da ${medicaoAtual}ª medição. Esta verificação ocorre através da medição analisada no canteiro de obra por servidor desta Instituição.`,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // PÁGINA 3: MEDIÇÃO
  const medicaoParagraphs: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "4. DA MEDIÇÃO:",
          bold: true,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200 },
      indent: { firstLine: convertInchesToTwip(0.5) },
      children: [
        new TextRun({
          text: `O presente relatório tem por objetivo apresentar a ${medicaoAtual}ª medição do referido contrato. Como forma de referência, foram realizadas visitas técnicas à obra pelo Fiscal do Contrato, a fim de verificar a execução dos serviços.`,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200 },
      indent: { firstLine: convertInchesToTwip(0.5) },
      children: [
        new TextRun({
          text: `Todos os serviços executados são apresentados na planilha de medição, constando as quantidades realizadas de cada item.`,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 400 },
      indent: { firstLine: convertInchesToTwip(0.5) },
      children: [
        new TextRun({
          text: `O valor que se chega desta ${medicaoAtual}ª medição, referente ao período de ${periodoInicio ? format(new Date(periodoInicio + 'T12:00:00'), "dd/MM/yyyy") : '-'} a ${periodoFim ? format(new Date(periodoFim + 'T12:00:00'), "dd/MM/yyyy") : '-'}, é de `,
          size: 24,
          font: "Arial",
        }),
        new TextRun({
          text: formatMoney(totais.executado),
          bold: true,
          size: 24,
          font: "Arial",
        }),
        new TextRun({
          text: ` (${formatMoneyExtenso(totais.executado)}), que representa ${percentualAtual.toFixed(2)}% do valor do contrato.`,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "MEDIÇÃO ATUAL",
          bold: true,
          size: 28,
          font: "Arial",
        }),
      ],
    }),
  ];

  // Tabela de medição
  const medicaoHeaderRow = new TableRow({
    children: [
      new TableCell({
        shading: { fill: "F2F2F2" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ITEM", bold: true, size: 20, font: "Arial" })] })],
      }),
      new TableCell({
        shading: { fill: "F2F2F2" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MACRO", bold: true, size: 20, font: "Arial" })] })],
      }),
      new TableCell({
        shading: { fill: "F2F2F2" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "EXECUTADO (R$)", bold: true, size: 20, font: "Arial" })] })],
      }),
      new TableCell({
        shading: { fill: "F2F2F2" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "EXECUTADO ACUM. (R$)", bold: true, size: 20, font: "Arial" })] })],
      }),
    ],
  });

  const medicaoDataRows = gruposParaRelatorio.map(grupo => 
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: grupo.item, size: 20, font: "Arial" })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: grupo.descricao, size: 20, font: "Arial" })] })],
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatMoney(grupo.executado), size: 20, font: "Arial" })] })],
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatMoney(grupo.executadoAcum), size: 20, font: "Arial" })] })],
        }),
      ],
    })
  );

  const medicaoTotalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        shading: { fill: "D4EDDA" },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "VALOR TOTAL:", bold: true, size: 20, font: "Arial" })] })],
      }),
      new TableCell({
        shading: { fill: "D4EDDA" },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatMoney(totais.executado), bold: true, size: 20, font: "Arial" })] })],
      }),
      new TableCell({
        shading: { fill: "D4EDDA" },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatMoney(totais.executadoAcum), bold: true, size: 20, font: "Arial" })] })],
      }),
    ],
  });

  const medicaoPercentRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        shading: { fill: "D4EDDA" },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "PERCENTUAL:", bold: true, size: 20, font: "Arial" })] })],
      }),
      new TableCell({
        shading: { fill: "D4EDDA" },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${percentualAtual.toFixed(2)}%`, bold: true, size: 20, font: "Arial" })] })],
      }),
      new TableCell({
        shading: { fill: "D4EDDA" },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${totais.percentual.toFixed(2)}%`, bold: true, size: 20, font: "Arial" })] })],
      }),
    ],
  });

  const medicaoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
    rows: [medicaoHeaderRow, ...medicaoDataRows, medicaoTotalRow, medicaoPercentRow],
  });

  medicaoParagraphs.push(
    medicaoTable as unknown as Paragraph,
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 400 },
      children: [
        new TextRun({
          text: "Tabela 2 – Medição Atual",
          size: 20,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // PÁGINA 4: SERVIÇOS EXECUTADOS
  const servicosParagraphs: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "5. DOS SERVIÇOS EXECUTADOS:",
          bold: true,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200 },
      indent: { firstLine: convertInchesToTwip(0.5) },
      children: [
        new TextRun({
          text: "Durante o período da medição, a empresa responsável pela obra executou serviços dos seguintes grupos:",
          size: 24,
          font: "Arial",
        }),
      ],
    }),
  ];

  // Adicionar parágrafos dos serviços
  if (servicosExecutados) {
    servicosExecutados.split(/\n\s*\n/).forEach(paragraph => {
      servicosParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 },
          indent: { firstLine: convertInchesToTwip(0.5) },
          children: [
            new TextRun({
              text: paragraph.trim(),
              size: 24,
              font: "Arial",
            }),
          ],
        })
      );
    });
  } else {
    servicosParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 },
        indent: { firstLine: convertInchesToTwip(0.5) },
        children: [
          new TextRun({
            text: "Nenhum serviço descrito.",
            italics: true,
            size: 24,
            font: "Arial",
            color: "666666",
          }),
        ],
      })
    );
  }

  servicosParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 400, after: 200 },
      indent: { firstLine: convertInchesToTwip(0.5) },
      children: [
        new TextRun({
          text: "Todos os serviços executados, assim como aqueles parcialmente executados, foram verificados pelo fiscal da obra. É válido informar que cada um destes serviços está em conformidade com os projetos apresentados e também de acordo com os padrões e especificações requeridos. O fiscal da obra atestou a qualidade e a precisão dos trabalhos realizados, garantindo que cada etapa do projeto atenda às expectativas de qualidade e segurança. No entanto, o atesto da qualidade durante inspeção realizada pelo fiscal não exime a responsabilidade da empresa na ocorrência de vícios ocultos ou não identificados.",
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // PÁGINA 5: CONCLUSÃO
  const conclusaoParagraphs: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "6. CONCLUSÃO:",
          bold: true,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 400 },
      indent: { firstLine: convertInchesToTwip(0.5) },
      children: [
        new TextRun({
          text: `Sendo assim, e conforme as informações expostas na tabela 2, a ${numeroMedicaoExtenso(medicaoAtual)} medição contratual resultou no valor de `,
          size: 24,
          font: "Arial",
        }),
        new TextRun({
          text: formatMoney(totais.executado),
          bold: true,
          size: 24,
          font: "Arial",
        }),
        new TextRun({
          text: ` (${formatMoneyExtenso(totais.executado)}) a ser pago à empresa ${obra.empresa_responsavel || '[Empresa]'}.`,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 800 },
      children: [
        new TextRun({
          text: `${obra.municipio || 'Cuiabá'}/MT, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.`,
          size: 24,
          font: "Arial",
        }),
      ],
    }),
  ];

  if (fiscalNome) {
    conclusaoParagraphs.push(
      new Paragraph({ text: "", spacing: { after: 1200 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "________________________________",
            size: 24,
            font: "Arial",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: fiscalNome,
            bold: true,
            size: 24,
            font: "Arial",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: fiscalCargo || 'Fiscal do Contrato',
            size: 22,
            font: "Arial",
          }),
        ],
      })
    );
  }

  // ANEXO: FOTOS
  const anexoParagraphs: Paragraph[] = [];
  if (fotosRelatorio.length > 0) {
    anexoParagraphs.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: "ANEXO 01",
            bold: true,
            size: 28,
            font: "Arial",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100 },
        children: [
          new TextRun({ text: "Obra: ", bold: true, size: 22, font: "Arial" }),
          new TextRun({ text: obra.nome, size: 22, font: "Arial" }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100 },
        children: [
          new TextRun({ text: "Local: ", bold: true, size: 22, font: "Arial" }),
          new TextRun({ text: `${obra.municipio} - MT`, size: 22, font: "Arial" }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100 },
        children: [
          new TextRun({ text: "Data da vistoria: ", bold: true, size: 22, font: "Arial" }),
          new TextRun({ text: dataVistoriaFormatada, size: 22, font: "Arial" }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 400 },
        children: [
          new TextRun({ text: "Objeto: ", bold: true, size: 22, font: "Arial" }),
          new TextRun({ 
            text: `As fotos abaixo elencadas apresentam o relatório fotográfico da vistoria realizada pelo ${fiscalCargo || 'Fiscal'} ${fiscalNome || '[Nome do Fiscal]'}. O relatório fotográfico tem como propósito a fiscalização dos serviços executados pela empresa ${obra.empresa_responsavel || '[Empresa]'} ${periodoInicio && periodoFim ? `no período de ${format(new Date(periodoInicio + 'T12:00:00'), 'dd/MM/yyyy')} até ${format(new Date(periodoFim + 'T12:00:00'), 'dd/MM/yyyy')}` : ''}, dando como finalizada a ${medicaoAtual}ª Medição.`, 
            size: 22, 
            font: "Arial" 
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: "RELATÓRIO FOTOGRÁFICO",
            bold: true,
            size: 28,
            font: "Arial",
          }),
        ],
      })
    );

    // Adicionar fotos como texto (sem imagem real por limitação)
    fotosRelatorio.forEach((foto, index) => {
      anexoParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: `[Foto ${index + 1}]`,
              size: 22,
              font: "Arial",
              color: "666666",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [
            new TextRun({
              text: `Foto ${index + 1} – ${foto.legenda || 'Sem descrição'}`,
              size: 20,
              font: "Arial",
            }),
          ],
        })
      );
    });
  }

  // Criar documento
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1.18), // 3cm
            right: convertInchesToTwip(0.79), // 2cm
            bottom: convertInchesToTwip(0.79), // 2cm
            left: convertInchesToTwip(1.18), // 3cm
          },
        },
      },
      headers: {
        default: createHeader(),
      },
      children: [
        ...capaParagraphs,
        ...introParagraphs,
        ...medicaoParagraphs,
        ...servicosParagraphs,
        ...conclusaoParagraphs,
        ...anexoParagraphs,
      ],
    }],
  });

  // Gerar e baixar
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Relatorio_Medicao_${medicaoAtual}_${obra.nome.replace(/[^a-z0-9]/gi, '_')}.docx`);
}
