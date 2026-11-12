import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { db, rpc } from '@/lib/avaliacao/api';
import { AUDIT_EVENT_LABEL, NIVEL_IMPACTO_LABEL, fmtDateTime } from '@/lib/avaliacao/labels';

const CAMPO_LABEL: Record<string, string> = {
  tipo: 'Tipo', valor: 'Valor', data_referencia: 'Data de referência', observacao: 'Observação', processo_administrativo: 'Processo administrativo',
  numero_contrato: 'Número do contrato', tipo_imovel: 'Tipo de imóvel', endereco: 'Endereço', numero: 'Número', complemento: 'Complemento', bairro: 'Bairro',
  area_construida: 'Área construída', area_terreno: 'Área do terreno', anuncio_url: 'Link do anúncio', url_anuncio: 'Link do anúncio', anuncio_id: 'Código do anúncio',
  precisao: 'Precisão da localização', latitude: 'Latitude', longitude: 'Longitude', natureza_dado: 'Natureza', valor_ofertado: 'Valor ofertado',
  valor_utilizado: 'Valor utilizado', valor_unitario: 'Valor unitário', data_observacao: 'Data da observação', origem_territorial: 'Origem territorial',
  fonte: 'Fonte principal', imovel_id: 'Imóvel da amostra', relacao_esperada: 'Relação esperada', tipo_variavel: 'Tipo da variável', categorica: 'Categórica',
};
function valorHist(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') { const o = v as Record<string, unknown>; return o.nome ? String(o.nome) : JSON.stringify(v); }
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(s)) return 'outro cadastro';
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

function detalhe(ev: any): string {
  const d = ev.details_json ?? {};
  switch (ev.event_type) {
    case 'INVALIDATION_APPLIED': return `${NIVEL_IMPACTO_LABEL[d.nivel] ?? ''}${d.motivo ? ` — ${d.motivo}` : ''}`;
    case 'CHANGE_APPLIED': return `${CAMPO_LABEL[d.campo] ?? d.campo}: ${valorHist(d.anterior)} → ${valorHist(d.novo)}${d.derivado ? ' (recalculado)' : ''}${d.motivo ? ` — ${d.motivo}` : ''}`;
    case 'CHANGES_APPLIED': return `${d.campos} campo(s) · ${NIVEL_IMPACTO_LABEL[d.nivel] ?? ''}${d.outras_avaliacoes ? ` · ${d.outras_avaliacoes} outra(s) avaliação(ões)` : ''}${d.motivo ? ` — ${d.motivo}` : ''}`;
    case 'VARIABLE_VALUE_SYNCED': return `${d.variavel}: ${valorHist(d.anterior)} → ${valorHist(d.novo)}`;
    case 'SHARED_RECORD_CHANGED': return `Origem: ${d.origem_avaliacao} · ${NIVEL_IMPACTO_LABEL[d.nivel] ?? ''}`;
    case 'EVALUATION_CANCELLED': return d.motivo ?? '';
    case 'DATASET_FROZEN': return `Versão ${d.versao}, ${d.amostras} amostras`;
    case 'REPORT_ISSUED': return d.codigo ?? '';
    case 'REPORT_REVISION_CREATED': return `Revisão ${String(d.revisao).padStart(2, '0')} — ${d.motivo ?? ''}`;
    case 'MEMBER_CHANGED': return `${d.papel}${d.ativo === false ? ' (removido)' : ''}`;
    case 'MODEL_WITHDRAWN_FROM_VALIDATION': return `Em validação → Calculado${d.motivo ? ` — ${d.motivo}` : ''}${d.aceite_revogado ? ' · aceite revogado (mantido no histórico)' : ''} · ${d.validacoes_preservadas ?? 0} validação(ões) preservada(s)`;
    case 'MODEL_RESENT_TO_VALIDATION': return 'Calculado → Em validação';
    case 'VALIDATION_MARKED_STALE': return `${d.motivo ?? 'Configuração alterada'} · coeficientes preservados`;
    case 'MODEL_REVALIDATED': return 'Mesmo modelo e mesmos coeficientes; a validação anterior continua registrada.';
    case 'MODELS_ARCHIVED': return `${d.quantidade} modelo(s)${d.protegidos ? ` · ${d.protegidos} protegido(s)` : ''}`;
    default: return '';
  }
}

export function HistoricoBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const id = ctx.avaliacao.data!.id;
  const tecnicos = useAvalQuery(id, 'tecnicos', () => rpc<{ user_id: string; display_name: string }[]>('aval_list_tecnicos', {}));
  const eventos = useAvalQuery(id, 'historico', async () => {
    const { data, error } = await db.from('audit_events').select('id, event_type, entity_type, actor_id, details_json, created_at')
      .eq('avaliacao_id', id).order('created_at', { ascending: false }).limit(10000);
    if (error) throw error;
    return data as any[];
  });
  const nome = (uid: string | null) => (tecnicos.data ?? []).find((t) => t.user_id === uid)?.display_name ?? (uid ? 'Usuário' : 'Sistema');
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Histórico auditável</CardTitle></CardHeader>
      <CardContent>
        {(eventos.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Sem eventos.</p> : (
          <ol className="relative border-l pl-5 space-y-4">
            {(eventos.data ?? []).map((ev) => (
              <li key={ev.id}>
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border bg-background" aria-hidden />
                <p className="text-sm font-medium">{ev.event_type === 'CHANGE_APPLIED' && ev.details_json?.campo === 'relacao_esperada' ? 'Relação esperada alterada' : AUDIT_EVENT_LABEL[ev.event_type] ?? ev.event_type}</p>
                <p className="text-xs text-muted-foreground">{fmtDateTime(ev.created_at)} · {nome(ev.actor_id)}</p>
                {detalhe(ev) && <p className="text-sm mt-0.5">{detalhe(ev)}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
