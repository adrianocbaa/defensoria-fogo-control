import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { db, rpc } from '@/lib/avaliacao/api';
import { AUDIT_EVENT_LABEL, NIVEL_IMPACTO_LABEL, fmtDateTime } from '@/lib/avaliacao/labels';

function detalhe(ev: any): string {
  const d = ev.details_json ?? {};
  switch (ev.event_type) {
    case 'INVALIDATION_APPLIED': return `${NIVEL_IMPACTO_LABEL[d.nivel] ?? ''}${d.motivo ? ` — ${d.motivo}` : ''}`;
    case 'CHANGE_APPLIED': return `Campo ${d.campo}${d.motivo ? ` — ${d.motivo}` : ''}`;
    case 'EVALUATION_CANCELLED': return d.motivo ?? '';
    case 'DATASET_FROZEN': return `Versão ${d.versao}, ${d.amostras} amostras`;
    case 'REPORT_ISSUED': return d.codigo ?? '';
    case 'REPORT_REVISION_CREATED': return `Revisão ${String(d.revisao).padStart(2, '0')} — ${d.motivo ?? ''}`;
    case 'MEMBER_CHANGED': return `${d.papel}${d.ativo === false ? ' (removido)' : ''}`;
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
                <p className="text-sm font-medium">{AUDIT_EVENT_LABEL[ev.event_type] ?? ev.event_type}</p>
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
