import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, FileDown, FileText, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RESPONSABILIDADE_LABEL,
  RESULTADO_LABEL,
  TEXTO_CIENCIA,
  formatarDataHora,
  type Resultado,
} from '@/lib/entrega/constants';
import { RESULTADO_TONE } from '@/lib/entrega/ui';
import { ImpactoBadge } from './EntregaBadges';
import type { ResumoEntrega } from '@/lib/entrega/resultado';
import type { EntregaPendencia, EntregaVistoria } from '@/hooks/useEntregaInstitucional';

interface Props {
  entrega: EntregaVistoria;
  resumo: ResumoEntrega;
  pendenciasAbertas: EntregaPendencia[];
  nomeAmbiente: (id: string | null) => string;
  somenteLeitura: boolean;
  exportando: boolean;
  onRegistrarCiencia: (observacoes: string) => Promise<void>;
  onExportarTermo: () => void;
  onExportarFotografico: () => void;
}

export function EntregaResultadoView({
  entrega,
  resumo,
  pendenciasAbertas,
  nomeAmbiente,
  somenteLeitura,
  exportando,
  onRegistrarCiencia,
  onExportarTermo,
  onExportarFotografico,
}: Props) {
  const congelado = entrega.resultado_congelado as Resultado | null;
  const resultado: Resultado = congelado ?? resumo.resultado;
  const tone = RESULTADO_TONE[resultado];
  const formalizada = !!entrega.ciencia_em;

  const [aceite, setAceite] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  const podeFormalizar =
    !formalizada &&
    !somenteLeitura &&
    (resumo.resultado === 'apto' || resumo.resultado === 'apto_com_ressalvas');

  const bloqueio =
    resumo.resultado === 'incompleta'
      ? `Existem ${resumo.naoVistoriados} verificação(ões) não vistoriada(s). Conclua o checklist para liberar a formalização.`
      : resumo.resultado === 'nao_apto'
        ? `Existem ${resumo.impeditivasAbertas} pendência(s) impeditiva(s) em aberto. A entrega só pode ser formalizada após a correção e reinspeção.`
        : null;

  const confirmar = async () => {
    setSalvando(true);
    await onRegistrarCiencia(observacoes.trim());
    setSalvando(false);
  };

  return (
    <div className="space-y-4">
      <Card className={cn('border-2 p-6', tone.card)}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Resultado {congelado ? 'formalizado' : 'calculado automaticamente'}
        </p>
        <h2 className={cn('mt-1 text-2xl font-black leading-tight sm:text-3xl', tone.titulo)}>
          {RESULTADO_LABEL[resultado]}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          O resultado deriva das verificações e das pendências registradas — não é escolhido
          manualmente. Pendências impeditivas em aberto tornam a edificação Não Apta.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Ambientes vistoriados', valor: resumo.ambientes },
            { label: 'Verificações', valor: resumo.verificacoes },
            { label: 'Pendências abertas', valor: resumo.pendenciasAbertas },
            { label: 'Impeditivas', valor: resumo.impeditivasAbertas },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border bg-background/70 p-3">
              <p className="text-2xl font-black">{m.valor}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-base font-bold">Pendências por responsabilidade</h3>
          <ul className="mt-3 space-y-2">
            {Object.entries(resumo.porResponsabilidade).map(([chave, qtd]) => (
              <li key={chave} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {RESPONSABILIDADE_LABEL[chave as keyof typeof RESPONSABILIDADE_LABEL]}
                </span>
                <span className="font-bold">{qtd}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 border-t pt-2 text-sm">
              <span className="text-muted-foreground">Sanadas</span>
              <span className="font-bold">{resumo.sanadas}</span>
            </li>
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-bold">Ressalvas que constarão do termo</h3>
          <div className="mt-3 space-y-2">
            {pendenciasAbertas.map((p) => (
              <div key={p.id} className="rounded-lg border p-2.5">
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 text-sm font-semibold">{p.titulo}</span>
                  <ImpactoBadge impacto={p.impacto} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {nomeAmbiente(p.ambiente_id)} · {RESPONSABILIDADE_LABEL[p.responsabilidade]}
                </p>
              </div>
            ))}
            {pendenciasAbertas.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma ressalva — todos os itens estão conformes.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <ShieldCheck className="h-4 w-4" /> Ciência da Administração
        </h3>

        {formalizada ? (
          <div className="mt-3 space-y-2 rounded-xl border bg-muted/40 p-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Lock className="h-4 w-4" /> Entrega formalizada em{' '}
              {formatarDataHora(entrega.ciencia_em)}
            </p>
            <p className="text-sm text-muted-foreground">
              Resultado congelado: <strong>{RESULTADO_LABEL[resultado]}</strong>. Correções
              posteriores não alteram este registro histórico.
            </p>
            {entrega.ciencia_observacoes && (
              <p className="text-sm">{entrega.ciencia_observacoes}</p>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <p className="rounded-xl border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
              {TEXTO_CIENCIA}
            </p>

            {bloqueio && (
              <p className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {bloqueio}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ciencia-obs">Observações da Administração (opcional)</Label>
              <Textarea
                id="ciencia-obs"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                disabled={!podeFormalizar}
              />
            </div>

            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={aceite}
                onCheckedChange={(v) => setAceite(v === true)}
                disabled={!podeFormalizar}
                className="mt-0.5"
              />
              <span>
                Declaro a ciência da Administração quanto ao resultado{' '}
                <strong>{RESULTADO_LABEL[resumo.resultado]}</strong> e às ressalvas registradas.
              </span>
            </label>

            <Button
              className="h-12 w-full sm:w-auto"
              disabled={!podeFormalizar || !aceite || salvando}
              onClick={confirmar}
            >
              {salvando ? 'Registrando...' : 'Registrar ciência e formalizar entrega'}
            </Button>
          </div>
        )}
      </Card>

      <Card className="flex flex-wrap gap-2 p-5">
        <div className="mr-auto">
          <h3 className="text-base font-bold">Documentos</h3>
          <p className="text-xs text-muted-foreground">
            Termo de Entrega Institucional e Relatório Fotográfico em PDF.
          </p>
        </div>
        <Button variant="outline" className="h-11" disabled={exportando} onClick={onExportarTermo}>
          <FileText className="mr-2 h-4 w-4" /> Termo de Entrega
        </Button>
        <Button
          variant="outline"
          className="h-11"
          disabled={exportando}
          onClick={onExportarFotografico}
        >
          <FileDown className="mr-2 h-4 w-4" /> Relatório Fotográfico
        </Button>
      </Card>
    </div>
  );
}
