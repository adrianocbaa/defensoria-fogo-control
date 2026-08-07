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
import { cn } from '@/lib/utils';
import type { TemplateResumo } from '@/hooks/useRecebimentoChecklist';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  templates: TemplateResumo[];
  onConfirm: (args: {
    nome: string;
    tipoModelo?: string | null;
    pavimento?: string | null;
    observacoes?: string | null;
    templateId?: string | null;
  }) => void;
}

export function AmbienteFormDialog({ open, onOpenChange, templates, onConfirm }: Props) {
  const [nome, setNome] = useState('');
  const [pavimento, setPavimento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);

  const reset = () => {
    setNome('');
    setPavimento('');
    setObservacoes('');
    setTemplateId(null);
  };

  const handleConfirm = () => {
    if (!nome.trim()) return;
    const tpl = templates.find((t) => t.id === templateId);
    onConfirm({
      nome: nome.trim(),
      tipoModelo: tpl?.nome ?? null,
      pavimento: pavimento.trim() || null,
      observacoes: observacoes.trim() || null,
      templateId,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo ambiente</DialogTitle>
          <DialogDescription>
            Escolha um modelo para já carregar os serviços mais comuns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="amb-nome">Nome do ambiente *</Label>
            <Input
              id="amb-nome"
              className="mt-1 h-11"
              placeholder="Ex.: Gabinete 01"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Label className="mb-2 block">Modelo de ambiente</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplateId(null)}
                className={cn(
                  'rounded-lg border p-3 text-left text-sm transition-colors',
                  templateId === null ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                )}
              >
                <span className="font-medium">Em branco</span>
                <span className="block text-xs text-muted-foreground">Adicionar serviços depois</span>
              </button>
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={cn(
                    'rounded-lg border p-3 text-left text-sm transition-colors',
                    templateId === t.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                  )}
                >
                  <span className="font-medium">{t.nome}</span>
                  {t.descricao && (
                    <span className="block text-xs text-muted-foreground">{t.descricao}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="amb-pav">Pavimento / setor</Label>
            <Input
              id="amb-pav"
              className="mt-1 h-11"
              placeholder="Opcional"
              value={pavimento}
              onChange={(e) => setPavimento(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="amb-obs">Observações</Label>
            <Textarea
              id="amb-obs"
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
          <Button onClick={handleConfirm} disabled={!nome.trim()}>
            Criar ambiente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
