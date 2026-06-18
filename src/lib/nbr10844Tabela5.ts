// Tabela 5 da NBR 10844:1989 — Chuvas intensas no Brasil.
// Intensidade pluviométrica i (mm/h) para duração 5 min e períodos de retorno
// de 1, 5 e 25 anos. Fonte: ABNT NBR 10844:1989, Anexo A, Tabela 5.

export interface NbrCidade {
  cidade: string;
  uf: string;
  i1: number;   // TR  1 ano (mm/h)
  i5: number;   // TR  5 anos (mm/h)
  i25: number;  // TR 25 anos (mm/h)
}

export const NBR10844_TABELA5: NbrCidade[] = [
  // Norte
  { cidade: 'Rio Branco',           uf: 'AC', i1: 120, i5: 144, i25: 180 },
  { cidade: 'Maceió',               uf: 'AL', i1: 102, i5: 122, i25: 174 },
  { cidade: 'Macapá',               uf: 'AP', i1: 138, i5: 168, i25: 198 },
  { cidade: 'Manaus',               uf: 'AM', i1: 138, i5: 180, i25: 198 },
  { cidade: 'Belém',                uf: 'PA', i1: 138, i5: 157, i25: 185 },
  { cidade: 'Porto Velho',          uf: 'RO', i1: 120, i5: 144, i25: 180 },
  { cidade: 'Boa Vista',            uf: 'RR', i1: 120, i5: 144, i25: 180 },
  { cidade: 'Palmas',               uf: 'TO', i1: 120, i5: 144, i25: 180 },

  // Nordeste
  { cidade: 'Salvador',             uf: 'BA', i1: 108, i5: 122, i25: 145 },
  { cidade: 'Alagoinhas',           uf: 'BA', i1: 102, i5: 132, i25: 156 },
  { cidade: 'Caravelas',            uf: 'BA', i1:  90, i5: 108, i25: 134 },
  { cidade: 'Lençóis',              uf: 'BA', i1:  78, i5: 102, i25: 144 },
  { cidade: 'Fortaleza',            uf: 'CE', i1: 120, i5: 156, i25: 180 },
  { cidade: 'Quixeramobim',         uf: 'CE', i1: 115, i5: 137, i25: 195 },
  { cidade: 'São Luís',             uf: 'MA', i1: 132, i5: 162, i25: 192 },
  { cidade: 'Caxias',               uf: 'MA', i1: 120, i5: 144, i25: 168 },
  { cidade: 'Turiaçu',              uf: 'MA', i1: 102, i5: 132, i25: 168 },
  { cidade: 'João Pessoa',          uf: 'PB', i1: 115, i5: 146, i25: 174 },
  { cidade: 'Areia',                uf: 'PB', i1:  91, i5: 110, i25: 154 },
  { cidade: 'Campina Grande',       uf: 'PB', i1: 102, i5: 112, i25: 138 },
  { cidade: 'Monteiro',             uf: 'PB', i1: 110, i5: 125, i25: 138 },
  { cidade: 'Recife',               uf: 'PE', i1: 115, i5: 122, i25: 156 },
  { cidade: 'Garanhuns',            uf: 'PE', i1:  82, i5:  91, i25: 126 },
  { cidade: 'Triunfo',              uf: 'PE', i1: 102, i5: 132, i25: 168 },
  { cidade: 'Teresina',             uf: 'PI', i1: 154, i5: 180, i25: 228 },
  { cidade: 'Natal',                uf: 'RN', i1: 113, i5: 142, i25: 171 },
  { cidade: 'Aracaju',              uf: 'SE', i1: 122, i5: 132, i25: 156 },

  // Centro-Oeste
  { cidade: 'Brasília',             uf: 'DF', i1: 122, i5: 167, i25: 230 },
  { cidade: 'Goiânia',              uf: 'GO', i1: 120, i5: 144, i25: 180 },
  { cidade: 'Catalão',              uf: 'GO', i1: 120, i5: 132, i25: 174 },
  { cidade: 'Formosa',              uf: 'GO', i1: 120, i5: 138, i25: 168 },
  { cidade: 'Goiás',                uf: 'GO', i1: 106, i5: 132, i25: 165 },
  { cidade: 'Ipameri',              uf: 'GO', i1: 132, i5: 168, i25: 192 },
  { cidade: 'Cuiabá',               uf: 'MT', i1: 144, i5: 191, i25: 230 },
  { cidade: 'Campo Grande',         uf: 'MS', i1: 132, i5: 167, i25: 213 },
  { cidade: 'Corumbá',              uf: 'MS', i1: 138, i5: 158, i25: 192 },

  // Sudeste
  { cidade: 'Belo Horizonte',       uf: 'MG', i1: 114, i5: 132, i25: 227 },
  { cidade: 'Aimorés',              uf: 'MG', i1:  90, i5: 102, i25: 132 },
  { cidade: 'Araxá',                uf: 'MG', i1: 115, i5: 137, i25: 156 },
  { cidade: 'Barbacena',            uf: 'MG', i1: 132, i5: 168, i25: 216 },
  { cidade: 'Caratinga',            uf: 'MG', i1: 102, i5: 132, i25: 156 },
  { cidade: 'Conceição do Mato Dentro', uf: 'MG', i1: 120, i5: 132, i25: 156 },
  { cidade: 'Diamantina',           uf: 'MG', i1: 113, i5: 134, i25: 174 },
  { cidade: 'Juiz de Fora',         uf: 'MG', i1: 125, i5: 158, i25: 192 },
  { cidade: 'Lavras',               uf: 'MG', i1: 122, i5: 144, i25: 173 },
  { cidade: 'Montes Claros',        uf: 'MG', i1: 132, i5: 168, i25: 216 },
  { cidade: 'Pouso Alegre',         uf: 'MG', i1: 138, i5: 168, i25: 222 },
  { cidade: 'Sete Lagoas',          uf: 'MG', i1: 120, i5: 144, i25: 192 },
  { cidade: 'Teófilo Otoni',        uf: 'MG', i1: 120, i5: 144, i25: 174 },
  { cidade: 'Uberaba',              uf: 'MG', i1: 138, i5: 174, i25: 198 },
  { cidade: 'Viçosa',               uf: 'MG', i1: 132, i5: 138, i25: 174 },
  { cidade: 'Vitória',              uf: 'ES', i1: 102, i5: 122, i25: 174 },
  { cidade: 'Alegre',               uf: 'ES', i1:  91, i5: 110, i25: 144 },
  { cidade: 'Rio de Janeiro',       uf: 'RJ', i1: 122, i5: 167, i25: 227 },
  { cidade: 'Campos',               uf: 'RJ', i1: 132, i5: 162, i25: 204 },
  { cidade: 'Petrópolis',           uf: 'RJ', i1: 138, i5: 174, i25: 252 },
  { cidade: 'Resende',              uf: 'RJ', i1: 102, i5: 132, i25: 168 },
  { cidade: 'São Paulo',            uf: 'SP', i1: 122, i5: 172, i25: 230 },
  { cidade: 'Avaré',                uf: 'SP', i1: 102, i5: 132, i25: 156 },
  { cidade: 'Bauru',                uf: 'SP', i1: 120, i5: 144, i25: 172 },
  { cidade: 'Campos do Jordão',     uf: 'SP', i1: 132, i5: 156, i25: 192 },
  { cidade: 'Catanduva',            uf: 'SP', i1: 120, i5: 144, i25: 174 },
  { cidade: 'Pindorama',            uf: 'SP', i1: 120, i5: 144, i25: 174 },
  { cidade: 'Piracicaba',           uf: 'SP', i1: 122, i5: 142, i25: 192 },
  { cidade: 'Ribeirão Preto',       uf: 'SP', i1: 132, i5: 156, i25: 211 },
  { cidade: 'Santos',               uf: 'SP', i1: 122, i5: 144, i25: 202 },
  { cidade: 'Itapetininga',         uf: 'SP', i1: 138, i5: 162, i25: 188 },
  { cidade: 'Taubaté',              uf: 'SP', i1: 138, i5: 162, i25: 232 },
  { cidade: 'Ubatuba',              uf: 'SP', i1: 122, i5: 162, i25: 222 },

  // Sul
  { cidade: 'Curitiba',             uf: 'PR', i1: 132, i5: 204, i25: 228 },
  { cidade: 'Castro',               uf: 'PR', i1: 102, i5: 132, i25: 168 },
  { cidade: 'Guarapuava',           uf: 'PR', i1: 102, i5: 132, i25: 165 },
  { cidade: 'Jacarezinho',          uf: 'PR', i1: 120, i5: 138, i25: 174 },
  { cidade: 'Londrina',             uf: 'PR', i1: 120, i5: 138, i25: 174 },
  { cidade: 'Paranaguá',            uf: 'PR', i1: 122, i5: 144, i25: 192 },
  { cidade: 'Florianópolis',        uf: 'SC', i1: 114, i5: 120, i25: 144 },
  { cidade: 'Bom Jardim',           uf: 'SC', i1:  91, i5: 113, i25: 142 },
  { cidade: 'Lages',                uf: 'SC', i1:  90, i5: 110, i25: 138 },
  { cidade: 'Porto Alegre',         uf: 'RS', i1: 118, i5: 146, i25: 167 },
  { cidade: 'Bagé',                 uf: 'RS', i1:  92, i5: 122, i25: 162 },
  { cidade: 'Caxias do Sul',        uf: 'RS', i1: 120, i5: 144, i25: 174 },
  { cidade: 'Encruzilhada do Sul',  uf: 'RS', i1: 108, i5: 138, i25: 168 },
  { cidade: 'Iraí',                 uf: 'RS', i1: 102, i5: 132, i25: 168 },
  { cidade: 'Passo Fundo',          uf: 'RS', i1: 113, i5: 137, i25: 167 },
  { cidade: 'Pelotas',              uf: 'RS', i1:  88, i5: 108, i25: 144 },
  { cidade: 'Rio Grande',           uf: 'RS', i1:  92, i5: 108, i25: 156 },
  { cidade: 'Santa Maria',          uf: 'RS', i1: 122, i5: 138, i25: 168 },
  { cidade: 'Santa Vitória do Palmar', uf: 'RS', i1:  82, i5: 102, i25: 138 },
  { cidade: 'São Gabriel',          uf: 'RS', i1:  91, i5: 113, i25: 144 },
  { cidade: 'São Luiz Gonzaga',     uf: 'RS', i1: 102, i5: 132, i25: 168 },
  { cidade: 'Uruguaiana',           uf: 'RS', i1:  91, i5: 113, i25: 145 },
];

export const UFS_NBR = Array.from(
  new Set(NBR10844_TABELA5.map((c) => c.uf)),
).sort();

export function cidadesPorUF(uf: string): NbrCidade[] {
  return NBR10844_TABELA5
    .filter((c) => c.uf === uf)
    .sort((a, b) => a.cidade.localeCompare(b.cidade, 'pt-BR'));
}

export function buscarCidadeNBR(cidade: string, uf: string): NbrCidade | null {
  const norm = (s: string) =>
    s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  const alvo = norm(cidade);
  return (
    NBR10844_TABELA5.find((c) => c.uf === uf && norm(c.cidade) === alvo) ??
    null
  );
}

export function intensidadePorTR(c: NbrCidade, TR: number): number | null {
  if (TR <= 1) return c.i1;
  if (TR <= 5) return c.i5;
  if (TR <= 25) return c.i25;
  return c.i25; // acima de 25 anos, NBR não tabela — usuário usa curva IDF local
}
