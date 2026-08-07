import { useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CLASSIFICACAO_LABEL,
  type PendenciaClassificacao,
} from '@/lib/recebimento/constants';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ambienteNome: string;
  servicoNome: string;
  verificacaoNome: string;
  onSalvar: (args: {
    descricao: string;
    classificacao: PendenciaClassificacao;
    prazoCorrecao: string | null;
    observacao: string | null;
    fotos: File[];
  }) => Promise<void>;
  onCancelar: () => void;
}

export function NaoConformidadeSheet({
  open,
  onOpenChange,
  ambienteNome,
  servicoNome,
  verificacaoNome,
  onSalvar,
  onCancelar,
}: Props) {
  const [descricao, setDescricao] = useState('');
  const [classificacao, setClassificacao] = useState<PendenciaClassificacao>('acabamento');
  const [prazo, setPrazo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setDescricao('');
    setClassificacao('acabamento');
    setPrazo('');
    setObservacao('');
    setFotos([]);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setFotos((p) => [...p, ...Array.from(files)]);
  };

  const salvar = async () => {
    if (!descricao.trim()) return;
    setSaving(true);
    await onSalvar({
      descricao: descricao.trim(),
      classificacao,
      prazoCorrecao: prazo || null,
      observacao: observacao.trim() || null,
      fotos,
    });
    setSaving(false);
    reset();
    onOpenChange(false);
  };

  const cancelar = () => {
    reset();
    onCancelar();
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) cancelar();
        else onOpenChange(o);
      }}
    >
      <SheetContent side="bottom" className="flex h-[94vh] flex-col p-0 sm:mx-auto sm:max-w-2xl">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">Não conformidade</SheetTitle>
          <p className="text-left text-xs text-muted-foreground">
            {ambienteNome} · {servicoNome} · <span className="font-medium">{verificacaoNome}</span>
          </p>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div>
            <Label htmlFor="nc-desc">Descrição da ocorrência *</Label>
            <Textarea
              id="nc-desc"
              className="mt-1 min-h-24"
              placeholder="Descreva o problema encontrado..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Label className="mb-2 block">Foto da ocorrência</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="default"
                className="h-14 flex-1 text-base"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="mr-2 h-5 w-5" /> Tirar foto
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-14 flex-1"
                onClick={() => galeriaRef.current?.click()}
              >
                <ImageIcon className="mr-2 h-5 w-5" /> Galeria
              </Button>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <input
              ref={galeriaRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {fotos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-md border">
                    <img
                      src={URL.createObjectURL(f)}
                      alt={`Foto ${i + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={() => setFotos((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                      aria-label="Remover foto"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="mb-2 block">Classificação</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CLASSIFICACAO_LABEL) as PendenciaClassificacao[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClassificacao(c)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm',
                    classificacao === c
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {CLASSIFICACAO_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="nc-prazo">Prazo para correção</Label>
            <Input
              id="nc-prazo"
              type="date"
              className="mt-1 h-11"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="nc-obs">Observação</Label>
            <Textarea
              id="nc-obs"
              className="mt-1"
              placeholder="Opcional"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 border-t bg-background px-4 py-3">
          <Button variant="outline" className="h-12 flex-1" onClick={cancelar}>
            Cancelar
          </Button>
          <Button className="h-12 flex-[2]" onClick={salvar} disabled={!descricao.trim() || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar pendência
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
