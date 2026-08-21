import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nome: string;
  pavimento?: string | null;
  onConfirm: (args: { nome: string; pavimento: string | null }) => void | Promise<void>;
}

export function EditarAmbienteDialog({ open, onOpenChange, nome, pavimento, onConfirm }: Props) {
  const [novoNome, setNovoNome] = useState(nome);
  const [novoPavimento, setNovoPavimento] = useState(pavimento ?? '');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      setNovoNome(nome);
      setNovoPavimento(pavimento ?? '');
    }
  }, [open, nome, pavimento]);

  const salvar = async () => {
    if (!novoNome.trim()) return;
    setSalvando(true);
    await onConfirm({ nome: novoNome.trim(), pavimento: novoPavimento.trim() || null });
    setSalvando(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar ambiente</DialogTitle>
          <DialogDescription>
            Altere o nome e o pavimento deste ambiente. As respostas já registradas são mantidas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editar-ambiente-nome">Nome do ambiente</Label>
            <Input
              id="editar-ambiente-nome"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex.: Muro"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editar-ambiente-pavimento">Pavimento / localização</Label>
            <Input
              id="editar-ambiente-pavimento"
              value={novoPavimento}
              onChange={(e) => setNovoPavimento(e.target.value)}
              placeholder="Ex.: Térreo (opcional)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={!novoNome.trim() || salvando}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
