import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Ban, Wrench } from 'lucide-react';
import {
  EVENTO_LABEL,
  RESPONSABILIDADE_LABEL,
  formatarDataHora,
} from '@/lib/entrega/constants';
import { ImpactoBadge, SituacaoBadge } from './EntregaBadges';
import { FotoPicker } from './FotoPicker';
import type { EntregaPendencia } from '@/hooks/useEntregaInstitucional';
import type { EntregaFoto, EntregaHistorico } from '@/hooks/useEntregaPendencias';

interface Props {
  pendencia: EntregaPendencia;
  fotos: EntregaFoto[];
  historico: EntregaHistorico[];
  nomeAmbiente: (id: string | null) => string;
  nomeGrupo: (id: string | null) => string;
  somenteLeitura: boolean;
  onRegistrarCorrecao: (p: EntregaPendencia, observacao: string, fotos: File[]) => Promise<void>;
  onCancelar: (p: EntregaPendencia, motivo: string) => Promise<void>;
}

export function EntregaPendenciaDetail({
  pendencia: p,
  fotos,
  historico,
  nomeAmbiente,
  nomeGrupo,
  somenteLeitura,
  onRegistrarCorrecao,
  onCancelar,
}: Props) {
  const [modo, setModo] = useState<'nenhum' | 'correcao'>('nenhum');
  const [observacao, setObservacao] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [motivo, setMotivo] = useState('');

  const doPendencia = fotos.filter((f) => f.pendencia_id === p.id);
  const ocorrencia = doPendencia.filter((f) => f.tipo === 'ocorrencia');
  const correcao = doPendencia.filter((f) => f.tipo === 'correcao' || f.tipo === 'reinspecao');
  const linha = historico.filter((h) => h.pendencia_id === p.id);
  const criacao = linha.find((h) => h.evento === 'criada');

  const encerrada = p.situacao === 'sanada' || p.situacao === 'cancelada';

  const salvarCorrecao = async () => {
    setSalvando(true);
    await onRegistrarCorrecao(p, observacao.trim(), arquivos);
    setSalvando(false);
    setModo('nenhum');
    setObservacao('');
    setArquivos([]);
  };

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold">{p.titulo}</h2>
          <ImpactoBadge impacto={p.impacto} />
          <SituacaoBadge situacao={p.situacao} className="ml-auto" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Localização: {nomeAmbiente(p.ambiente_id)} › {nomeGrupo(p.ambiente_grupo_id)}
        </p>
      </div>

      {p.descricao && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Descrição do desvio
          </p>
          <p className="mt-1 text-sm leading-relaxed">{p.descricao}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Responsabilidade
          </p>
          <p className="mt-1 text-sm font-semibold">
            {RESPONSABILIDADE_LABEL[p.responsabilidade]}
            {p.responsavel_terceiro ? ` — ${p.responsavel_terceiro}` : ''}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Registrado por
          </p>
          <p className="mt-1 text-sm font-semibold">{criacao?.autor_nome ?? '—'}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Data do registro
          </p>
          <p className="mt-1 text-sm font-semibold">{formatarDataHora(p.created_at)}</p>
        </div>
      </div>

      {ocorrencia.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Fotos do ocorrido ({ocorrencia.length})
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ocorrencia.map((f) =>
              f.url ? (
                <img
                  key={f.id}
                  src={f.url}
                  alt={f.legenda ?? 'Foto da ocorrência'}
                  loading="lazy"
                  className="h-28 w-full rounded-lg border object-cover"
                />
              ) : null,
            )}
          </div>
        </div>
      )}

      {correcao.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Fotos da correção ({correcao.length})
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {correcao.map((f) =>
              f.url ? (
                <img
                  key={f.id}
                  src={f.url}
                  alt={f.legenda ?? 'Foto da correção'}
                  loading="lazy"
                  className="h-28 w-full rounded-lg border object-cover"
                />
              ) : null,
            )}
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Histórico e evolução
        </p>
        <ol className="mt-2 space-y-3">
          {linha.map((h) => (
            <li key={h.id} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{EVENTO_LABEL[h.evento] ?? h.evento}</p>
                <p className="text-xs text-muted-foreground">
                  {formatarDataHora(h.created_at)}
                  {h.autor_nome ? ` por ${h.autor_nome}` : ''}
                </p>
                {h.observacao && <p className="mt-0.5 text-sm">{h.observacao}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {!somenteLeitura && !encerrada && (
        <div className="space-y-3 border-t pt-4">
          {modo === 'correcao' ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="corr-obs">Observação da correção</Label>
                <Textarea
                  id="corr-obs"
                  rows={3}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Descreva o que foi executado para corrigir a pendência"
                />
              </div>
              <FotoPicker arquivos={arquivos} onChange={setArquivos} label="Foto da correção" />
              <p className="text-xs text-muted-foreground">
                Registrar a correção não conclui a pendência — a validação ocorre na reinspeção.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="h-11 flex-1" onClick={() => setModo('nenhum')}>
                  Cancelar
                </Button>
                <Button className="h-11 flex-1" disabled={salvando} onClick={salvarCorrecao}>
                  {salvando ? 'Salvando...' : 'Salvar correção'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button className="h-11" onClick={() => setModo('correcao')}>
                <Wrench className="mr-2 h-4 w-4" /> Registrar Correção
              </Button>
              <Button
                variant="outline"
                className="h-11 text-destructive hover:text-destructive"
                onClick={() => setCancelarOpen(true)}
              >
                <Ban className="mr-2 h-4 w-4" /> Cancelar pendência
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={cancelarOpen} onOpenChange={setCancelarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar pendência</AlertDialogTitle>
            <AlertDialogDescription>
              O cancelamento exige justificativa e permanece registrado no histórico. A pendência não
              é apagada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Justificativa do cancelamento"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={motivo.trim().length < 3}
              onClick={async (e) => {
                e.preventDefault();
                await onCancelar(p, motivo.trim());
                setMotivo('');
                setCancelarOpen(false);
              }}
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
