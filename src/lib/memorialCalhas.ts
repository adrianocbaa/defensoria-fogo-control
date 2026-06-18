import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CadastroObra } from '@/components/dimensionamento/calhas/types';
import type { ChuvaProjeto } from '@/components/dimensionamento/calhas/chuvaSchema';
import type { Calha } from '@/components/dimensionamento/calhas/calhaSchema';
import type { Pano } from '@/components/dimensionamento/calhas/panoSchema';
import { calcularCalhas } from '@/lib/calhaCalculo';
import { calcularAreaContribuicao } from '@/components/dimensionamento/calhas/panoSchema';
import {
  FAIXAS_CONDUTOR_PADRAO,
  diametroMinimo,
  diametroComercial,
  capacidadePorDiametro,
} from '@/lib/condutorVertical';

interface Params {
  cadastro: CadastroObra;
  chuva: ChuvaProjeto;
  panos: Pano[];
  calhas: Calha[];
}

export function gerarMemorialPDF({ cadastro, chuva, panos, calhas }: Params) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 18;
  let y = M;

  const h1 = (t: string) => {
    ensure(14);
    doc.setFont('helvetica', 'bold').setFontSize(14);
    doc.text(t, M, y);
    y += 6;
    doc.setDrawColor(180);
    doc.line(M, y, pageW - M, y);
    y += 4;
  };
  const h2 = (t: string) => {
    ensure(10);
    doc.setFont('helvetica', 'bold').setFontSize(11);
    doc.text(t, M, y);
    y += 5.5;
  };
  const p = (t: string) => {
    doc.setFont('helvetica', 'normal').setFontSize(10);
    const lines = doc.splitTextToSize(t, pageW - 2 * M);
    ensure(lines.length * 4.5);
    doc.text(lines, M, y);
    y += lines.length * 4.5 + 1;
  };
  const ensure = (need: number) => {
    if (y + need > pageH - M) {
      doc.addPage();
      y = M;
    }
  };
  const tabela = (head: string[][], body: (string | number)[][]) => {
    autoTable(doc, {
      head,
      body,
      startY: y,
      margin: { left: M, right: M },
      styles: { fontSize: 9, cellPadding: 1.8 },
      headStyles: { fillColor: [225, 29, 72], textColor: 255 },
      theme: 'grid',
    });
    // @ts-expect-error lastAutoTable injected by autoTable
    y = (doc as any).lastAutoTable.finalY + 6;
  };

  // ===== Cabeçalho =====
  doc.setFont('helvetica', 'bold').setFontSize(16);
  doc.text('Memorial de Cálculo — Sistema de Calhas e Condutores', M, y);
  y += 6;
  doc.setFont('helvetica', 'normal').setFontSize(10);
  doc.text('Conforme ABNT NBR 10844:1989', M, y);
  y += 4;
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, M, y);
  y += 8;

  // ===== 1. Dados da obra =====
  h1('1. Dados da obra');
  const dados: [string, string][] = [
    ['Nome da obra', cadastro.nome_obra || '—'],
    ['Responsável técnico', cadastro.responsavel_tecnico || '—'],
    ['Registro profissional', cadastro.registro_profissional || '—'],
    ['Endereço', cadastro.endereco || '—'],
    ['Cidade / UF', `${cadastro.cidade || '—'} / ${cadastro.uf || '—'}`],
    ['Tipo de edificação', cadastro.tipo_edificacao || '—'],
    ['Data do projeto', cadastro.data_projeto || '—'],
  ];
  tabela([['Campo', 'Valor']], dados);

  // ===== 2. Norma adotada =====
  h1('2. Norma adotada');
  p('ABNT NBR 10844:1989 — Instalações prediais de águas pluviais. ' +
    'Estabelece critérios para o dimensionamento de calhas, condutores verticais e horizontais, ' +
    'de modo a garantir o escoamento das águas pluviais sem transbordamento.');

  // ===== 3. Chuva de projeto =====
  h1('3. Chuva de projeto');
  tabela(
    [['Parâmetro', 'Valor']],
    [
      ['Intensidade pluviométrica (I)', `${chuva.intensidade_mm_h} mm/h`],
      ['Tempo de retorno (TR)', `${chuva.tempo_retorno_anos} anos`],
      ['Duração da chuva', `${chuva.duracao_min ?? 5} min`],
      ['Fonte', chuva.fonte || 'NBR 10844 / Tabela 5'],
    ],
  );

  // ===== 4. Fórmulas =====
  h1('4. Fórmulas utilizadas');
  h2('4.1 Área de contribuição (Tabela 1 da NBR 10844)');
  p('A = a · b · (1 + tan θ / 2)');
  p('  a = projeção horizontal do pano (m)');
  p('  b = comprimento horizontal do pano (m)');
  p('  θ = ângulo de inclinação do telhado');

  h2('4.2 Vazão de projeto');
  p('Q [L/min] = (I × A) / 60     —     I em mm/h, A em m²');

  h2('4.3 Capacidade hidráulica da calha — Manning (conduto livre)');
  p('Q [m³/s] = (1/n) · A_m · R_h^(2/3) · i^(1/2)');
  p('  n  = coeficiente de rugosidade de Manning');
  p('  A_m = área molhada da seção (m²)');
  p('  R_h = raio hidráulico = A_m / P_m (m)');
  p('  i  = declividade da calha (m/m)');
  p('Conversão: Q [L/min] = Q [m³/s] × 60 000.');

  h2('4.4 Condutores verticais');
  p('Diâmetro mínimo obtido por tabela parametrizada baseada nos ábacos da NBR 10844 ' +
    '(saída em aresta viva), com interpolação log–log entre as faixas cadastradas. ' +
    'Adota-se o diâmetro comercial imediatamente superior ao mínimo calculado.');

  // ===== 5. Áreas de contribuição =====
  h1('5. Áreas de contribuição (panos de telhado)');
  tabela(
    [['Pano', 'Tipo', 'Comp. (m)', 'Proj. (m)', 'Inclinação', 'Área (m²)', 'Calha']],
    panos.map((pn) => {
      const a = calcularAreaContribuicao(pn);
      return [
        pn.nome,
        pn.tipo_telhado,
        pn.comprimento_m.toFixed(2),
        pn.projecao_m.toFixed(2),
        `${pn.inclinacao_valor} ${pn.inclinacao_unidade}`,
        a.areaContribuicao.toFixed(2),
        pn.calha_associada || '—',
      ];
    }),
  );

  // ===== 6. Vazão por trecho / Dimensionamento das calhas =====
  const resultados = calcularCalhas(calhas, panos, chuva.intensidade_mm_h);
  h1('6. Vazão por trecho e dimensionamento das calhas');
  tabela(
    [[
      'Calha', 'Tipo', 'A (m²)', 'i (%)', 'n',
      'Q proj. (L/min)', 'Cap. (L/min)', 'FS', 'Situação',
    ]],
    resultados.map((r) => [
      r.calha.nome,
      r.calha.tipo,
      r.areaContribuicao_m2.toFixed(2),
      r.calha.declividade_pct.toFixed(2),
      r.calha.manning_n.toFixed(3),
      r.vazaoProjeto_Lmin.toFixed(1),
      r.capacidade_Lmin != null ? r.capacidade_Lmin.toFixed(1) : '—',
      r.fatorSeguranca != null ? r.fatorSeguranca.toFixed(2) : '—',
      r.atende == null ? '—' : r.atende ? 'Atende' : 'Não atende',
    ]),
  );

  // ===== 7. Condutores verticais =====
  h1('7. Dimensionamento dos condutores verticais');
  const linhasCond = resultados.flatMap((r) => {
    const n = r.calha.pontos_descida.length || 1;
    const q = r.vazaoProjeto_Lmin / n;
    return r.calha.pontos_descida.map((pt) => {
      const dMin = diametroMinimo(FAIXAS_CONDUTOR_PADRAO, q);
      const com = dMin != null ? diametroComercial(FAIXAS_CONDUTOR_PADRAO, dMin) : null;
      const cap = com ? capacidadePorDiametro(FAIXAS_CONDUTOR_PADRAO, com.diametro_mm) : null;
      const fs = cap != null && q > 0 ? cap / q : null;
      return {
        calha: r.calha.nome,
        ponto: pt.rotulo,
        q,
        dMin,
        dCom: com?.diametro_mm ?? null,
        cap,
        fs,
        atende: cap != null && cap >= q,
      };
    });
  });
  tabela(
    [[
      'Calha', 'Ponto', 'Q (L/min)', 'D mín. (mm)', 'D adotado (mm)',
      'Cap. (L/min)', 'FS', 'Situação',
    ]],
    linhasCond.map((c) => [
      c.calha,
      c.ponto,
      c.q.toFixed(1),
      c.dMin != null ? c.dMin.toFixed(0) : 'fora da tabela',
      c.dCom ?? '—',
      c.cap != null ? c.cap.toFixed(1) : '—',
      c.fs != null ? c.fs.toFixed(2) : '—',
      c.cap == null ? '—' : c.atende ? 'Atende' : 'Não atende',
    ]),
  );

  // ===== 8. Tabela final =====
  h1('8. Tabela final — dimensões adotadas');
  tabela(
    [['Elemento', 'Tipo / Material', 'Dimensão', 'Quantidade']],
    [
      ...calhas.map((c) => {
        const dim =
          c.tipo === 'semicircular' ? `Ø ${(c.diametro_m! * 1000).toFixed(0)} mm` :
          c.tipo === 'retangular' ? `${(c.largura_m! * 1000).toFixed(0)} × ${(c.altura_m! * 1000).toFixed(0)} mm` :
          c.tipo === 'trapezoidal' ? `${(c.base_menor_m! * 1000).toFixed(0)} / ${(c.base_maior_m! * 1000).toFixed(0)} × ${(c.altura_m! * 1000).toFixed(0)} mm` :
          'personalizada';
        return [`Calha — ${c.nome}`, `${c.tipo} / ${c.material}`, dim, `${c.comprimento_m.toFixed(2)} m`];
      }),
      ...agruparCondutores(linhasCond),
    ],
  );

  // ===== 9. Observação =====
  h1('9. Observações');
  p('Os valores de capacidade dos condutores verticais utilizam tabela parametrizada baseada ' +
    'nos ábacos/nomogramas da ABNT NBR 10844:1989 (saída em aresta viva, H = L). ' +
    'É responsabilidade do projetista conferir os nomogramas e ábacos conforme a publicação ' +
    'oficial da norma antes da emissão definitiva do projeto.');

  // ===== 10. Assinatura =====
  ensure(40);
  y = Math.max(y, pageH - 50);
  doc.setDrawColor(80);
  doc.line(M, y, M + 90, y);
  doc.setFont('helvetica', 'normal').setFontSize(10);
  doc.text(cadastro.responsavel_tecnico || 'Responsável Técnico', M, y + 5);
  doc.text(cadastro.registro_profissional || 'Registro profissional', M, y + 10);
  doc.text('Assinatura do Responsável Técnico', M, y + 18);

  // Rodapé com paginação
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120);
    doc.text(
      `${cadastro.nome_obra || 'Memorial de cálculo'}  •  Página ${i}/${pages}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' },
    );
    doc.setTextColor(0);
  }

  const filename = `memorial-calhas-${(cadastro.nome_obra || 'obra')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}.pdf`;
  doc.save(filename);
}

function agruparCondutores(linhas: { dCom: number | null }[]) {
  const map = new Map<number, number>();
  linhas.forEach((l) => {
    if (l.dCom != null) map.set(l.dCom, (map.get(l.dCom) || 0) + 1);
  });
  return [...map.entries()].map(([d, n]) => [
    'Condutor vertical',
    'Tubo conforme projeto',
    `Ø ${d} mm`,
    `${n} un.`,
  ]);
}
