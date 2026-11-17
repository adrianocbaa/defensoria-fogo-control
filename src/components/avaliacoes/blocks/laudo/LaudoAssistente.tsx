import { useEffect, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, Eye, MessageSquare, Send, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAvalQuery } from '../../useAvaliacao';
import { EngineCallError, db, engine, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { fmtDateTime } from '@/lib/avaliacao/labels';
import { FATOS_POR_TOPICO, FATO_LABEL, type Pergunta, perguntasPendentes } from '@/lib/avaliacao/laudoDif';

const AI_STATUS: Record<string, string> = { PROPOSTO: 'Proposta', APROVADO: 'Aprovada', DESCARTADO: 'Descartada' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Secao = Record<string, any>;

export function LaudoAssistente({ avaliacaoId, secao, fatos, canEdit, dirty, onChanged, onVerContexto }: {
  avaliacaoId: string; secao: Secao; fatos: Record<string, string>; canEdit: boolean; dirty: boolean;
  onChanged: () => void; onVerContexto: (c: Secao) => void;
}) {
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState('');
  const [proposta, setProposta] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { setRespostas({}); setMensagem(''); }, [secao.id]);

  const side = useAvalQuery(avaliacaoId, `laudo-assist-${secao.id}`, async () => {
    const [ai, msgs] = await Promise.all([
      db.from('avaliacao_ai_conteudos').select('*').eq('context_id', secao.id).order('created_at', { ascending: false }).limit(10),
      db.from('laudo_secao_mensagens').select('id, papel, conteudo, perguntas, ai_conteudo_id, created_at').eq('secao_id', secao.id).order('created_at', { ascending: true }).limit(60),
    ]);
    return { ai: (ai.data ?? []) as Secao[], msgs: (msgs.data ?? []) as Secao[] };
  });

  const perguntas = (secao.perguntas ?? []) as Pergunta[];
  const salvas = (secao.respostas ?? {}) as Record<string, string>;
  const atuais = { ...salvas, ...respostas };
  const pend = perguntasPendentes(perguntas, atuais, fatos);
  const chaves = FATOS_POR_TOPICO[secao.codigo] ?? [];
  const respDirty = Object.keys(respostas).some((k) => (respostas[k] ?? '') !== (salvas[k] ?? ''));
  const assistido = secao.classe === 'ASSISTIDO';

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); side.refetch(); onChanged(); return true; }
    catch (e) { toast.error(e instanceof EngineCallError ? e.message : avalErrorMessage(e)); return false; }
    finally { setBusy(null); }
  };
  const salvarRespostas = () => run('resp', async () => {
    const limpo = Object.fromEntries(Object.entries(atuais).map(([k, v]) => [k, String(v ?? '').trim()]).filter(([, v]) => v));
    const { error } = await db.from('laudo_secoes').update({ respostas: limpo }).eq('id', secao.id);
    if (error) throw error;
    setRespostas({});
  }, 'Respostas registradas.');
  const pedir = (modo: 'GERAR' | 'MELHORAR', texto?: string) => run(`ai-${modo}`, async () => {
    if (dirty) throw new EngineCallError('local', 'Salve o texto do tópico antes de usar o assistente.');
    if (respDirty) throw new EngineCallError('local', 'Registre as respostas antes de pedir a proposta.');
    const r = await engine({ action: 'ai_secao', secao_id: secao.id, modo, ...(texto?.trim() ? { mensagem: texto.trim() } : {}) });
    setMensagem('');
    if (r?.perguntas?.length) toast.message('O assistente precisa de mais informações. Veja as perguntas na conversa.');
    else { toast.success('Proposta pronta para sua revisão.'); if (r?.alertas?.length) toast.warning(r.alertas.join(' ')); }
  });
  const decidir = (c: Secao, aprovar: boolean) => run(`aid-${c.id}`, async () => {
    const texto = proposta[c.id] ?? c.generated_text;
    await rpc('aval_ai_decide', { p_conteudo: c.id, p_aprovar: aprovar, p_texto: aprovar ? texto : null });
    if (aprovar) { const { error } = await db.from('laudo_secoes').update({ conteudo: texto }).eq('id', c.context_id); if (error) throw error; }
  }, aprovar ? 'Texto aprovado e aplicado ao tópico. O tópico volta a rascunho até ser aprovado.' : 'Proposta descartada.');

  if (secao.classe === 'ESTRUTURADO') {
    return <div className="rounded-lg border p-3 text-xs text-muted-foreground"><p className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1"><Bot className="h-4 w-4" aria-hidden />Assistente do tópico</p>
      Este tópico é montado somente com tabelas e valores do sistema (modelo aceito, validação e resultado confirmado). Não há redação por IA.</div>;
  }
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-medium"><Bot className="h-4 w-4" aria-hidden />Assistente do tópico</p>
      <p className="text-xs text-muted-foreground">{assistido
        ? 'Usa primeiro os dados do sistema e pergunta o que faltar. Não calcula, não decide e não digita valores protegidos. Você revisa e aprova.'
        : 'Texto institucional com dados protegidos. O assistente pode apenas melhorar a redação, sem alterar os dados.'}</p>

      {chaves.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Já registrado no sistema</p>
          <dl className="text-xs space-y-0.5">{chaves.map((k) => (
            <div key={k} className="grid grid-cols-[minmax(0,40%)_1fr] gap-2"><dt className="text-muted-foreground">{FATO_LABEL[k] ?? k}</dt>
              <dd className={fatos[k] ? '' : 'text-muted-foreground italic'}>{fatos[k] ?? 'não registrado'}</dd></div>
          ))}</dl>
        </div>
      )}

      {assistido && perguntas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium">Perguntas do tópico {pend.length > 0 && <Badge variant="outline" className="ml-1">{pend.length} pendente(s)</Badge>}</p>
          {perguntas.map((p) => {
            const doSistema = p.dado && fatos[p.dado];
            return (
              <div key={p.id} className="space-y-1">
                <Label htmlFor={`q-${secao.id}-${p.id}`} className="text-xs font-normal">{p.pergunta}{p.obrigatoria ? ' *' : ''}</Label>
                {doSistema && !atuais[p.id] && <p className="text-[11px] text-muted-foreground">Já no sistema: {fatos[p.dado!]}. Responda só para complementar.</p>}
                <Textarea id={`q-${secao.id}-${p.id}`} rows={2} className="text-xs" disabled={!canEdit} maxLength={1500}
                  value={atuais[p.id] ?? ''} onChange={(e) => setRespostas({ ...respostas, [p.id]: e.target.value })} />
              </div>
            );
          })}
          {canEdit && respDirty && <Button size="sm" variant="outline" onClick={salvarRespostas} disabled={busy === 'resp'}>Registrar respostas</Button>}
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          {assistido && <Button size="sm" variant="outline" onClick={() => pedir('GERAR')} disabled={!!busy}><Sparkles className="h-4 w-4 mr-1" />{busy === 'ai-GERAR' ? 'Gerando…' : 'Gerar proposta'}</Button>}
          <Button size="sm" variant="outline" onClick={() => pedir('MELHORAR')} disabled={!!busy || !String(secao.conteudo ?? '').trim()}><Wand2 className="h-4 w-4 mr-1" />{busy === 'ai-MELHORAR' ? 'Melhorando…' : 'Melhorar redação'}</Button>
        </div>
      )}

      {assistido && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium"><MessageSquare className="h-3.5 w-3.5" aria-hidden />Conversa do tópico</p>
          {(side.data?.msgs ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Sem mensagens. Informe o contexto local que o sistema não possui.</p> : (
            <ul className="space-y-1.5 max-h-64 overflow-auto pr-1">{side.data!.msgs.map((m) => (
              <li key={m.id} className={`rounded-md px-2 py-1.5 text-xs ${m.papel === 'USUARIO' ? 'bg-accent ml-6' : 'bg-muted mr-6'}`}>
                <p className="text-[10px] text-muted-foreground">{m.papel === 'USUARIO' ? 'Você' : 'Assistente'} · {fmtDateTime(m.created_at)}</p>
                <p className="whitespace-pre-wrap">{m.conteudo}</p>
                {Array.isArray(m.perguntas) && m.perguntas.length > 0 && <ul className="list-disc pl-4 mt-1 space-y-0.5">{m.perguntas.map((p: string) => <li key={p}>{p}</li>)}</ul>}
              </li>
            ))}</ul>
          )}
          {canEdit && (
            <div className="space-y-1.5">
              <Textarea aria-label="Mensagem ao assistente" rows={2} className="text-xs" maxLength={4000} value={mensagem} onChange={(e) => setMensagem(e.target.value)}
                placeholder="Ex.: piso cerâmico em todos os ambientes, forro de PVC, divisórias em drywall." />
              <Button size="sm" onClick={() => pedir('GERAR', mensagem)} disabled={!!busy || !mensagem.trim()}><Send className="h-4 w-4 mr-1" />Perguntar ao assistente</Button>
            </div>
          )}
        </div>
      )}

      <ul className="space-y-3">{(side.data?.ai ?? []).map((c) => (
        <li key={c.id} className="rounded-md border p-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{c.modo === 'MELHORAR' ? 'Melhoria' : 'Proposta'} · {fmtDateTime(c.created_at)}</span>
            <Badge variant={c.status === 'APROVADO' ? 'secondary' : 'outline'}>{AI_STATUS[c.status]}</Badge></div>
          {(c.alertas ?? []).map((a: string) => <p key={a} className="flex items-start gap-1 text-xs"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />{a}</p>)}
          {c.status === 'PROPOSTO' && canEdit ? (
            <>
              <Textarea aria-label="Texto proposto" rows={7} className="text-xs" value={proposta[c.id] ?? c.generated_text} onChange={(e) => setProposta({ ...proposta, [c.id]: e.target.value })} maxLength={20000} />
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" onClick={() => decidir(c, true)} disabled={busy === `aid-${c.id}`}><CheckCircle2 className="h-4 w-4 mr-1" />Aprovar texto</Button>
                <Button size="sm" variant="ghost" onClick={() => decidir(c, false)} disabled={busy === `aid-${c.id}`}>Descartar</Button>
              </div>
            </>
          ) : <p className="text-xs whitespace-pre-wrap line-clamp-4">{c.approved_text ?? c.generated_text}</p>}
          <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => onVerContexto(c)}><Eye className="h-3.5 w-3.5 mr-1" />Ver contexto utilizado</Button>
        </li>
      ))}</ul>
    </div>
  );
}
