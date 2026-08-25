import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ABERTAS,
  CLASSIFICACAO_LABEL,
  EVENTO_LABEL,
  SITUACAO_LABEL,
} from '@/lib/recebimento/constants';
import { SITUACAO_CHIP, SITUACAO_ICON, formatarData } from '@/lib/recebimento/ui';
import type { Foto, Pendencia, PendenciaHistorico } from '@/hooks/useRecebimentoPendencias';
import { BeforeAfter } from './BeforeAfter';

export interface PendenciaDetailProps {
  pendencia: Pendencia;
  fotos: Foto[];
  historico: PendenciaHistorico[];
  nomeAmbiente: (id: string | null) => string;
  somenteLeitura: boolean;
  modoReinspecao?: boolean;
  onRegistrarCorrecao: (p: Pendencia, observacao: string, fotos: File[]) => Promise<void>;
  onAvaliar: (p: Pendencia, aceita: boolean, observacao: string, fotos: File[]) => Promise<void>;
  onCancelar: (p: Pendencia, motivo: string) => Promise<void>;
  onConcluido?: () => void;
  className?: string;
}

export function PendenciaDetail({
  pendencia,
  fotos,
  historico,
  nomeAmbiente,
  somenteLeitura,
  modoReinspecao = false,
  onRegistrarCorrecao,
  onAvaliar,
  onCancelar,
  onConcluido,
  className,
}: PendenciaDetailProps) {
  const [obs, setObs] = useState('');
  const [novasFotos, setNovasFotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [motivoCancel, setMotivoCancel] = useState('');
  const [reprovando, setReprovando] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  const fotosPend = fotos.filter((f) => f.pendencia_id === pendencia.id);
  const antes = fotosPend.filter((f) => f.tipo === 'ocorrencia');
  const depois = fotosPend.filter((f) => f.tipo === 'correcao');
  const eventos = historico
    .filter((h) => h.pendencia_id === pendencia.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const situacaoAberta = ABERTAS.includes(pendencia.situacao);
  const SituacaoIcon = SITUACAO_ICON[pendencia.situacao];

  const limpar = () => {
    setObs('');
    setNovasFotos([]);
    setMotivoCancel('');
    setReprovando(false);
  };

  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    await fn();
    setSaving(false);
    limpar();
    onConcluido?.();
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setNovasFotos((p) => [...p, ...Array.from(list)]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold leading-tight">{pendencia.titulo}</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {nomeAmbiente(pendencia.ambiente_id)}
            </p>
          </div>
          <span
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase',
              SITUACAO_CHIP[pendencia.situacao],
            )}
          >
            <SituacaoIcon className="h-3.5 w-3.5" />
            {SITUACAO_LABEL[pendencia.situacao]}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
          <Campo rotulo="Classificação" valor={CLASSIFICACAO_LABEL[pendencia.classificacao]} />
          <Campo rotulo="Registrada em" valor={formatarData(pendencia.created_at)} />
        </dl>

        {pendencia.descricao && (
          <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">{pendencia.descricao}</p>
        )}
      </Card>

      <BeforeAfter antes={antes} depois={depois} />

      <Card className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Histórico</p>
        <ol className="mt-3 space-y-3 border-l pl-4">
          {eventos.length === 0 && <li className="text-xs text-muted-foreground">Sem eventos.</li>}
          {eventos.map((e) => (
            <li key={e.id} className="relative text-sm">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
              <p className="font-medium">{EVENTO_LABEL[e.evento] ?? e.evento}</p>
              {e.observacao && <p className="text-xs text-muted-foreground">{e.observacao}</p>}
              <p className="text-[11px] text-muted-foreground">
                {new Date(e.created_at).toLocaleString('pt-BR')}
              </p>
            </li>
          ))}
        </ol>
      </Card>

      {!somenteLeitura && situacaoAberta && (
        <Card className="space-y-3 p-4">
          <p className="text-sm font-semibold">
            {modoReinspecao ? 'A correção foi aceita e sanou a pendência?' : 'Registrar correção'}
          </p>

          {(!modoReinspecao || reprovando) && (
            <Textarea
              placeholder={
                reprovando ? 'Justificativa da reprovação (obrigatória)' : 'Observação...'
              }
              className="min-h-20"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="h-11 flex-1" onClick={() => cameraRef.current?.click()}>
              <Camera className="mr-2 h-4 w-4" /> Foto
            </Button>
            <Button variant="outline" className="h-11 flex-1" onClick={() => galeriaRef.current?.click()}>
              <ImageIcon className="mr-2 h-4 w-4" /> Galeria
            </Button>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <input
            ref={galeriaRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          {novasFotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {novasFotos.map((f, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded border">
                  <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                    onClick={() => setNovasFotos((p) => p.filter((_, idx) => idx !== i))}
                    aria-label="Remover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {modoReinspecao ? (
            reprovando ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="h-12 flex-1"
                  disabled={saving}
                  onClick={() => setReprovando(false)}
                >
                  Voltar
                </Button>
                <Button
                  className="h-12 flex-[2]"
                  disabled={saving || obs.trim().length < 3}
                  onClick={() => run(() => onAvaliar(pendencia, false, obs, novasFotos))}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar e avançar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-14 flex-1 border-destructive/40 text-destructive"
                  disabled={saving}
                  onClick={() => setReprovando(true)}
                >
                  ✕ Continua pendente
                </Button>
                <Button
                  className="h-14 flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={saving}
                  onClick={() => run(() => onAvaliar(pendencia, true, obs, novasFotos))}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} ✓ Sanada
                </Button>
              </div>
            )
          ) : (
            <Button
              className="h-12 w-full"
              disabled={saving || (!obs.trim() && novasFotos.length === 0)}
              onClick={() => run(() => onRegistrarCorrecao(pendencia, obs, novasFotos))}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar correção
            </Button>
          )}
        </Card>
      )}

      {!somenteLeitura && pendencia.situacao !== 'cancelada' && pendencia.situacao !== 'sanada' && (
        <Card className="space-y-2 border-dashed p-4">
          <p className="text-sm font-semibold">Cancelar pendência</p>
          <p className="text-xs text-muted-foreground">
            Use somente em caso de lançamento incorreto. Exige justificativa e fica registrado no
            histórico.
          </p>
          <Input
            className="h-11"
            placeholder="Justificativa"
            value={motivoCancel}
            onChange={(e) => setMotivoCancel(e.target.value)}
          />
          <Button
            variant="outline"
            className="h-11 w-full border-destructive/40 text-destructive"
            disabled={motivoCancel.trim().length < 3 || saving}
            onClick={() => run(() => onCancelar(pendencia, motivoCancel.trim()))}
          >
            Cancelar pendência
          </Button>
        </Card>
      )}
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </dt>
      <dd className="mt-0.5 font-medium">{valor}</dd>
    </div>
  );
}
