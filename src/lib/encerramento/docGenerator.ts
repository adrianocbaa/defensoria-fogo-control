import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  PageOrientation,
} from 'docx';
import type { EncerramentoData, EncerramentoTipo } from './types';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d?: string | null) => {
  if (!d) return '____/____/______';
  const [y, m, day] = d.split('-').map(Number);
  return `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

const fmtDateExtenso = (d?: string | null) => {
  if (!d) return '____ de __________ de ______';
  const [y, m, day] = d.split('-').map(Number);
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${day} de ${meses[m - 1]} de ${y}`;
};

function P(text: string, opts: { bold?: boolean; align?: AlignmentType; size?: number; spacing?: number } = {}) {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: opts.spacing ?? 160, line: 300 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22 })],
  });
}

function H(text: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 120, after: 240 },
    children: [new TextRun({ text, bold: true, size: 28 })],
  });
}

function label(l: string, v: string) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${l}: `, bold: true, size: 22 }),
      new TextRun({ text: v || '—', size: 22 }),
    ],
  });
}

function signatureBlock(nome: string, cargo: string) {
  return [
    new Paragraph({ spacing: { before: 480, after: 0 }, children: [new TextRun('')] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: '_________________________________________', size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [new TextRun({ text: nome || 'Nome do assinante', bold: true, size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: cargo || 'Cargo', size: 22 })],
    }),
  ];
}

function cabecalhoInstitucional(data: EncerramentoData) {
  const inst = data.institucional;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: (inst?.razao_social || 'DEFENSORIA PÚBLICA').toUpperCase(), bold: true, size: 24 })],
    }),
    inst?.cnpj
      ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: `CNPJ: ${inst.cnpj}`, size: 20 })],
        })
      : new Paragraph({ children: [] }),
    inst?.endereco
      ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({ text: inst.endereco, size: 20 })],
        })
      : new Paragraph({ spacing: { after: 240 }, children: [] }),
  ];
}

function buildTRP(data: EncerramentoData) {
  const { obra, empresa, dpg, institucional } = data;
  return [
    ...cabecalhoInstitucional(data),
    H('TERMO DE RECEBIMENTO PROVISÓRIO'),
    P(
      `Aos ${fmtDateExtenso(obra.data_recebimento_provisorio)}, a ${(institucional?.razao_social || 'Defensoria Pública')}, inscrita no CNPJ sob o nº ${institucional?.cnpj || '—'}, por meio da comissão designada, procedeu à vistoria da obra descrita a seguir, para fins de RECEBIMENTO PROVISÓRIO, nos termos da Lei nº 14.133/2021.`,
    ),
    P('1. IDENTIFICAÇÃO DO OBJETO', { bold: true, align: AlignmentType.LEFT, spacing: 80 }),
    label('Objeto', obra.nome),
    label('Contrato nº', obra.n_contrato || ''),
    label('Processo SEI', obra.sei_numero || ''),
    label('Endereço', obra.endereco_completo || ''),
    label('Município', obra.municipio || ''),
    label('Início da execução', fmtDate(obra.data_inicio)),
    label('Término da execução', fmtDate(obra.data_termino_real || obra.data_recebimento_provisorio)),
    label('ART/RRT de execução', obra.numero_art_execucao || ''),
    P('2. CONTRATADA', { bold: true, align: AlignmentType.LEFT, spacing: 80 }),
    label('Razão social', empresa?.razao_social || ''),
    label('CNPJ', empresa?.cnpj || ''),
    label('Representante legal', empresa?.representante_legal_nome || ''),
    label('Responsável técnico', `${empresa?.responsavel_tecnico_nome || ''} — ${empresa?.conselho_tipo || ''} ${empresa?.conselho_numero || ''}/${empresa?.conselho_uf || ''}`),
    P('3. DECLARAÇÃO', { bold: true, align: AlignmentType.LEFT, spacing: 80 }),
    P(
      `A comissão declara que a obra objeto do Contrato nº ${obra.n_contrato || '—'} foi executada pela contratada acima identificada e, nesta data, é RECEBIDA PROVISORIAMENTE, ficando sob observação durante o prazo legal para verificação de sua adequação aos termos contratuais, ao projeto e às normas técnicas aplicáveis, momento em que se iniciará a contagem do prazo para emissão do Termo de Recebimento Definitivo.`,
    ),
    P(`Valor executado: ${BRL(obra.valor_executado)}.`),
    P(`Local e data: ${institucional?.cidade || '________'}, ${fmtDateExtenso(obra.data_recebimento_provisorio)}.`, { spacing: 320 }),
    ...signatureBlock(dpg?.nome || '', dpg?.texto_cargo_documento || dpg?.cargo || ''),
    ...signatureBlock(empresa?.representante_legal_nome || '', `Representante legal — ${empresa?.razao_social || ''}`),
  ];
}

function buildTRD(data: EncerramentoData) {
  const { obra, empresa, dpg, institucional } = data;
  return [
    ...cabecalhoInstitucional(data),
    H('TERMO DE RECEBIMENTO DEFINITIVO'),
    P(
      `Aos ${fmtDateExtenso(obra.data_recebimento_definitivo)}, a ${(institucional?.razao_social || 'Defensoria Pública')}, CNPJ ${institucional?.cnpj || '—'}, por meio da comissão designada, procedeu à vistoria conclusiva da obra abaixo identificada, para fins de RECEBIMENTO DEFINITIVO, nos termos da Lei nº 14.133/2021.`,
    ),
    P('1. IDENTIFICAÇÃO DO OBJETO', { bold: true, align: AlignmentType.LEFT, spacing: 80 }),
    label('Objeto', obra.nome),
    label('Contrato nº', obra.n_contrato || ''),
    label('Processo SEI', obra.sei_numero || ''),
    label('Endereço', obra.endereco_completo || ''),
    label('Município', obra.municipio || ''),
    label('Recebimento provisório em', fmtDate(obra.data_recebimento_provisorio)),
    label('Recebimento definitivo em', fmtDate(obra.data_recebimento_definitivo)),
    label('ART/RRT de execução', obra.numero_art_execucao || ''),
    P('2. CONTRATADA', { bold: true, align: AlignmentType.LEFT, spacing: 80 }),
    label('Razão social', empresa?.razao_social || ''),
    label('CNPJ', empresa?.cnpj || ''),
    label('Representante legal', empresa?.representante_legal_nome || ''),
    label('Responsável técnico', `${empresa?.responsavel_tecnico_nome || ''} — ${empresa?.conselho_tipo || ''} ${empresa?.conselho_numero || ''}/${empresa?.conselho_uf || ''}`),
    P('3. DECLARAÇÃO', { bold: true, align: AlignmentType.LEFT, spacing: 80 }),
    P(
      `A comissão, após inspeção final e verificação da adequação do objeto contratado, DECLARA que a obra referente ao Contrato nº ${obra.n_contrato || '—'} foi executada em conformidade com o projeto, especificações técnicas e demais obrigações contratuais, sendo, nesta data, RECEBIDA DEFINITIVAMENTE, cessando as responsabilidades da contratada relativas à execução, ressalvadas as garantias legais aplicáveis.`,
    ),
    P(`Valor final do contrato: ${BRL(obra.valor_final)} — valor executado: ${BRL(obra.valor_executado)}.`),
    P(`Local e data: ${institucional?.cidade || '________'}, ${fmtDateExtenso(obra.data_recebimento_definitivo)}.`, { spacing: 320 }),
    ...signatureBlock(dpg?.nome || '', dpg?.texto_cargo_documento || dpg?.cargo || ''),
    ...signatureBlock(empresa?.representante_legal_nome || '', `Representante legal — ${empresa?.razao_social || ''}`),
  ];
}

function buildACT(data: EncerramentoData) {
  const { obra, empresa, dpg, institucional } = data;
  return [
    ...cabecalhoInstitucional(data),
    H('ATESTADO DE CAPACIDADE TÉCNICA'),
    P(
      `A ${(institucional?.razao_social || 'Defensoria Pública')}, inscrita no CNPJ sob o nº ${institucional?.cnpj || '—'}, ATESTA, para os devidos fins de comprovação junto a órgãos públicos e privados, que a empresa ${empresa?.razao_social || '—'}, inscrita no CNPJ sob o nº ${empresa?.cnpj || '—'}, executou de forma satisfatória o objeto abaixo descrito.`,
    ),
    P('1. OBJETO EXECUTADO', { bold: true, align: AlignmentType.LEFT, spacing: 80 }),
    label('Descrição', obra.nome),
    label('Endereço', obra.endereco_completo || ''),
    label('Município', obra.municipio || ''),
    label('Contrato nº', obra.n_contrato || ''),
    label('Processo SEI', obra.sei_numero || ''),
    label('Período de execução', `${fmtDate(obra.data_inicio)} a ${fmtDate(obra.data_termino_real || obra.data_recebimento_definitivo || obra.data_recebimento_provisorio)}`),
    label('Valor executado', BRL(obra.valor_executado)),
    label('ART/RRT de execução', obra.numero_art_execucao || ''),
    P('2. RESPONSÁVEL TÉCNICO DA CONTRATADA', { bold: true, align: AlignmentType.LEFT, spacing: 80 }),
    label('Nome', empresa?.responsavel_tecnico_nome || ''),
    label('Registro profissional', `${empresa?.conselho_tipo || ''} ${empresa?.conselho_numero || ''}/${empresa?.conselho_uf || ''}`),
    label('Profissão', empresa?.responsavel_tecnico_profissao || ''),
    P('3. DECLARAÇÃO', { bold: true, align: AlignmentType.LEFT, spacing: 80 }),
    P(
      `Declaramos que os serviços foram executados dentro das especificações técnicas e das cláusulas contratuais, tendo a contratada demonstrado capacidade técnica, operacional e financeira para a plena execução do objeto. Nada consta em nossos registros que desabone a conduta técnica ou comercial da referida empresa.`,
    ),
    P(`Local e data: ${institucional?.cidade || '________'}, ${fmtDateExtenso(obra.data_recebimento_definitivo || obra.data_termino_real || obra.data_recebimento_provisorio)}.`, { spacing: 320 }),
    ...signatureBlock(dpg?.nome || '', dpg?.texto_cargo_documento || dpg?.cargo || ''),
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
      default: { document: { run: { font: 'Arial', size: 22 } } },
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

  const blob = await Packer.toBlob(doc);
  return blob;
}

export function nomeArquivoDocumento(tipo: EncerramentoTipo, data: EncerramentoData) {
  const contrato = (data.obra.n_contrato || 'sem-contrato').replace(/[^\w-]+/g, '_');
  const obra = data.obra.nome.slice(0, 40).replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '_');
  return `${tipo}_${contrato}_${obra}.docx`;
}
