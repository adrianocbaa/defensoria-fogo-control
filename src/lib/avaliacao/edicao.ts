// Edição completa de dados de uma avaliação: monta o lote só com os campos efetivamente alterados
// (o servidor confere permissão, calcula o impacto e grava tudo de uma vez).

export type CampoTipo = 'texto' | 'numero' | 'data' | 'opcao';

export interface CampoEdicao {
  /** Chave do formulário (permite dois campos com o mesmo nome em entidades diferentes). */
  chave: string;
  entity_type: string;
  entity_id: string;
  campo: string;
  rotulo: string;
  tipo: CampoTipo;
  casas?: number;
  contexto?: Record<string, unknown>;
  opcoes?: Record<string, string>;
  prefixo?: string;
  sufixo?: string;
}

export interface AlteracaoPendente {
  entity_type: string;
  entity_id: string;
  campo: string;
  rotulo: string;
  valor: string | number | null;
  de: string;
  para: string;
  contexto?: Record<string, unknown>;
}

/** Número digitado no padrão brasileiro: "1.234,56", "242,5", "242.5" ou "1.234". Vazio = null; inválido = NaN. */
export function parseDecimalBR(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  let s = String(raw).replace(/R\$|\s/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const arred = (n: number, casas: number) => { const f = 10 ** casas; return Math.round(n * f) / f; };

/** Valor normalizado para comparação e envio. */
export function normalizar(tipo: CampoTipo, raw: unknown, casas = 2): string | number | null {
  if (tipo === 'numero') {
    const n = parseDecimalBR(raw);
    return n === null || Number.isNaN(n) ? n : arred(n, casas);
  }
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return tipo === 'data' ? s.slice(0, 10) : s;
}

/** Valor do banco para o campo do formulário (números no padrão brasileiro, sem separador de milhar). */
export function paraFormulario(tipo: CampoTipo, raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (tipo === 'numero') return String(raw).replace('.', ',');
  if (tipo === 'data') return String(raw).slice(0, 10);
  return String(raw);
}

export function formatarValor(c: Pick<CampoEdicao, 'tipo' | 'casas' | 'opcoes' | 'prefixo' | 'sufixo'>, v: string | number | null): string {
  if (v === null || v === undefined || v === '') return '—';
  if (c.tipo === 'numero') {
    const s = Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c.prefixo === 'R$' ? 2 : 0, maximumFractionDigits: c.casas ?? 2 });
    return `${c.prefixo ? `${c.prefixo} ` : ''}${s}${c.sufixo ? ` ${c.sufixo}` : ''}`;
  }
  if (c.tipo === 'data') {
    const [y, m, d] = String(v).slice(0, 10).split('-');
    return y && m && d ? `${d}/${m}/${y}` : String(v);
  }
  if (c.tipo === 'opcao') return c.opcoes?.[String(v)] ?? String(v);
  return String(v);
}

/** Campos numéricos digitados de forma inválida (rótulos). */
export function camposInvalidos(campos: CampoEdicao[], form: Record<string, string>): string[] {
  return campos.filter((c) => c.tipo === 'numero' && Number.isNaN(normalizar('numero', form[c.chave], c.casas ?? 2))).map((c) => c.rotulo);
}

/** Lote com somente os campos cujo valor normalizado mudou. */
export function montarAlteracoes(campos: CampoEdicao[], original: Record<string, unknown>, form: Record<string, string>): AlteracaoPendente[] {
  const out: AlteracaoPendente[] = [];
  for (const c of campos) {
    const antes = normalizar(c.tipo, original[c.chave], c.casas ?? 2);
    const depois = normalizar(c.tipo, form[c.chave], c.casas ?? 2);
    if (antes === depois) continue;
    out.push({
      entity_type: c.entity_type, entity_id: c.entity_id, campo: c.campo, rotulo: c.rotulo, valor: depois,
      de: formatarValor(c, antes), para: formatarValor(c, depois), ...(c.contexto ? { contexto: c.contexto } : {}),
    });
  }
  return out;
}

/** Prévia do valor unitário (R$/m²), mesma regra do servidor: valor ÷ área construída, 4 casas. */
export function valorUnitario(valor: number | null, area: number | null): number | null {
  if (valor === null || area === null || Number.isNaN(valor) || Number.isNaN(area) || !(area > 0)) return null;
  return arred(valor / area, 4);
}
