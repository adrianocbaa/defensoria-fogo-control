// O município pertence ao IMÓVEL, não ao laudo: regras puras do cadastro (sem acesso a dados).
// O município da avaliação é só a sugestão inicial; a origem territorial e a duplicidade usam o município real do imóvel.

export interface MunicipioImovel { uf: string; municipio_ibge: string; municipio_nome: string }

/** Sugestão inicial: o município da avaliação (o usuário pode trocar). */
export function municipioSugerido(av: { uf?: string | null; municipio_ibge?: string | null; municipio_nome?: string | null }): MunicipioImovel {
  return { uf: av.uf ?? '', municipio_ibge: av.municipio_ibge ?? '', municipio_nome: av.municipio_nome ?? '' };
}

/** Mesmo município → LOCAL; município diferente → MUNICIPIO_COMPARAVEL (fora do município). Sem código de um dos lados: LOCAL. */
export function origemPorMunicipio(avIbge: string | null | undefined, imovelIbge: string | null | undefined): 'LOCAL' | 'MUNICIPIO_COMPARAVEL' {
  return !avIbge || !imovelIbge || avIbge === imovelIbge ? 'LOCAL' : 'MUNICIPIO_COMPARAVEL';
}

/**
 * Origem a gravar depois de escolher o município: as duas origens automáticas acompanham o município;
 * uma origem escolhida pelo avaliador (contrato público, outra fonte) é mantida.
 */
export function origemAposTrocaMunicipio(atual: string, avIbge: string | null | undefined, imovelIbge: string | null | undefined): string {
  return atual === 'LOCAL' || atual === 'MUNICIPIO_COMPARAVEL' ? origemPorMunicipio(avIbge, imovelIbge) : atual;
}

export type SituacaoComparavel = 'MESMO_MUNICIPIO' | 'APROVADO' | 'SUGERIDO' | 'REJEITADO' | 'NAO_CADASTRADO' | 'SEM_MUNICIPIO';

const norm = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/** Situação do município do imóvel na lista de municípios comparáveis desta avaliação (código IBGE; nome+UF para registros antigos sem código). */
export function situacaoComparavel(
  av: { municipio_ibge?: string | null },
  mun: Partial<MunicipioImovel>,
  comparaveis: { municipio_ibge?: string | null; municipio_nome?: string | null; uf?: string | null; status: string }[],
): SituacaoComparavel {
  if (!mun.municipio_ibge) return 'SEM_MUNICIPIO';
  if (!av.municipio_ibge || av.municipio_ibge === mun.municipio_ibge) return 'MESMO_MUNICIPIO';
  const hit = comparaveis.filter((c) => (c.municipio_ibge ? c.municipio_ibge === mun.municipio_ibge
    : norm(c.municipio_nome) === norm(mun.municipio_nome) && norm(c.uf) === norm(mun.uf)));
  for (const s of ['APROVADO', 'SUGERIDO', 'REJEITADO'] as const) if (hit.some((c) => c.status === s)) return s;
  return 'NAO_CADASTRADO';
}

/** Mensagem da situação para o usuário (null quando é do mesmo município). */
export function mensagemComparavel(s: SituacaoComparavel, mun: Partial<MunicipioImovel>): { tom: 'ok' | 'pendente' | 'alerta'; texto: string } | null {
  const nome = `${mun.municipio_nome ?? ''}/${mun.uf ?? ''}`;
  switch (s) {
    case 'APROVADO': return { tom: 'ok', texto: `${nome} está aprovado como município comparável nesta avaliação.` };
    case 'SUGERIDO': return { tom: 'pendente', texto: `${nome} foi sugerido como município comparável e aguarda decisão do responsável técnico.` };
    case 'REJEITADO': return { tom: 'alerta', texto: `${nome} foi rejeitado como município comparável nesta avaliação. A amostra pode ser cadastrada, mas o responsável técnico precisa rever o uso.` };
    case 'NAO_CADASTRADO': return { tom: 'pendente', texto: `${nome} ainda não está na lista de municípios comparáveis. Usar dados de outro município exige justificativa e decisão do responsável técnico.` };
    default: return null;
  }
}

/** Município escolhido é válido: código IBGE de 7 dígitos, com nome e UF. */
export function municipioValido(m: Partial<MunicipioImovel>): boolean {
  return !!m.uf && !!m.municipio_nome?.trim() && /^\d{7}$/.test(m.municipio_ibge ?? '');
}

/** Campos de município do imóvel para gravar (cadastro novo) — sempre os do imóvel, nunca os do laudo. */
export function municipioParaGravar(m: Partial<MunicipioImovel>): { municipio_nome: string | null; municipio_ibge: string | null; uf: string | null } {
  return { municipio_nome: m.municipio_nome?.trim() || null, municipio_ibge: m.municipio_ibge?.trim() || null, uf: m.uf?.trim().toUpperCase() || null };
}
