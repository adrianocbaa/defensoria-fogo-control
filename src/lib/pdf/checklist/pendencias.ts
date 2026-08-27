import type { ChecklistAmbiente, ChecklistServico } from '@/hooks/useChecklistDinamico';
import type { ChecklistOcorrencia } from '@/hooks/useChecklistOcorrencias';

export type Gravidade = 'critico' | 'medio' | 'estetico' | null | undefined;
export type StatusChecklist = 'pendente' | 'aprovado' | 'reprovado';

/** Rótulos institucionais — gravidade e situação são dimensões separadas. */
export const GRAVIDADE_LABEL: Record<string, string> = {
  critico: 'Crítica',
  medio: 'Média',
  estetico: 'Baixa / Estética',
};

export const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
};

export function gravidadeLabel(g: Gravidade) {
  return GRAVIDADE_LABEL[g ?? 'medio'] ?? 'Média';
}

export function statusLabel(s: string) {
  return STATUS_LABEL[s] ?? s;
}

/** Indicadores discretos (usados apenas em pequenos pontos/textos). */
export function gravidadeCor(g: Gravidade): [number, number, number] {
  if (g === 'critico') return [185, 28, 28];
  if (g === 'estetico') return [110, 116, 112];
  return [176, 118, 12];
}

export function statusCor(s: string): [number, number, number] {
  if (s === 'aprovado') return [26, 95, 63];
  if (s === 'reprovado') return [185, 28, 28];
  return [176, 118, 12];
}

export interface FotoPdf {
  url: string;
  legenda: string;
}

export interface PendenciaPdf {
  /** Código determinístico gerado apenas para o PDF (não persistido). */
  codigo: string;
  origem: 'servico' | 'ocorrencia';
  ambienteId: string;
  ambienteNome: string;
  pagina: number;
  servico: string;
  titulo: string;
  gravidade: Gravidade;
  status: string;
  local?: string | null;
  /** Situação identificada em campo. */
  situacao: string;
  /** Correção solicitada — hoje não existe campo próprio no banco. */
  correcaoSolicitada: string | null;
  fotos: FotoPdf[];
  /** Nº do pin na planta, quando o serviço estiver marcado. */
  pin?: number;
}

function fotosServico(s: ChecklistServico): FotoPdf[] {
  const out: FotoPdf[] = [];
  if (s.foto_reprovacao_url) out.push({ url: s.foto_reprovacao_url, legenda: 'Situação identificada' });
  if (s.foto_correcao_url) out.push({ url: s.foto_correcao_url, legenda: 'Após a correção' });
  return out;
}

function fotosOcorrencia(o: ChecklistOcorrencia): FotoPdf[] {
  const out: FotoPdf[] = [];
  if (o.foto_reprovacao_url) out.push({ url: o.foto_reprovacao_url, legenda: 'Situação identificada' });
  if (o.foto_correcao_url) out.push({ url: o.foto_correcao_url, legenda: 'Após a correção' });
  return out;
}

/**
 * Numeração global de pins (mesma lógica do relatório anterior):
 * ordem dos ambientes → ordem dos serviços com `location_pin`.
 */
export function indicePins(ambientes: ChecklistAmbiente[]) {
  const map = new Map<string, number>();
  let n = 1;
  ambientes.forEach((a) =>
    a.servicos.forEach((s) => {
      if (s.location_pin) map.set(s.id, n++);
    }),
  );
  return map;
}

/**
 * Constrói a lista global de pendências (P-001, P-002, ...) de forma
 * determinística: ambiente → serviço reprovado → ocorrências do serviço.
 */
export function montarPendencias(
  ambientes: ChecklistAmbiente[],
  ocorrenciasPorServico: Record<string, ChecklistOcorrencia[]> = {},
): PendenciaPdf[] {
  const pins = indicePins(ambientes);
  const lista: PendenciaPdf[] = [];
  let seq = 1;
  const codigo = () => `P-${String(seq++).padStart(3, '0')}`;

  for (const amb of ambientes) {
    const servicos = [...amb.servicos].sort((a, b) => a.ordem - b.ordem);
    for (const serv of servicos) {
      const ocorrencias = [...(ocorrenciasPorServico[serv.id] ?? [])].sort((a, b) => a.ordem - b.ordem);

      if (serv.status === 'reprovado') {
        lista.push({
          codigo: codigo(),
          origem: 'servico',
          ambienteId: amb.id,
          ambienteNome: amb.nome,
          pagina: amb.pagina,
          servico: serv.descricao,
          titulo: serv.descricao,
          gravidade: serv.gravidade,
          status: serv.status,
          local: serv.location_pin ? `Planta pág. ${amb.pagina}` : null,
          situacao: serv.observacao?.trim() || serv.descricao,
          correcaoSolicitada: null,
          fotos: fotosServico(serv),
          pin: pins.get(serv.id),
        });
      }

      for (const oc of ocorrencias) {
        lista.push({
          codigo: codigo(),
          origem: 'ocorrencia',
          ambienteId: amb.id,
          ambienteNome: amb.nome,
          pagina: amb.pagina,
          servico: serv.descricao,
          titulo: oc.descricao?.trim() || `Ocorrência em ${serv.descricao}`,
          gravidade: oc.gravidade,
          status: oc.status,
          local: serv.location_pin ? `Planta pág. ${amb.pagina}` : null,
          situacao: oc.observacao?.trim() || oc.descricao?.trim() || 'Não descrita.',
          correcaoSolicitada: null,
          fotos: fotosOcorrencia(oc),
          pin: pins.get(serv.id),
        });
      }
    }
  }

  return lista;
}

export function resumoGravidade(pendencias: PendenciaPdf[]) {
  return {
    total: pendencias.length,
    criticas: pendencias.filter((p) => p.gravidade === 'critico').length,
    medias: pendencias.filter((p) => !p.gravidade || p.gravidade === 'medio').length,
    baixas: pendencias.filter((p) => p.gravidade === 'estetico').length,
  };
}

export function resumir(texto: string, max = 90) {
  const t = texto.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
