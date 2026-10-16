// Lista fixa das 27 unidades federativas brasileiras (sem dependência externa).
export const UFS: { sigla: string; nome: string }[] = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

export type AbrangenciaGeografica = 'municipal' | 'estadual' | 'nacional';

export const ABRANGENCIA_LABELS: Record<AbrangenciaGeografica, string> = {
  municipal: 'Municipal',
  estadual: 'Estadual',
  nacional: 'Nacional',
};

// Normaliza o escopo para persistência: limpa campos incompatíveis com a abrangência.
export function normalizarEscopo(
  abrangencia: AbrangenciaGeografica | '',
  uf: string,
  municipioIbge: string,
  municipioNome: string,
) {
  if (!abrangencia) {
    return { abrangencia_geografica: null, uf: null, municipio_ibge: null, municipio_nome: null };
  }
  if (abrangencia === 'nacional') {
    return { abrangencia_geografica: abrangencia, uf: null, municipio_ibge: null, municipio_nome: null };
  }
  if (abrangencia === 'estadual') {
    return { abrangencia_geografica: abrangencia, uf: uf || null, municipio_ibge: null, municipio_nome: null };
  }
  return {
    abrangencia_geografica: abrangencia,
    uf: uf || null,
    municipio_ibge: municipioIbge.trim() || null,
    municipio_nome: municipioNome.trim() || null,
  };
}

// Valida o escopo; retorna mensagem de erro ou null se válido.
export function validarEscopo(
  abrangencia: AbrangenciaGeografica | '',
  uf: string,
  municipioIbge: string,
  municipioNome: string,
): string | null {
  if (!abrangencia) return null; // escopo opcional nesta fase
  if (abrangencia === 'nacional') return null;
  if (!uf) return 'Informe a UF para abrangência municipal/estadual.';
  if (abrangencia === 'municipal') {
    if (!municipioIbge.trim()) return 'Informe o código IBGE do município.';
    if (!/^\d{7}$/.test(municipioIbge.trim())) return 'Código IBGE deve ter 7 dígitos.';
    if (!municipioNome.trim()) return 'Informe o nome do município.';
  }
  return null;
}
