import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertOctagon, Loader2 } from 'lucide-react';

interface ImpedimentReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketTitle?: string;
  onConfirm: (motivo: string) => Promise<void> | void;
  onCancel?: () => void;
}

export function ImpedimentReasonDialog({
  open,
  onOpenChange,
  ticketTitle,
  onConfirm,
  onCancel,
}: ImpedimentReasonDialogProps) {
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMotivo('');
      setSaving(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    const trimmed = motivo.trim();
    if (trimmed.length < 3) return;
    setSaving(true);
    try {
      await onConfirm(trimmed);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !saving) handleCancel();
        else onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-destructive" />
            Registrar impedimento
          </DialogTitle>
          <DialogDescription>
            {ticketTitle ? <>Tarefa: <span className="font-medium">{ticketTitle}</span>. </> : null}
            Informe o motivo pelo qual a execução do serviço está impedida
            (ex.: aguardando material, terceiros, aprovação, etc.).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className="text-xs">Motivo do impedimento</Label>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            placeholder="Descreva o motivo..."
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            Este registro fica no histórico da tarefa.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || motivo.trim().length < 3}
          >
            {saving ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Salvando…</>
            ) : (
              'Registrar impedimento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
