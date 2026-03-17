import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

export const STANDARD_SERVICES = [
  'Pintura – paredes internas',
  'Pintura – teto',
  'Pintura – rodapés e frisos',
  'Piso (nivelamento, rejunte e acabamento)',
  'Revestimento cerâmico – paredes',
  'Forro (instalação e acabamento)',
  'Instalação elétrica (tomadas e interruptores)',
  'Iluminação (pontos de luz e luminárias)',
  'Instalação hidráulica',
  'Louças e metais sanitários',
  'Esquadrias – portas (folha, batente, fechadura)',
  'Esquadrias – janelas (folha, batente, fechadura)',
  'Impermeabilização',
  'Ar-condicionado (instalação e fixação)',
  'Limpeza pós-obra',
];

interface AmbienteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (nome: string, servicos: { descricao: string; is_padrao: boolean }[]) => void;
}

export function AmbienteDialog({ open, onClose, onConfirm }: AmbienteDialogProps) {
  const [nome, setNome] = useState('');
  const [selectedStandard, setSelectedStandard] = useState<string[]>([]);
  const [customService, setCustomService] = useState('');
  const [customServices, setCustomServices] = useState<string[]>([]);

  const reset = () => {
    setNome('');
    setSelectedStandard([]);
    setCustomService('');
    setCustomServices([]);
  };

  const toggleStandard = (service: string) => {
    setSelectedStandard(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const addCustom = () => {
    if (customService.trim() && !customServices.includes(customService.trim())) {
      setCustomServices(prev => [...prev, customService.trim()]);
      setCustomService('');
    }
  };

  const handleConfirm = () => {
    if (!nome.trim()) return;
    const servicos = [
      ...selectedStandard.map(d => ({ descricao: d, is_padrao: true })),
      ...customServices.map(d => ({ descricao: d, is_padrao: false })),
    ];
    onConfirm(nome.trim(), servicos);
    reset();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo Ambiente</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div>
            <Label htmlFor="nome-ambiente">Nome do Ambiente *</Label>
            <Input
              id="nome-ambiente"
              placeholder="Ex: Banheiro Social, Sala de Atendimento..."
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label className="mb-2 block">Serviços Padrão</Label>
            <p className="text-xs text-muted-foreground mb-2">Selecione os serviços que precisam ser verificados neste ambiente.</p>
            <div className="space-y-2 max-h-52 overflow-y-auto border rounded-md p-3 bg-muted/20">
              {STANDARD_SERVICES.map(svc => (
                <div key={svc} className="flex items-center gap-2">
                  <Checkbox
                    id={`svc-${svc}`}
                    checked={selectedStandard.includes(svc)}
                    onCheckedChange={() => toggleStandard(svc)}
                  />
                  <label htmlFor={`svc-${svc}`} className="text-sm cursor-pointer leading-tight">
                    {svc}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Serviços Adicionais</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Descreva o serviço..."
                value={customService}
                onChange={e => setCustomService(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
              />
              <Button type="button" onClick={addCustom} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {customServices.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {customServices.map(svc => (
                  <Badge key={svc} variant="secondary" className="flex items-center gap-1 pr-1">
                    <span className="text-xs">{svc}</span>
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setCustomServices(prev => prev.filter(s => s !== svc))}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!nome.trim()}>
            Criar Ambiente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
