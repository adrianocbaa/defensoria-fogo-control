import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ClipboardCheck, RefreshCw, BadgeCheck } from 'lucide-react';
import type { VistoriaTipo } from '@/lib/recebimento/constants';
import { vistoriaTitulo, type VistoriaStatus } from '@/lib/recebimento/constants';

interface VistoriaOpcao {
  id: string;
  tipo: string;
  sequencia: number;
  status: VistoriaStatus;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vistoriasExistentes: VistoriaOpcao[];
  onConfirm: (args: {
    tipo: VistoriaTipo;
    data: string;
    observacoes?: string;
    vistoriaOrigemId?: string | null;
    copiarEstruturaDe?: string | null;
  }) => void;
}

const TIPOS: { tipo: VistoriaTipo; label: string; desc: string; icon: typeof ClipboardCheck }[] = [
  {
    tipo: 'provisorio',
    label: 'Recebimento Provisório',
    desc: 'Vistoria completa por ambientes e serviços',
    icon: ClipboardCheck,
  },
  {
    tipo: 'reinspecao',
    label: 'Reinspeção de Pendências',
    desc: 'Verifica somente as pendências em aberto',
    icon: RefreshCw,
  },
  {
    tipo: 'definitivo',
    label: 'Recebimento Definitivo',
    desc: 'Nova inspeção integral, podendo reaproveitar a estrutura',
    icon: BadgeCheck,
  },
];

export function NovaVistoriaDialog({ open, onOpenChange, vistoriasExistentes, onConfirm }: Props) {
  const [tipo, setTipo] = useState<VistoriaTipo>('provisorio');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState('');
  const [origemId, setOrigemId] = useState<string | null>(null);
  const [copiarEstrutura, setCopiarEstrutura] = useState(true);

  const provisorios = vistoriasExistentes.filter((v) => v.tipo === 'provisorio');
  const anteriores = vistoriasExistentes.filter((v) => v.tipo !== 'reinspecao');

  const handleConfirm = () => {
    onConfirm({
      tipo,
      data,
      observacoes: observacoes.trim() || undefined,
      vistoriaOrigemId: tipo === 'provisorio' ? null : origemId ?? provisorios[0]?.id ?? null,
      copiarEstruturaDe:
        tipo === 'definitivo' && copiarEstrutura ? origemId ?? provisorios[0]?.id ?? null : null,
    });
    onOpenChange(false);
    setObservacoes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Vistoria</DialogTitle>
          <DialogDescription>Selecione o tipo de vistoria a ser realizada.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            {TIPOS.map((t) => {
              const Icon = t.icon;
              const active = tipo === t.tipo;
              return (
                <button
                  key={t.tipo}
                  type="button"
                  onClick={() => setTipo(t.tipo)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                  )}
                >
                  <Icon className={cn('mt-0.5 h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {tipo !== 'provisorio' && anteriores.length > 0 && (
            <div>
              <Label>Vistoria de origem</Label>
              <select
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={origemId ?? anteriores[0]?.id ?? ''}
                onChange={(e) => setOrigemId(e.target.value)}
              >
                {anteriores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {vistoriaTitulo(v)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipo === 'definitivo' && anteriores.length > 0 && (
            <label className="flex items-start gap-2 rounded-md border border-border p-3">
              <Checkbox
                checked={copiarEstrutura}
                onCheckedChange={(c) => setCopiarEstrutura(!!c)}
                className="mt-0.5"
              />
              <span className="text-sm">
                Utilizar checklist da vistoria anterior como base
                <span className="block text-xs text-muted-foreground">
                  Copia ambientes, serviços e verificações. As respostas iniciam como “Não vistoriado”
                  e nenhuma pendência antiga é duplicada.
                </span>
              </span>
            </label>
          )}

          <div>
            <Label htmlFor="vist-data">Data da vistoria</Label>
            <Input
              id="vist-data"
              type="date"
              className="mt-1 h-11"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="vist-obs">Observações gerais</Label>
            <Textarea
              id="vist-obs"
              className="mt-1"
              placeholder="Opcional"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Iniciar vistoria</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
