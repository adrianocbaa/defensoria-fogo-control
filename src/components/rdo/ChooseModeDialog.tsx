import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Edit, FileSpreadsheet, Sparkles } from 'lucide-react';
import { ModoAtividades } from '@/hooks/useRdoConfig';

interface ChooseModeDialogProps {
  open: boolean;
  onConfirm: (mode: ModoAtividades) => void;
  isLoading?: boolean;
}

export function ChooseModeDialog({ open, onConfirm, isLoading }: ChooseModeDialogProps) {
  const [selectedMode, setSelectedMode] = useState<ModoAtividades>('manual');

  const handleConfirm = () => {
    onConfirm(selectedMode);
  };

  return (
    <Dialog open={open} modal>
      <DialogContent className="sm:max-w-[550px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">Defina o Modo de Preenchimento desta Obra</DialogTitle>
          <DialogDescription className="text-base">
            Esta escolha será aplicada a todos os RDOs desta obra e não poderá ser alterada posteriormente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={selectedMode}
            onValueChange={(value) => setSelectedMode(value as ModoAtividades)}
            className="space-y-3"
          >
            {/* Manual */}
            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors cursor-pointer">
              <RadioGroupItem value="manual" id="mode-manual" className="mt-1" />
              <Label
                htmlFor="mode-manual"
                className="flex-1 cursor-pointer space-y-1"
              >
                <div className="flex items-center gap-2 font-medium">
                  <Edit className="h-4 w-4" />
                  Preenchimento Manual
                </div>
                <p className="text-sm text-muted-foreground">
                  Registre manualmente as atividades executadas no dia
                </p>
              </Label>
            </div>

            {/* Planilha */}
            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors cursor-pointer">
              <RadioGroupItem value="planilha" id="mode-planilha" className="mt-1" />
              <Label
                htmlFor="mode-planilha"
                className="flex-1 cursor-pointer space-y-1"
              >
                <div className="flex items-center gap-2 font-medium">
                  <FileSpreadsheet className="h-4 w-4" />
                  Lista de Serviços (Planilha)
                </div>
                <p className="text-sm text-muted-foreground">
                  Preencha os serviços da planilha orçamentária vinculada à obra
                </p>
              </Label>
            </div>

            {/* Template */}
            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors cursor-pointer">
              <RadioGroupItem value="template" id="mode-template" className="mt-1" />
              <Label
                htmlFor="mode-template"
                className="flex-1 cursor-pointer space-y-1"
              >
                <div className="flex items-center gap-2 font-medium">
                  <Sparkles className="h-4 w-4" />
                  Modelo Padrão
                </div>
                <p className="text-sm text-muted-foreground">
                  Carregue um template pré-definido e personalize conforme necessário
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? 'Salvando...' : 'Confirmar e Continuar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
