import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAvalQuery } from './useAvaliacao';
import { rpc } from '@/lib/avaliacao/api';
import { codigoExibicao, exibirValor, fonteLabel, type CampoDinamico, type VarStatus, type VariaveisStatus } from '@/lib/avaliacao/variaveis';

/** Completude das variáveis lida das fontes (avaliando e cada amostra). */
export function useVariaveisStatus(avaliacaoId: string | undefined) {
  return useAvalQuery(avaliacaoId, 'variaveis-status', () => rpc<VariaveisStatus>('aval_variaveis_status', { p_avaliacao: avaliacaoId }));
}

const NONE = '__none';
const OPCOES_BOOL: Record<string, string> = { true: 'Sim', false: 'Não' };
const OPCOES_STATUS: Record<string, string> = { POSSUI: 'Possui', NAO_POSSUI: 'Não possui', NAO_VERIFICADO: 'Não verificado' };

/** Campo de entrada conforme o tipo da característica (número, categoria, sim/não, possui/não possui). */
export function VariavelInput({ v, id, value, onChange, disabled }: { v: VarStatus; id: string; value: string; onChange: (s: string) => void; disabled?: boolean }) {
  const opcoes = v.fonte === 'ATRIBUTO'
    ? v.data_type === 'CATEGORY' ? Object.fromEntries((v.opcoes ?? []).map((o) => [o, o.charAt(0) + o.slice(1).toLowerCase().replace(/_/g, ' ')]))
      : v.data_type === 'BOOL' ? OPCOES_BOOL : v.data_type === 'STATUS' ? OPCOES_STATUS : null
    : null;
  if (opcoes) {
    return (
      <Select value={value || NONE} onValueChange={(s) => onChange(s === NONE ? '' : s)} disabled={disabled}>
        <SelectTrigger id={id} aria-label={v.nome}><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value={NONE}>Não informado</SelectItem>{Object.entries(opcoes).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
      </Select>
    );
  }
  return (
    <div className="relative">
      <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={v.unidade ? 'pr-14' : undefined} />
      {v.unidade && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{v.unidade}</span>}
    </div>
  );
}

/** Seção com os campos que as variáveis desta avaliação exigem. Campos que já existem no formulário aparecem como referência. */
export function CamposDinamicosSection({ campos, form, onChange, referencias = {}, idPrefix, disabled, vazio }: {
  campos: CampoDinamico[]; form: Record<string, string>; onChange: (id: string, s: string) => void;
  referencias?: Record<string, number | null | undefined>; idPrefix: string; disabled?: boolean; vazio?: React.ReactNode;
}) {
  if (!campos.length) return <>{vazio ?? null}</>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {campos.map(({ variavel: v, editavel, obrigatoria }) => {
        const fid = `${idPrefix}-${v.id}`;
        const ref = referencias[v.id];
        const falta = obrigatoria && (editavel ? !String(form[v.id] ?? '').trim() : ref === null || ref === undefined);
        return (
          <div key={v.id} className="grid gap-1.5">
            <Label htmlFor={editavel ? fid : undefined} className="flex items-center gap-1.5">
              {v.nome}{obrigatoria && <span aria-hidden className="text-destructive">*</span>}
              {falta && <span className="ml-auto inline-flex items-center gap-1 text-xs font-normal text-destructive"><AlertTriangle className="h-3 w-3" aria-hidden />Falta</span>}
            </Label>
            {editavel ? <VariavelInput v={v} id={fid} value={form[v.id] ?? ''} onChange={(s) => onChange(v.id, s)} disabled={disabled} /> : (
              <div className="flex min-h-10 items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 text-sm">
                <span className="tabular-nums">{exibirValor(v, ref ?? null)}</span>
                <span className="text-xs text-muted-foreground text-right">{v.fonte === 'MERCADO' ? 'vem do valor informado acima' : 'vem do cadastro do imóvel'}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Variável | Avaliando | Amostras completas. */
export function CompletudeTable({ st }: { st: VariaveisStatus }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Variável</TableHead><TableHead>Avaliando</TableHead><TableHead className="text-right">Amostras completas</TableHead></TableRow></TableHeader>
      <TableBody>{st.variaveis.map((v) => {
        const avFalta = v.precisa_avaliando && v.obrigatoria && (v.valor_avaliando === null || v.valor_avaliando === undefined);
        const amFalta = v.obrigatoria && v.amostras_total > 0 && v.amostras_completas < v.amostras_total;
        return (
          <TableRow key={v.id}>
            <TableCell><p className="font-medium">{v.nome}</p><p className="text-xs text-muted-foreground">{codigoExibicao(v.codigo)} · {fonteLabel(v)}</p></TableCell>
            <TableCell className="tabular-nums">{!v.precisa_avaliando ? <span className="text-muted-foreground">N/A</span>
              : avFalta ? <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />Falta</span> : exibirValor(v, v.valor_avaliando)}</TableCell>
            <TableCell className="text-right tabular-nums">
              <span className={`inline-flex items-center gap-1 ${amFalta ? 'text-destructive' : ''}`}>{v.amostras_completas}/{v.amostras_total}
                {amFalta ? <AlertTriangle className="h-3.5 w-3.5" aria-label="Incompleta" /> : v.amostras_total > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-label="Completa" />}</span>
            </TableCell>
          </TableRow>
        );
      })}</TableBody>
    </Table>
  );
}
