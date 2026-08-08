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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EntregaTemplate } from '@/hooks/useEntregaInstitucional';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  templates: EntregaTemplate[];
  onConfirmar: (args: {
    nome: string;
    tipoModelo?: string | null;
    pavimento?: string | null;
    templateId?: string | null;
  }) => Promise<void>;
}

export function AdicionarAmbienteDialog({ open, onOpenChange, templates, onConfirmar }: Props) {
  const [nome, setNome] = useState('');
  const [pavimento, setPavimento] = useState('');
  const [templateId, setTemplateId] = useState<string>('auto');
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    if (!nome.trim()) return;
    setSalvando(true);
    const tpl = templates.find((t) => t.id === templateId);
    await onConfirmar({
      nome: nome.trim(),
      pavimento: pavimento.trim() || null,
      tipoModelo: tpl?.tipo_modelo ?? null,
      templateId: templateId === 'auto' ? null : templateId,
    });
    setSalvando(false);
    setNome('');
    setPavimento('');
    setTemplateId('auto');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar ambiente</DialogTitle>
          <DialogDescription>
            Use para ambientes que não constavam do Recebimento Definitivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="amb-nome">Nome do ambiente</Label>
            <Input
              id="amb-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Sala de Reuniões 02"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amb-pav">Pavimento (opcional)</Label>
            <Input
              id="amb-pav"
              value={pavimento}
              onChange={(e) => setPavimento(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Checklist institucional</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Detectar pelo nome do ambiente</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!nome.trim() || salvando} onClick={confirmar}>
            {salvando ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
