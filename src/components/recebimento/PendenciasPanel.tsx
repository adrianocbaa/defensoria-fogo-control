import { useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Camera, Image as ImageIcon, Loader2, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ABERTAS,
  CLASSIFICACAO_LABEL,
  EVENTO_LABEL,
  SITUACAO_CLASS,
  SITUACAO_LABEL,
  type PendenciaSituacao,
} from '@/lib/recebimento/constants';
import type { Foto, Pendencia, PendenciaHistorico } from '@/hooks/useRecebimentoPendencias';

interface Props {
  pendencias: Pendencia[];
  fotos: Foto[];
  historico: PendenciaHistorico[];
  nomeAmbiente: (id: string | null) => string;
  somenteLeitura: boolean;
  onRegistrarCorrecao: (p: Pendencia, observacao: string, fotos: File[]) => Promise<void>;
  onAvaliar: (p: Pendencia, aceita: boolean, observacao: string, fotos: File[]) => Promise<void>;
  onCancelar: (p: Pendencia, motivo: string) => Promise<void>;
}

const FILTROS: { key: string; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'abertas', label: 'Pendentes' },
  { key: 'sanada', label: 'Corrigidas' },
  { key: 'reprovada', label: 'Reprovadas' },
];

export function PendenciasPanel({
  pendencias,
  fotos,
  historico,
  nomeAmbiente,
  somenteLeitura,
  onRegistrarCorrecao,
  onAvaliar,
  onCancelar,
}: Props) {
  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<Pendencia | null>(null);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pendencias.filter((p) => {
      if (filtro === 'abertas' && !ABERTAS.includes(p.situacao)) return false;
      if (filtro === 'sanada' && p.situacao !== 'sanada') return false;
      if (filtro === 'reprovada' && p.situacao !== 'reprovada') return false;
      if (termo) {
        const alvo = `${p.titulo} ${p.descricao ?? ''} ${nomeAmbiente(p.ambiente_id)}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [pendencias, filtro, busca, nomeAmbiente]);

  const porAmbiente = useMemo(() => {
    const map = new Map<string, Pendencia[]>();
    for (const p of lista) {
      const nome = nomeAmbiente(p.ambiente_id);
      const arr = map.get(nome) ?? [];
      arr.push(p);
      map.set(nome, arr);
    }
    return [...map.entries()];
  }, [lista, nomeAmbiente]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            placeholder="Buscar pendência..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltro(f.key)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm',
                filtro === f.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {porAmbiente.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma pendência encontrada.
        </Card>
      )}

      {porAmbiente.map(([nome, itens]) => (
        <div key={nome} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{nome}</p>
            <Badge variant="secondary">{itens.length} pendência(s)</Badge>
          </div>
          {itens.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setAberta(p)}
              className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left hover:bg-muted/40"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">{p.descricao}</p>
              </div>
              <span className={cn('shrink-0 rounded border px-2 py-0.5 text-[10px]', SITUACAO_CLASS[p.situacao])}>
                {SITUACAO_LABEL[p.situacao]}
              </span>
            </button>
          ))}
        </div>
      ))}

      <PendenciaDetailSheet
        pendencia={aberta}
        onOpenChange={(o) => !o && setAberta(null)}
        fotos={fotos}
        historico={historico}
        nomeAmbiente={nomeAmbiente}
        somenteLeitura={somenteLeitura}
        onRegistrarCorrecao={onRegistrarCorrecao}
        onAvaliar={onAvaliar}
        onCancelar={onCancelar}
      />
    </div>
  );
}

export function PendenciaDetailSheet({
  pendencia,
  onOpenChange,
  fotos,
  historico,
  nomeAmbiente,
  somenteLeitura,
  onRegistrarCorrecao,
  onAvaliar,
  onCancelar,
  modoReinspecao = false,
}: {
  pendencia: Pendencia | null;
  onOpenChange: (o: boolean) => void;
  fotos: Foto[];
  historico: PendenciaHistorico[];
  nomeAmbiente: (id: string | null) => string;
  somenteLeitura: boolean;
  onRegistrarCorrecao: (p: Pendencia, observacao: string, fotos: File[]) => Promise<void>;
  onAvaliar: (p: Pendencia, aceita: boolean, observacao: string, fotos: File[]) => Promise<void>;
  onCancelar: (p: Pendencia, motivo: string) => Promise<void>;
  modoReinspecao?: boolean;
}) {
  const [obs, setObs] = useState('');
  const [novasFotos, setNovasFotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [motivoCancel, setMotivoCancel] = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  if (!pendencia) return null;

  const fotosPend = fotos.filter((f) => f.pendencia_id === pendencia.id);
  const antes = fotosPend.filter((f) => f.tipo === 'ocorrencia');
  const depois = fotosPend.filter((f) => f.tipo === 'correcao');
  const eventos = historico
    .filter((h) => h.pendencia_id === pendencia.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const limpar = () => {
    setObs('');
    setNovasFotos([]);
    setMotivoCancel('');
  };

  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    await fn();
    setSaving(false);
    limpar();
    onOpenChange(false);
  };

  const situacaoAberta = ABERTAS.includes(pendencia.situacao as PendenciaSituacao);

  return (
    <Sheet open={!!pendencia} onOpenChange={(o) => { if (!o) limpar(); onOpenChange(o); }}>
      <SheetContent side="bottom" className="flex h-[94vh] flex-col p-0 sm:mx-auto sm:max-w-2xl">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">{pendencia.titulo}</SheetTitle>
          <p className="text-left text-xs text-muted-foreground">
            {nomeAmbiente(pendencia.ambiente_id)} · {CLASSIFICACAO_LABEL[pendencia.classificacao]}
          </p>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <span className={cn('rounded border px-2 py-1 text-xs', SITUACAO_CLASS[pendencia.situacao])}>
              {SITUACAO_LABEL[pendencia.situacao]}
            </span>
            {pendencia.prazo_correcao && (
              <span className="text-xs text-muted-foreground">
                Prazo: {pendencia.prazo_correcao.split('-').reverse().join('/')}
              </span>
            )}
          </div>

          {pendencia.descricao && <p className="text-sm">{pendencia.descricao}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Antes</p>
              <FotoGrid fotos={antes} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Depois</p>
              <FotoGrid fotos={depois} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Histórico</p>
            <ol className="space-y-2 border-l pl-4">
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
          </div>

          {!somenteLeitura && situacaoAberta && (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-semibold">
                {modoReinspecao ? 'Avaliar correção' : 'Registrar correção'}
              </p>
              <Textarea
                placeholder="Observação..."
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
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
                onChange={(e) => e.target.files && setNovasFotos((p) => [...p, ...Array.from(e.target.files!)])}
              />
              <input
                ref={galeriaRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && setNovasFotos((p) => [...p, ...Array.from(e.target.files!)])}
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-12 flex-1 border-destructive/40 text-destructive"
                    disabled={saving}
                    onClick={() => run(() => onAvaliar(pendencia, false, obs, novasFotos))}
                  >
                    Continua pendente
                  </Button>
                  <Button
                    className="h-12 flex-1"
                    disabled={saving}
                    onClick={() => run(() => onAvaliar(pendencia, true, obs, novasFotos))}
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sanada
                  </Button>
                </div>
              ) : (
                <Button
                  className="h-12 w-full"
                  disabled={saving || (!obs.trim() && novasFotos.length === 0)}
                  onClick={() => run(() => onRegistrarCorrecao(pendencia, obs, novasFotos))}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar correção
                </Button>
              )}
            </div>
          )}

          {!somenteLeitura && pendencia.situacao !== 'cancelada' && pendencia.situacao !== 'sanada' && (
            <div className="space-y-2 rounded-lg border border-dashed p-3">
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
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FotoGrid({ fotos }: { fotos: Foto[] }) {
  if (!fotos.length) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
        Sem foto
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1">
      {fotos.map((f) =>
        f.url ? (
          <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
            <img
              src={f.url}
              alt={f.legenda ?? 'Evidência'}
              loading="lazy"
              className="aspect-square w-full rounded-md object-cover"
            />
          </a>
        ) : null,
      )}
    </div>
  );
}
