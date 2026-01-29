import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Lock } from 'lucide-react';

interface Medicao {
  id: number;
  sessionId?: string;
  nome: string;
  bloqueada?: boolean;
  dataBloqueio?: string;
}

interface ExportMedicaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicoes: Medicao[];
  medicaoAtual: number | null;
  onExport: (selectedMedicoes: number[], apenasItensAcima: boolean) => void;
}

export function ExportMedicaoDialog({
  open,
  onOpenChange,
  medicoes,
  medicaoAtual,
  onExport,
}: ExportMedicaoDialogProps) {
  // Apenas medições bloqueadas podem ser exportadas
  const medicoesBloqueadas = useMemo(() => 
    medicoes.filter(m => m.bloqueada).sort((a, b) => a.id - b.id),
    [medicoes]
  );

  const [selectedMedicoes, setSelectedMedicoes] = useState<number[]>(
    medicaoAtual ? [medicaoAtual] : []
  );
  const [tipoItens, setTipoItens] = useState<'todos' | 'macros'>('todos');

  // Reset ao abrir
  React.useEffect(() => {
    if (open) {
      setSelectedMedicoes(medicaoAtual ? [medicaoAtual] : []);
      setTipoItens('todos');
    }
  }, [open, medicaoAtual]);

  const toggleMedicao = (id: number) => {
    setSelectedMedicoes(prev => 
      prev.includes(id) 
        ? prev.filter(m => m !== id)
        : [...prev, id].sort((a, b) => a - b)
    );
  };

  const selectAll = () => {
    setSelectedMedicoes(medicoesBloqueadas.map(m => m.id));
  };

  const deselectAll = () => {
    setSelectedMedicoes([]);
  };

  const handleExport = () => {
    if (selectedMedicoes.length === 0) return;
    onExport(selectedMedicoes, tipoItens === 'macros');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar Planilha XLS
          </DialogTitle>
          <DialogDescription>
            Selecione as medições e o tipo de itens para exportar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seleção de Medições */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Medições a exportar</Label>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={selectAll}
                >
                  Todas
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={deselectAll}
                >
                  Limpar
                </Button>
              </div>
            </div>

            {medicoesBloqueadas.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg text-center">
                Nenhuma medição bloqueada disponível para exportação.
                <br />
                Bloqueie uma medição antes de exportar.
              </div>
            ) : (
              <ScrollArea className="h-[180px] border rounded-lg p-2">
                <div className="space-y-2">
                  {medicoesBloqueadas.map((medicao) => (
                    <div 
                      key={medicao.id}
                      className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors ${
                        selectedMedicoes.includes(medicao.id) ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => toggleMedicao(medicao.id)}
                    >
                      <Checkbox
                        checked={selectedMedicoes.includes(medicao.id)}
                        onCheckedChange={() => toggleMedicao(medicao.id)}
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-medium">{medicao.nome}</span>
                        <Lock className="h-3 w-3 text-green-600" />
                        {medicao.id === medicaoAtual && (
                          <Badge variant="secondary" className="text-xs">
                            Atual
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectedMedicoes.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedMedicoes.length} medição(ões) selecionada(s)
              </p>
            )}
          </div>

          {/* Tipo de Itens */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de itens</Label>
            <RadioGroup
              value={tipoItens}
              onValueChange={(value) => setTipoItens(value as 'todos' | 'macros')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="todos" id="todos" />
                <div className="flex-1">
                  <Label htmlFor="todos" className="font-medium cursor-pointer">
                    Todos os itens
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Exporta a planilha completa com todos os níveis
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="macros" id="macros" />
                <div className="flex-1">
                  <Label htmlFor="macros" className="font-medium cursor-pointer">
                    Apenas Macros (Nível 1)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Exporta somente os itens de nível superior (resumo)
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport}
            disabled={selectedMedicoes.length === 0}
          >
            Exportar XLS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
