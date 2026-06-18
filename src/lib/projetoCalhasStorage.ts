import type { CadastroObra } from '@/components/dimensionamento/calhas/types';
import type { ChuvaProjeto } from '@/components/dimensionamento/calhas/chuvaSchema';
import type { PanosForm } from '@/components/dimensionamento/calhas/panoSchema';
import type { CalhasForm } from '@/components/dimensionamento/calhas/calhaSchema';

export interface ProjetoCalhas {
  id: string;
  nome: string;
  atualizadoEm: string;
  cadastro: CadastroObra | null;
  chuva: ChuvaProjeto | null;
  panos: PanosForm | null;
  calhas: CalhasForm | null;
}

const KEY = 'dimensionamento-calhas:projetos';

export function listarProjetos(): ProjetoCalhas[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProjetoCalhas[]) : [];
  } catch {
    return [];
  }
}

function persistir(lista: ProjetoCalhas[]) {
  localStorage.setItem(KEY, JSON.stringify(lista));
}

export function salvarProjeto(p: Omit<ProjetoCalhas, 'atualizadoEm'>) {
  const lista = listarProjetos();
  const idx = lista.findIndex((x) => x.id === p.id);
  const registro: ProjetoCalhas = { ...p, atualizadoEm: new Date().toISOString() };
  if (idx >= 0) lista[idx] = registro;
  else lista.unshift(registro);
  persistir(lista);
  return registro;
}

export function removerProjeto(id: string) {
  persistir(listarProjetos().filter((x) => x.id !== id));
}

export function duplicarProjeto(id: string): ProjetoCalhas | null {
  const lista = listarProjetos();
  const orig = lista.find((x) => x.id === id);
  if (!orig) return null;
  const copia: ProjetoCalhas = {
    ...orig,
    id: crypto.randomUUID(),
    nome: `${orig.nome} (cópia)`,
    atualizadoEm: new Date().toISOString(),
  };
  persistir([copia, ...lista]);
  return copia;
}

/** Projeto fictício para demonstração. */
export function projetoExemplo(): ProjetoCalhas {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    nome: 'Exemplo — Galpão Industrial',
    atualizadoEm: new Date().toISOString(),
    cadastro: {
      nome_obra: 'Galpão Industrial Modelo',
      cidade: 'Cuiabá',
      uf: 'MT',
      tipo_edificacao: 'Industrial',
      responsavel_tecnico: 'Eng. João da Silva',
      data_calculo: today,
      observacoes: 'Projeto demonstrativo com dados fictícios.',
    },
    chuva: {
      intensidade_mm_h: 150,
      tempo_retorno_anos: 5,
      duracao_min: 5,
      fonte: 'NBR 10844 — Tabela 5',
    },
    panos: {
      panos: [
        {
          id: crypto.randomUUID(),
          nome: 'Pano Norte',
          comprimento_m: 40,
          projecao_m: 12,
          inclinacao_valor: 10,
          inclinacao_unidade: '%',
          tipo_telhado: 'Metálica (trapezoidal)',
          calha_associada: 'Calha 01',
        },
        {
          id: crypto.randomUUID(),
          nome: 'Pano Sul',
          comprimento_m: 40,
          projecao_m: 12,
          inclinacao_valor: 10,
          inclinacao_unidade: '%',
          tipo_telhado: 'Metálica (trapezoidal)',
          calha_associada: 'Calha 02',
        },
      ],
    },
    calhas: {
      calhas: [
        {
          id: crypto.randomUUID(),
          nome: 'Calha 01',
          comprimento_m: 40,
          tipo: 'semicircular',
          declividade_pct: 0.5,
          material: 'Aço galvanizado (chapa lisa)',
          manning_n: 0.012,
          diametro_m: 0.2,
          geometria_personalizada: '',
          pontos_descida: [
            { id: crypto.randomUUID(), rotulo: 'PD1', posicao_m: 0 },
            { id: crypto.randomUUID(), rotulo: 'PD2', posicao_m: 40 },
          ],
        },
        {
          id: crypto.randomUUID(),
          nome: 'Calha 02',
          comprimento_m: 40,
          tipo: 'retangular',
          declividade_pct: 0.5,
          material: 'PVC',
          manning_n: 0.011,
          largura_m: 0.2,
          altura_m: 0.15,
          geometria_personalizada: '',
          pontos_descida: [
            { id: crypto.randomUUID(), rotulo: 'PD1', posicao_m: 0 },
            { id: crypto.randomUUID(), rotulo: 'PD2', posicao_m: 40 },
          ],
        },
      ],
    },
  };
}

/** Conversor simples para CSV (com BOM para abrir no Excel). */
export function toCSV(rows: (string | number | null | undefined)[][]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '\ufeff' + rows.map((r) => r.map(escape).join(';')).join('\n');
}

export function baixarCSV(nome: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome.endsWith('.csv') ? nome : `${nome}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
