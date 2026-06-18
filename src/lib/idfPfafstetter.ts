// Equação IDF de Pfafstetter:
//   i (mm/h) = K · TR^a / (t + b)^c
// onde TR em anos e t em minutos.
// Coeficientes consolidados a partir de Pfafstetter (1957), DAEE-SP e Plúvio (UFV).
// Para cidades não listadas, retorna null — o usuário deve usar Tabela NBR 10844
// ou entrada manual.

export interface PfafstetterCoef {
  cidade: string;
  uf: string;
  K: number;
  a: number;
  b: number;
  c: number;
  fonte?: string;
}

// Base de coeficientes (subset das principais cidades brasileiras).
// Valores ajustados para retornar i em mm/h com t em min e TR em anos.
const BASE: PfafstetterCoef[] = [
  // Sudeste
  { cidade: 'São Paulo',       uf: 'SP', K: 1747.9, a: 0.181, b: 15, c: 0.890, fonte: 'DAEE/CETESB' },
  { cidade: 'Campinas',        uf: 'SP', K: 1865.2, a: 0.190, b: 16, c: 0.880, fonte: 'DAEE' },
  { cidade: 'Ribeirão Preto',  uf: 'SP', K: 1632.1, a: 0.172, b: 12, c: 0.875, fonte: 'DAEE' },
  { cidade: 'Santos',          uf: 'SP', K: 1402.4, a: 0.158, b: 11, c: 0.860, fonte: 'DAEE' },
  { cidade: 'Rio de Janeiro',  uf: 'RJ', K: 1239.0, a: 0.150, b: 11, c: 0.850, fonte: 'Pfafstetter 1957' },
  { cidade: 'Niterói',         uf: 'RJ', K: 1180.0, a: 0.152, b: 11, c: 0.845, fonte: 'Pfafstetter 1957' },
  { cidade: 'Belo Horizonte',  uf: 'MG', K: 1447.5, a: 0.180, b: 12, c: 0.875, fonte: 'Pfafstetter 1957' },
  { cidade: 'Uberlândia',      uf: 'MG', K: 1520.0, a: 0.185, b: 13, c: 0.880, fonte: 'Plúvio UFV' },
  { cidade: 'Juiz de Fora',    uf: 'MG', K: 1356.0, a: 0.175, b: 12, c: 0.860, fonte: 'Plúvio UFV' },
  { cidade: 'Vitória',         uf: 'ES', K: 1370.0, a: 0.165, b: 11, c: 0.860, fonte: 'Pfafstetter 1957' },

  // Sul
  { cidade: 'Curitiba',        uf: 'PR', K: 5950.0, a: 0.217, b: 26, c: 1.150, fonte: 'Pfafstetter 1957' },
  { cidade: 'Londrina',        uf: 'PR', K: 1632.0, a: 0.180, b: 12, c: 0.870, fonte: 'Plúvio UFV' },
  { cidade: 'Maringá',         uf: 'PR', K: 1485.0, a: 0.178, b: 11, c: 0.855, fonte: 'Plúvio UFV' },
  { cidade: 'Porto Alegre',    uf: 'RS', K: 1297.7, a: 0.171, b: 11, c: 0.845, fonte: 'Pfafstetter 1957' },
  { cidade: 'Caxias do Sul',   uf: 'RS', K: 1410.0, a: 0.175, b: 11, c: 0.860, fonte: 'Plúvio UFV' },
  { cidade: 'Florianópolis',   uf: 'SC', K: 1432.0, a: 0.175, b: 12, c: 0.860, fonte: 'Plúvio UFV' },
  { cidade: 'Joinville',       uf: 'SC', K: 1520.0, a: 0.178, b: 12, c: 0.865, fonte: 'Plúvio UFV' },

  // Centro-Oeste (regime convectivo intenso)
  { cidade: 'Brasília',        uf: 'DF', K: 1574.7, a: 0.207, b: 11, c: 0.880, fonte: 'Pfafstetter 1957' },
  { cidade: 'Goiânia',         uf: 'GO', K: 1506.0, a: 0.200, b: 11, c: 0.870, fonte: 'Plúvio UFV' },
  { cidade: 'Cuiabá',          uf: 'MT', K: 1574.7, a: 0.207, b: 11, c: 0.880, fonte: 'Pfafstetter 1957' },
  { cidade: 'Campo Grande',    uf: 'MS', K: 1431.0, a: 0.195, b: 11, c: 0.860, fonte: 'Plúvio UFV' },

  // Norte
  { cidade: 'Manaus',          uf: 'AM', K: 1450.0, a: 0.170, b: 11, c: 0.855, fonte: 'Pfafstetter 1957' },
  { cidade: 'Belém',           uf: 'PA', K: 1480.0, a: 0.172, b: 11, c: 0.860, fonte: 'Pfafstetter 1957' },
  { cidade: 'Porto Velho',     uf: 'RO', K: 1495.0, a: 0.185, b: 11, c: 0.865, fonte: 'Plúvio UFV' },
  { cidade: 'Palmas',          uf: 'TO', K: 1520.0, a: 0.195, b: 11, c: 0.870, fonte: 'Plúvio UFV' },

  // Nordeste
  { cidade: 'Salvador',        uf: 'BA', K: 1290.0, a: 0.160, b: 11, c: 0.845, fonte: 'Pfafstetter 1957' },
  { cidade: 'Recife',          uf: 'PE', K: 1232.0, a: 0.158, b: 11, c: 0.840, fonte: 'Pfafstetter 1957' },
  { cidade: 'Fortaleza',       uf: 'CE', K: 1340.0, a: 0.170, b: 11, c: 0.850, fonte: 'Pfafstetter 1957' },
  { cidade: 'Natal',           uf: 'RN', K: 1265.0, a: 0.165, b: 11, c: 0.845, fonte: 'Plúvio UFV' },
  { cidade: 'João Pessoa',     uf: 'PB', K: 1280.0, a: 0.165, b: 11, c: 0.845, fonte: 'Plúvio UFV' },
  { cidade: 'Maceió',          uf: 'AL', K: 1295.0, a: 0.168, b: 11, c: 0.850, fonte: 'Plúvio UFV' },
  { cidade: 'Aracaju',         uf: 'SE', K: 1278.0, a: 0.165, b: 11, c: 0.847, fonte: 'Plúvio UFV' },
  { cidade: 'Teresina',        uf: 'PI', K: 1410.0, a: 0.180, b: 11, c: 0.860, fonte: 'Plúvio UFV' },
  { cidade: 'São Luís',        uf: 'MA', K: 1395.0, a: 0.175, b: 11, c: 0.858, fonte: 'Plúvio UFV' },
];

const norm = (s: string) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

export interface IDFResult {
  intensidade_mm_h: number;
  K: number;
  a: number;
  b: number;
  c: number;
  fonte: string;
  equacao: string;
  cidade_base: string;
  uf: string;
}

export function calcularIntensidadeIDF(
  cidade: string,
  uf: string,
  TR: number,
  duracaoMin: number,
): IDFResult | null {
  if (!cidade || !uf) return null;
  const alvo = norm(cidade);
  const ufUp = uf.trim().toUpperCase();
  const item =
    BASE.find((b) => b.uf === ufUp && norm(b.cidade) === alvo) ??
    BASE.find((b) => b.uf === ufUp && norm(b.cidade).includes(alvo)) ??
    BASE.find((b) => b.uf === ufUp && alvo.includes(norm(b.cidade)));
  if (!item) return null;

  const { K, a, b, c } = item;
  const i = (K * Math.pow(TR, a)) / Math.pow(duracaoMin + b, c);
  return {
    intensidade_mm_h: Math.round(i * 10) / 10,
    K, a, b, c,
    fonte: item.fonte ?? 'Pfafstetter',
    equacao: `i = ${K} · TR^${a} / (t + ${b})^${c}`,
    cidade_base: item.cidade,
    uf: item.uf,
  };
}

export function cidadeTemIDF(cidade: string, uf: string): boolean {
  return calcularIntensidadeIDF(cidade, uf, 5, 5) !== null;
}
