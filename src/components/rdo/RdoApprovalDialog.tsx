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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RdoApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'approve' | 'reject' | null;
  onConfirm: (observacao?: string) => Promise<void>;
}

export function RdoApprovalDialog({ 
  open, 
  onOpenChange, 
  action,
  onConfirm 
}: RdoApprovalDialogProps) {
  const [observacao, setObservacao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (action === 'reject' && !observacao.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(observacao || undefined);
      onOpenChange(false);
      setObservacao('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === 'approve' ? 'Aprovar RDO' : 'Reprovar RDO'}
          </DialogTitle>
          <DialogDescription>
            {action === 'approve' 
              ? 'Confirme a aprovação deste Relatório Diário de Obra.'
              : 'Informe o motivo da reprovação deste Relatório Diário de Obra.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="observacao">
              {action === 'approve' ? 'Observações (opcional)' : 'Motivo da reprovação *'}
            </Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={
                action === 'approve' 
                  ? 'Observações sobre a aprovação...'
                  : 'Descreva o motivo da reprovação...'
              }
              rows={4}
              required={action === 'reject'}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant={action === 'approve' ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={isSubmitting || (action === 'reject' && !observacao.trim())}
          >
            {isSubmitting 
              ? 'Processando...'
              : action === 'approve' ? 'Aprovar' : 'Reprovar'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
