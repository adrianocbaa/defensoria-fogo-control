import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageOrientation,
  Header,
  Footer,
  ImageRun,
} from 'docx';
import type { EncerramentoData, EncerramentoTipo } from './types';
import logoAsset from '@/assets/dpmt-logo.png.asset.json';


const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// dd/mm/yyyy
const fmtDate = (d?: string | null) => {
  if (!d) return '____/____/______';
  const [y, m, day] = d.split('-').map(Number);
  return `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

// "1º de janeiro de 2026" (usa 1º para o primeiro dia)
const fmtDateExtenso = (d?: string | null) => {
  if (!d) return '____ de __________ de ______';
  const [y, m, day] = d.split('-').map(Number);
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  const dia = day === 1 ? '1º' : String(day);
  return `${dia} de ${meses[m - 1]} de ${y}`;
};

// "13 dias de fevereiro de 2025" (para "Aos ... recebemos")
const fmtDiasExtenso = (d?: string | null) => {
  if (!d) return '____ dias de __________ de ______';
  const [y, m, day] = d.split('-').map(Number);
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  const dia = day === 1 ? '1º' : `${day} dias`;
  return `${dia} de ${meses[m - 1]} de ${y}`;
};

const hoje = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Parágrafo padrão justificado
function P(
  runs: (string | TextRun)[],
  opts: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacing?: number; indent?: boolean } = {}
) {
  const children = runs.map((r) =>
    typeof r === 'string' ? new TextRun({ text: r, size: 24 }) : r
  );
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: opts.spacing ?? 200, line: 340 },
    indent: opts.indent ? { firstLine: 720 } : undefined,
    children,
  });
}

function titulo(text: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 360 },
    children: [new TextRun({ text, bold: true, size: 28 })],
  });
}

function subtitulo(text: string) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 120, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24 })],
  });
}

function dataEmissaoTopo(data: EncerramentoData) {
  const cidade = data.institucional?.cidade || 'Cuiabá/MT';
  const dataEmissao = fmtDateExtenso(hoje());
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 360 },
    children: [new TextRun({ text: `${cidade}, ${dataEmissao}.`, size: 24 })],
  });
}

function cabecalhoInstitucional(data: EncerramentoData) {
  const inst = data.institucional;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: (inst?.razao_social || 'DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO').toUpperCase(),
          bold: true,
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'Diretoria de Infraestrutura Física', italics: true, size: 20 }),
      ],
    }),
    ...(inst?.endereco
      ? [new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: inst.endereco, size: 18 })],
        })]
      : []),
    ...(inst?.cnpj
      ? [new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({ text: `CNPJ: ${inst.cnpj}`, size: 18 })],
        })]
      : [new Paragraph({ spacing: { after: 240 }, children: [] })]),
  ];
}

function assinaturaFiscal(data: EncerramentoData) {
  const { obra, empresa } = data;
  // Fiscal: prioriza o representante legal do cadastro do contrato → aqui não temos fiscal ainda,
  // então mantemos flexível usando os campos disponíveis.
  const fiscalNome = (obra as any).fiscal_nome || '________________________________';
  const fiscalCargo = (obra as any).fiscal_cargo || 'Fiscal do Contrato';
  const crea = (obra as any).fiscal_conselho || '';
  return [
    new Paragraph({ spacing: { before: 560, after: 0 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: '_______________________________________________', size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: fiscalNome, bold: true, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${fiscalCargo} nº ${obra.n_contrato || '____/____-DP-MT'}`, italics: true, size: 22 })],
    }),
    ...(crea
      ? [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: crea, italics: true, size: 22 })],
        })]
      : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: 'Defensoria Pública do Estado de Mato Grosso', italics: true, size: 22 })],
    }),
  ];
}

function assinaturaEmpresa(data: EncerramentoData) {
  const { empresa } = data;
  return [
    new Paragraph({ spacing: { before: 320, after: 0 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: '_______________________________________________', size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: empresa?.representante_legal_nome || '________________________________', bold: true, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: empresa?.representante_legal_cargo || 'Responsável Legal', size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: (empresa?.razao_social || '').toUpperCase(), size: 22 })],
    }),
  ];
}

// ============= TRP =============
function buildTRP(data: EncerramentoData) {
  const { obra, empresa } = data;
  const unidade = obra.nome;
  const prazoObservacao = (obra as any).prazo_observacao_dias ?? 90;
  return [
    ...cabecalhoInstitucional(data),
    dataEmissaoTopo(data),
    titulo('TERMO DE RECEBIMENTO PROVISÓRIO'),
    P([
      new TextRun({ text: `Aos ${fmtDiasExtenso(obra.data_recebimento_provisorio)} `, size: 24 }),
      new TextRun({ text: 'recebemos, em caráter provisório, os serviços de adequação predial realizados no ', size: 24 }),
      new TextRun({ text: unidade, bold: true, size: 24 }),
      new TextRun({ text: ', objeto do Contrato nº ', size: 24 }),
      new TextRun({ text: obra.n_contrato || '____/____-DP-MT', bold: true, size: 24 }),
      new TextRun({ text: ', firmado entre a ', size: 24 }),
      new TextRun({ text: (empresa?.razao_social || '____________________').toUpperCase(), bold: true, size: 24 }),
      new TextRun({ text: `, inscrita no CNPJ sob o nº ${empresa?.cnpj || '__.___.___/____-__'}, e a `, size: 24 }),
      new TextRun({ text: 'DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO', bold: true, size: 24 }),
      new TextRun({ text: '.', size: 24 }),
    ], { indent: true }),
    subtitulo('Serviços em conformidade:'),
    P([
      'Após constatar que a obra supracitada foi executada de acordo com as condições contratuais, ' +
      'normas técnicas em vigor e em obediência aos projetos, especificações técnicas e demais elementos ' +
      'fornecidos pela contratante, procede-se ao presente recebimento.',
    ], { indent: true }),
    P([
      `Após o decurso do prazo de observação de ${prazoObservacao} (${prazoObservacao === 90 ? 'noventa' : prazoObservacao}) dias, ` +
      'e permanecendo as condições expostas no presente termo, será expedido o TERMO DE RECEBIMENTO DEFINITIVO.',
    ], { indent: true, spacing: 400 }),
    ...assinaturaFiscal(data),
    ...assinaturaEmpresa(data),
  ];
}

// ============= TRD =============
function buildTRD(data: EncerramentoData) {
  const { obra, empresa } = data;
  const unidade = obra.nome;
  const condicaoImovel = (obra as any).condicao_imovel as string | undefined; // 'proprio' | 'locado' | 'cedido' | 'outro'
  const textoImovel =
    condicaoImovel === 'cedido'
      ? 'de imóvel cedido para atender às necessidades do'
      : condicaoImovel === 'locado'
      ? 'de imóvel locado para atender às necessidades do'
      : condicaoImovel === 'proprio'
      ? 'de imóvel próprio para atender às necessidades do'
      : 'para atender às necessidades do';

  return [
    ...cabecalhoInstitucional(data),
    dataEmissaoTopo(data),
    titulo('TERMO DE RECEBIMENTO DEFINITIVO'),
    P([
      new TextRun({ text: `Aos ${fmtDiasExtenso(obra.data_recebimento_definitivo)} `, size: 24 }),
      new TextRun({ text: `recebemos, em caráter definitivo, os serviços de adequação predial ${textoImovel} `, size: 24 }),
      new TextRun({ text: unidade, bold: true, size: 24 }),
      new TextRun({ text: ' da Defensoria Pública do Estado de Mato Grosso, objeto do Contrato nº ', size: 24 }),
      new TextRun({ text: obra.n_contrato || '____/____-DP-MT', bold: true, size: 24 }),
      new TextRun({ text: ', firmado entre a ', size: 24 }),
      new TextRun({ text: (empresa?.razao_social || '____________________').toUpperCase(), bold: true, size: 24 }),
      new TextRun({ text: ' e a ', size: 24 }),
      new TextRun({ text: 'DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO', bold: true, size: 24 }),
      new TextRun({ text: '.', size: 24 }),
    ], { indent: true }),
    P([
      'Após constatar que a obra acima qualificada foi executada de acordo com as condições contratuais, ' +
      'normas técnicas em vigor e em obediência aos projetos, especificações técnicas e demais elementos ' +
      'fornecidos pela contratante, e estando concluída, expede-se o presente ',
      new TextRun({ text: 'TERMO DE RECEBIMENTO DEFINITIVO', bold: true, size: 24 }),
      ', permanecendo íntegras as responsabilidades legais e contratuais remanescentes da contratada, ' +
      'notadamente a responsabilidade civil pela solidez e segurança da obra e a responsabilidade ' +
      'ético-profissional, bem como as garantias contratuais aplicáveis, nos termos do art. 618 do ' +
      'Código Civil e, quando aplicável, do art. 140, §2º, da Lei nº 14.133/2021.',
    ], { indent: true, spacing: 400 }),
    ...assinaturaFiscal(data),
    ...assinaturaEmpresa(data),
  ];
}

// ============= ACT =============
function buildACT(data: EncerramentoData) {
  const { obra, empresa, dpg, institucional } = data;
  const conselho = [empresa?.conselho_tipo, empresa?.conselho_numero].filter(Boolean).join(' Nº ');
  const conselhoUF = empresa?.conselho_uf ? `/${empresa.conselho_uf}` : '';
  const enderecoEmpresa = [
    empresa?.endereco,
    empresa?.numero ? `nº ${empresa.numero}` : '',
    empresa?.bairro,
    empresa?.cidade && empresa?.uf ? `${empresa.cidade} - ${empresa.uf}` : empresa?.cidade,
    empresa?.cep ? `CEP ${empresa.cep}` : '',
  ].filter(Boolean).join(', ');

  return [
    ...cabecalhoInstitucional(data),
    dataEmissaoTopo(data),
    titulo('ATESTADO DE CAPACIDADE TÉCNICA'),
    P([
      new TextRun({ text: 'A ', size: 24 }),
      new TextRun({ text: (institucional?.razao_social || 'DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO').toUpperCase(), bold: true, size: 24 }),
      new TextRun({ text: ', pessoa jurídica de direito público, com sede em ', size: 24 }),
      new TextRun({ text: institucional?.endereco || '____________________', size: 24 }),
      new TextRun({ text: `, inscrita no CNPJ sob o nº ${institucional?.cnpj || '__.___.___/____-__'}, neste ato representada pela `, size: 24 }),
      new TextRun({ text: dpg?.texto_cargo_documento || dpg?.cargo || 'Defensora Pública-Geral', bold: true, size: 24 }),
      new TextRun({ text: ', ', size: 24 }),
      new TextRun({ text: dpg?.nome || '____________________', bold: true, size: 24 }),
      new TextRun({ text: `, inscrita no CPF sob o nº ${dpg?.cpf || '___.___.___-__'}, `, size: 24 }),
      new TextRun({ text: 'ATESTA', bold: true, size: 24 }),
      new TextRun({ text: ', pelo presente, que a empresa ', size: 24 }),
      new TextRun({ text: (empresa?.razao_social || '____________________').toUpperCase(), bold: true, size: 24 }),
      new TextRun({ text: `, inscrita no CNPJ sob o nº ${empresa?.cnpj || '__.___.___/____-__'}, com sede em ${enderecoEmpresa || '____________________'}, neste ato representada por seu responsável legal, `, size: 24 }),
      new TextRun({ text: empresa?.representante_legal_nome || '____________________', bold: true, size: 24 }),
      new TextRun({ text: `, inscrito no CPF sob o nº ${empresa?.representante_legal_cpf || '___.___.___-__'}, tendo como responsável técnico `, size: 24 }),
      new TextRun({ text: empresa?.responsavel_tecnico_nome || '____________________', bold: true, size: 24 }),
      new TextRun({ text: `, ${empresa?.responsavel_tecnico_profissao || 'Engenheiro(a) Civil'}, ${conselho || 'CREA/CAU Nº ____________'}${conselhoUF}, `, size: 24 }),
      new TextRun({ text: 'EXECUTOU', bold: true, size: 24 }),
      new TextRun({ text: ', dentro das normas e recomendações técnicas, os serviços descritos neste atestado.', size: 24 }),
    ], { indent: true }),

    subtitulo('Dados do objeto executado'),
    P([new TextRun({ text: 'Obra: ', bold: true, size: 24 }), new TextRun({ text: obra.nome, size: 24 })]),
    P([new TextRun({ text: 'Endereço: ', bold: true, size: 24 }), new TextRun({ text: obra.endereco_completo || obra.municipio || '—', size: 24 })]),
    P([new TextRun({ text: 'Contrato: ', bold: true, size: 24 }), new TextRun({ text: `Nº ${obra.n_contrato || '—'}`, size: 24 })]),
    P([new TextRun({ text: 'Valor inicial do contrato: ', bold: true, size: 24 }), new TextRun({ text: `${BRL(obra.valor_inicial)}.`, size: 24 })]),
    ...(obra.valor_aditivado
      ? [P([new TextRun({ text: 'Valor total dos aditivos: ', bold: true, size: 24 }), new TextRun({ text: `${BRL(obra.valor_aditivado)}.`, size: 24 })])]
      : []),
    P([new TextRun({ text: 'Valor final do contrato: ', bold: true, size: 24 }), new TextRun({ text: `${BRL(obra.valor_final)}.`, size: 24 })]),
    P([new TextRun({ text: 'Período de execução: ', bold: true, size: 24 }), new TextRun({ text: `${fmtDate(obra.data_inicio)} a ${fmtDate(obra.data_termino_real || obra.previsao_termino)}.`, size: 24 })]),
    ...(obra.numero_art_execucao
      ? [P([new TextRun({ text: 'ART de Execução: ', bold: true, size: 24 }), new TextRun({ text: `${obra.numero_art_execucao}.`, size: 24 })])]
      : []),

    P([
      'Declaramos ainda que os compromissos assumidos foram cumpridos satisfatoriamente, nada constando ' +
      'em nossos registros que desabone tecnicamente a empresa, até o momento.',
    ], { indent: true, spacing: 400 }),

    ...assinaturaFiscal(data),
    // Segundo bloco: DPG
    new Paragraph({ spacing: { before: 320 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: '_______________________________________________', size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: dpg?.nome || '________________________________', bold: true, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: dpg?.texto_cargo_documento || dpg?.cargo || 'Defensora Pública-Geral', size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: 'Defensoria Pública do Estado de Mato Grosso', italics: true, size: 22 })],
    }),
  ];
}

export async function gerarDocumentoEncerramento(
  tipo: EncerramentoTipo,
  data: EncerramentoData,
): Promise<Blob> {
  const children =
    tipo === 'TRP' ? buildTRP(data) : tipo === 'TRD' ? buildTRD(data) : buildACT(data);

  const doc = new Document({
    creator: 'SIDIF',
    title: `${tipo} — ${data.obra.nome}`,
    styles: {
      default: { document: { run: { font: 'Arial', size: 24 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function nomeArquivoDocumento(tipo: EncerramentoTipo, data: EncerramentoData) {
  const contrato = (data.obra.n_contrato || 'sem-contrato').replace(/[^\w-]+/g, '_');
  const unidade = (data.obra.nome || 'obra').slice(0, 40).replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '_');
  const dataStr = hoje();
  return `${tipo}_Contrato_${contrato}_${unidade}_${dataStr}.docx`;
}
