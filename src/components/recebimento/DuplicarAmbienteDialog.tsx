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
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ambienteNome: string;
  onConfirm: (nomes: string[]) => void;
}

export function DuplicarAmbienteDialog({ open, onOpenChange, ambienteNome, onConfirm }: Props) {
  const [nome, setNome] = useState('');
  const [nomes, setNomes] = useState<string[]>([]);

  const add = () => {
    const v = nome.trim();
    if (v && !nomes.includes(v)) {
      setNomes((p) => [...p, v]);
      setNome('');
    }
  };

  const handleConfirm = () => {
    const lista = nome.trim() && !nomes.includes(nome.trim()) ? [...nomes, nome.trim()] : nomes;
    if (!lista.length) return;
    onConfirm(lista);
    setNomes([]);
    setNome('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicar checklist</DialogTitle>
          <DialogDescription>
            Copia apenas a estrutura de serviços e verificações de “{ambienteNome}”. Resultados,
            fotos e pendências não são copiados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label htmlFor="dup-nome">Novos ambientes</Label>
          <div className="flex gap-2">
            <Input
              id="dup-nome"
              className="h-11"
              placeholder="Ex.: Gabinete 02"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={add}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {nomes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {nomes.map((n) => (
                <Badge key={n} variant="secondary" className="gap-1 pr-1">
                  {n}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => setNomes((p) => p.filter((x) => x !== n))}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!nomes.length && !nome.trim()}>
            Duplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
