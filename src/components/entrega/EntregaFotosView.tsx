import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Images, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatarDataHora } from '@/lib/entrega/constants';
import type { EntregaAmbiente } from '@/hooks/useEntregaInstitucional';
import type { EntregaFoto } from '@/hooks/useEntregaPendencias';

type FiltroTipo = 'todas' | 'geral' | 'ocorrencia' | 'correcao';

const TIPOS: { key: FiltroTipo; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'geral', label: 'Ambiente' },
  { key: 'ocorrencia', label: 'Ocorrências' },
  { key: 'correcao', label: 'Correções' },
];

interface Props {
  ambientes: EntregaAmbiente[];
  fotos: EntregaFoto[];
  somenteLeitura: boolean;
  onRemover: (foto: EntregaFoto) => Promise<void>;
}

export function EntregaFotosView({ ambientes, fotos, somenteLeitura, onRemover }: Props) {
  const [tipo, setTipo] = useState<FiltroTipo>('todas');
  const [ambienteId, setAmbienteId] = useState<string>('todos');
  const [preview, setPreview] = useState<EntregaFoto | null>(null);

  const lista = useMemo(
    () =>
      fotos.filter((f) => {
        const okTipo =
          tipo === 'todas' ||
          (tipo === 'correcao' ? f.tipo === 'correcao' || f.tipo === 'reinspecao' : f.tipo === tipo);
        const okAmb = ambienteId === 'todos' || f.ambiente_id === ambienteId;
        return okTipo && okAmb;
      }),
    [fotos, tipo, ambienteId],
  );

  const nomeAmbiente = (id: string | null) =>
    ambientes.find((a) => a.id === id)?.nome ?? 'Sem ambiente';

  if (fotos.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <Images className="h-8 w-8 text-muted-foreground" />
        <p className="text-lg font-bold">Nenhuma foto registrada</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          As fotos gerais dos ambientes e os registros de ocorrência e correção aparecem aqui.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        {TIPOS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTipo(t.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              tipo === t.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70',
            )}
          >
            {t.label}
          </button>
        ))}
        <select
          value={ambienteId}
          onChange={(e) => setAmbienteId(e.target.value)}
          className="ml-auto h-9 rounded-lg border bg-background px-2 text-sm"
          aria-label="Filtrar por ambiente"
        >
          <option value="todos">Todos os ambientes</option>
          {ambientes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {lista.map((f) => (
          <Card key={f.id} className="overflow-hidden">
            <button type="button" className="block w-full" onClick={() => setPreview(f)}>
              {f.url ? (
                <img
                  src={f.url}
                  alt={f.legenda ?? `Foto de ${nomeAmbiente(f.ambiente_id)}`}
                  loading="lazy"
                  className="h-36 w-full object-cover"
                />
              ) : (
                <div className="h-36 w-full bg-muted" />
              )}
            </button>
            <div className="space-y-1 p-2.5">
              <p className="truncate text-xs font-semibold">{nomeAmbiente(f.ambiente_id)}</p>
              <p className="text-[11px] text-muted-foreground">{formatarDataHora(f.created_at)}</p>
              {!somenteLeitura && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs text-destructive hover:text-destructive"
                  onClick={() => onRemover(f)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Visualização da foto</DialogTitle>
          {preview?.url && (
            <img
              src={preview.url}
              alt={preview.legenda ?? 'Foto da entrega institucional'}
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
