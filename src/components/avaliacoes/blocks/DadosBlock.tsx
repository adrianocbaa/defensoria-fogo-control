import { useState } from 'react';
import { Pencil, Plus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AvaliacaoCtx } from '../useAvaliacao';
import { useAvalQuery } from '../useAvaliacao';
import { ImpactDialog, type PendingChange } from '../ImpactDialog';
import { db, rpc } from '@/lib/avaliacao/api';
import { avalErrorMessage } from '@/lib/avaliacao/errors';
import { PAPEL_LABEL, VALOR_ADM_LABEL, fmtDate, fmtMoney } from '@/lib/avaliacao/labels';
import { camposInvalidos, montarAlteracoes, paraFormulario, type CampoEdicao } from '@/lib/avaliacao/edicao';

const parseMoney = (s: string) => {
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

export function DadosBlock({ ctx }: { ctx: AvaliacaoCtx }) {
  const av = ctx.avaliacao.data!;
  const [change, setChange] = useState<PendingChange | null>(null);
  const [changes, setChanges] = useState<PendingChange[] | null>(null);
  const [edit, setEdit] = useState<{ campo: string; rotulo: string; valor: string } | null>(null);
  const [novoValor, setNovoValor] = useState<{ tipo: string; valor: string; data: string; obs: string } | null>(null);
  const [editValor, setEditValor] = useState<{ row: any; form: Record<string, string> } | null>(null);
  const [membro, setMembro] = useState<{ user: string; papel: string } | null>(null);
  const [cancelar, setCancelar] = useState<string | null>(null);

  const valores = useAvalQuery(av.id, 'valores-adm', async () => {
    const { data, error } = await db.from('avaliacao_valores_administrativos').select('*').eq('avaliacao_id', av.id).eq('ativo', true).order('created_at');
    if (error) throw error;
    return data as any[];
  });
  const membros = useAvalQuery(av.id, 'membros', async () => {
    const { data, error } = await db.from('avaliacao_membros').select('*').eq('avaliacao_id', av.id).eq('ativo', true);
    if (error) throw error;
    return data as any[];
  });
  const tecnicos = useAvalQuery(av.id, 'tecnicos', () => rpc<{ user_id: string; display_name: string }[]>('aval_list_tecnicos', {}));
  const nome = (u: string) => (tecnicos.data ?? []).find((t) => t.user_id === u)?.display_name ?? 'Usuário';
  const canEdit = ctx.can('evaluation.edit');
  const canTeam = ctx.ativa && (ctx.perms.data?.has('evaluation.cancel') ?? false);

  const addValor = async () => {
    if (!novoValor) return;
    const v = parseMoney(novoValor.valor);
    if (!(v > 0)) { toast.error('Informe um valor válido.'); return; }
    const { error } = await db.from('avaliacao_valores_administrativos').insert({
      avaliacao_id: av.id, tipo: novoValor.tipo, valor: v, data_referencia: novoValor.data || null, observacao: novoValor.obs.trim() || null,
    });
    if (error) { toast.error(avalErrorMessage(error)); return; }
    toast.success('Valor registrado.');
    setNovoValor(null);
    ctx.refresh();
  };
  const saveMembro = async () => {
    if (!membro?.user) return;
    try { await rpc('aval_set_member', { p_avaliacao: av.id, p_user: membro.user, p_papel: membro.papel, p_ativo: true }); toast.success('Equipe atualizada.'); setMembro(null); ctx.refresh(); }
    catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const removeMembro = async (m: any) => {
    try { await rpc('aval_set_member', { p_avaliacao: av.id, p_user: m.user_id, p_papel: m.papel, p_ativo: false }); ctx.refresh(); }
    catch (e) { toast.error(avalErrorMessage(e)); }
  };
  const doCancel = async () => {
    try { await rpc('aval_cancel', { p_avaliacao: av.id, p_motivo: cancelar }); toast.success('Avaliação cancelada. O número não será reutilizado.'); setCancelar(null); ctx.refresh(); }
    catch (e) { toast.error(avalErrorMessage(e)); }
  };

  const camposValor = (id: string): CampoEdicao[] => [
    { chave: 'tipo', entity_type: 'valor_administrativo', entity_id: id, campo: 'tipo', rotulo: 'Tipo do valor', tipo: 'opcao', opcoes: VALOR_ADM_LABEL },
    { chave: 'valor', entity_type: 'valor_administrativo', entity_id: id, campo: 'valor', rotulo: 'Valor mensal', tipo: 'numero', casas: 2, prefixo: 'R$' },
    { chave: 'data_referencia', entity_type: 'valor_administrativo', entity_id: id, campo: 'data_referencia', rotulo: 'Data de referência', tipo: 'data' },
    { chave: 'observacao', entity_type: 'valor_administrativo', entity_id: id, campo: 'observacao', rotulo: 'Observação', tipo: 'texto' },
  ];
  const abrirValor = (v: any) => {
    const form: Record<string, string> = {};
    for (const c of camposValor(v.id)) form[c.chave] = paraFormulario(c.tipo, v[c.chave]);
    setEditValor({ row: v, form });
  };
  const revisarValor = () => {
    if (!editValor) return;
    const cs = camposValor(editValor.row.id);
    if (camposInvalidos(cs, editValor.form).length || !(parseMoney(editValor.form.valor || '') > 0)) { toast.error('Informe um valor mensal válido.'); return; }
    const lote = montarAlteracoes(cs, editValor.row, editValor.form);
    if (!lote.length) { toast.info('Nenhum campo foi alterado.'); return; }
    setChanges(lote);
  };

  const campos: { campo: string; rotulo: string; valor: string | null }[] = [
    { campo: 'processo_administrativo', rotulo: 'Processo administrativo', valor: av.processo_administrativo },
    { campo: 'numero_contrato', rotulo: 'Número do contrato', valor: av.numero_contrato },
    { campo: 'observacao', rotulo: 'Observação', valor: av.observacao },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Dados administrativos</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {campos.map((c) => (
            <div key={c.campo} className="flex items-start justify-between gap-3">
              <div><p className="text-muted-foreground">{c.rotulo}</p><p className="font-medium whitespace-pre-wrap">{c.valor || 'Não informado'}</p></div>
              {canEdit && <Button size="icon" variant="ghost" aria-label={`Editar ${c.rotulo}`} onClick={() => setEdit({ campo: c.campo, rotulo: c.rotulo, valor: c.valor ?? '' })}><Pencil className="h-4 w-4" /></Button>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Valores administrativos</CardTitle>
          {canEdit && <Button size="sm" variant="outline" onClick={() => setNovoValor({ tipo: av.tipo === 'NOVA_LOCACAO' ? 'SOLICITADO_PROPRIETARIO' : 'CONTRATO_ATUAL', valor: '', data: '', obs: '' })}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>}
        </CardHeader>
        <CardContent className="text-sm">
          {(valores.data ?? []).length === 0 ? <p className="text-muted-foreground">Nenhum valor informado.</p> : (
            <ul className="divide-y">
              {(valores.data ?? []).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                  <div><p className="font-medium">{VALOR_ADM_LABEL[v.tipo]}</p><p className="text-xs text-muted-foreground">Referência: {fmtDate(v.data_referencia)}{v.observacao ? ` · ${v.observacao}` : ''}</p></div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold tabular-nums">{fmtMoney(v.valor)}</span>
                    {canEdit && <Button size="icon" variant="ghost" aria-label={`Editar ${VALOR_ADM_LABEL[v.tipo] ?? 'valor administrativo'}`} title="Editar valor administrativo" onClick={() => abrirValor(v)}><Pencil className="h-4 w-4" /></Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Equipe da avaliação</CardTitle>
          {canTeam && <Button size="sm" variant="outline" onClick={() => setMembro({ user: '', papel: 'COLABORADOR' })}><UserPlus className="h-4 w-4 mr-1" />Adicionar</Button>}
        </CardHeader>
        <CardContent className="text-sm">
          <ul className="divide-y">
            {(membros.data ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                <span className="font-medium">{nome(m.user_id)}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={m.papel === 'RESPONSAVEL_TECNICO' ? 'default' : 'outline'}>{PAPEL_LABEL[m.papel]}</Badge>
                  {canTeam && m.papel !== 'RESPONSAVEL_TECNICO' && <Button size="sm" variant="ghost" onClick={() => removeMembro(m)}>Remover</Button>}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">Responsável técnico decide, aceita e emite. Colaborador edita. Revisor aprova seções do laudo.</p>
        </CardContent>
      </Card>

      {canTeam && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Cancelamento</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">Cancelar encerra a avaliação. O histórico é mantido e o número não é reutilizado.</p>
            <Button variant="outline" className="text-destructive" onClick={() => setCancelar('')}>Cancelar avaliação</Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.rotulo}</DialogTitle></DialogHeader>
          {edit?.campo === 'observacao'
            ? <Textarea value={edit.valor} onChange={(e) => setEdit({ ...edit, valor: e.target.value })} rows={4} maxLength={2000} />
            : <Input value={edit?.valor ?? ''} onChange={(e) => edit && setEdit({ ...edit, valor: e.target.value })} maxLength={120} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={() => { if (edit) { setChange({ entity_type: 'avaliacao', entity_id: av.id, campo: edit.campo, valor: edit.valor, rotulo: edit.rotulo }); setEdit(null); } }}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editValor} onOpenChange={(o) => !o && setEditValor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar valor administrativo</DialogTitle></DialogHeader>
          {editValor && (() => {
            const set = (k: string) => (v: string) => setEditValor({ ...editValor, form: { ...editValor.form, [k]: v } });
            return (
              <div className="grid gap-3">
                <div className="grid gap-2"><Label>Tipo do valor</Label>
                  <Select value={editValor.form.tipo} onValueChange={set('tipo')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(VALOR_ADM_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label htmlFor="ev-valor">Valor mensal (R$)</Label><Input id="ev-valor" inputMode="decimal" value={editValor.form.valor} onChange={(e) => set('valor')(e.target.value)} placeholder="0,00" /></div>
                <div className="grid gap-2"><Label htmlFor="ev-data">Data de referência</Label><Input id="ev-data" type="date" value={editValor.form.data_referencia} onChange={(e) => set('data_referencia')(e.target.value)} /></div>
                <div className="grid gap-2"><Label htmlFor="ev-obs">Observação</Label><Textarea id="ev-obs" value={editValor.form.observacao} onChange={(e) => set('observacao')(e.target.value)} rows={2} maxLength={300} /></div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditValor(null)}>Cancelar</Button>
            <Button onClick={revisarValor}>Revisar alterações</Button>
          </DialogFooter>
          <ImpactDialog avaliacaoId={av.id} changes={changes} titulo="Revisar alterações do valor administrativo"
            onClose={() => setChanges(null)} onApplied={() => { setEditValor(null); ctx.refresh(); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!novoValor} onOpenChange={(o) => !o && setNovoValor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo valor administrativo</DialogTitle></DialogHeader>
          {novoValor && (
            <div className="grid gap-3">
              <div className="grid gap-2"><Label>Tipo</Label>
                <Select value={novoValor.tipo} onValueChange={(t) => setNovoValor({ ...novoValor, tipo: t })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(VALOR_ADM_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label htmlFor="va-valor">Valor mensal (R$)</Label><Input id="va-valor" inputMode="decimal" value={novoValor.valor} onChange={(e) => setNovoValor({ ...novoValor, valor: e.target.value })} placeholder="0,00" /></div>
              <div className="grid gap-2"><Label htmlFor="va-data">Data de referência</Label><Input id="va-data" type="date" value={novoValor.data} onChange={(e) => setNovoValor({ ...novoValor, data: e.target.value })} /></div>
              <div className="grid gap-2"><Label htmlFor="va-obs">Observação</Label><Input id="va-obs" value={novoValor.obs} onChange={(e) => setNovoValor({ ...novoValor, obs: e.target.value })} maxLength={300} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setNovoValor(null)}>Cancelar</Button><Button onClick={addValor}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!membro} onOpenChange={(o) => !o && setMembro(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar à equipe</DialogTitle></DialogHeader>
          {membro && (
            <div className="grid gap-3">
              <Select value={membro.user} onValueChange={(u) => setMembro({ ...membro, user: u })}>
                <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                <SelectContent>{(tecnicos.data ?? []).map((t) => <SelectItem key={t.user_id} value={t.user_id}>{t.display_name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={membro.papel} onValueChange={(p) => setMembro({ ...membro, papel: p })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PAPEL_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
              {membro.papel === 'RESPONSAVEL_TECNICO' && <p className="text-xs text-muted-foreground">O responsável técnico atual será substituído.</p>}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setMembro(null)}>Cancelar</Button><Button onClick={saveMembro}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelar !== null} onOpenChange={(o) => !o && setCancelar(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar avaliação {av.codigo}</DialogTitle></DialogHeader>
          <Label htmlFor="cancel-motivo">Motivo (obrigatório)</Label>
          <Textarea id="cancel-motivo" value={cancelar ?? ''} onChange={(e) => setCancelar(e.target.value)} rows={3} maxLength={1000} />
          <DialogFooter><Button variant="outline" onClick={() => setCancelar(null)}>Voltar</Button><Button variant="destructive" onClick={doCancel}>Confirmar cancelamento</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ImpactDialog avaliacaoId={av.id} change={change} onClose={() => setChange(null)} onApplied={ctx.refresh} />
    </div>
  );
}
