import catalog from '@/data/municipios.json';

// IBGE Localidades v1; downloaded only in development by prepare-municipal-geography.py.
export interface Municipio { ibge: string; nome: string }
const municipalities = catalog as Record<string, Municipio[]>;
export function municipiosDaUf(uf: string | null | undefined): Municipio[] {
  return municipalities[uf?.trim().toUpperCase() ?? ''] ?? [];
}
export function municipioDaUf(uf: string | null | undefined, code: string | null | undefined): Municipio | null {
  return municipiosDaUf(uf).find(m => m.ibge === code?.trim()) ?? null;
}
export function municipioAposTrocaUf(uf: string, code: string, nome: string) {
  const match = municipioDaUf(uf, code);
  return match ? { municipio_ibge: match.ibge, municipio_nome: match.nome } : { municipio_ibge: '', municipio_nome: '' };
}