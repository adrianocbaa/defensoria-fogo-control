import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Edit, FileSpreadsheet, Sparkles, Settings2 } from 'lucide-react';
import { ModoAtividades, useRdoConfig } from '@/hooks/useRdoConfig';

const OPTIONS: {
  value: ModoAtividades;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'manual',
    label: 'Preenchimento Manual',
    description: 'Registre manualmente as atividades executadas no dia',
    icon: Edit,
  },
  {
    value: 'planilha',
    label: 'Lista de Serviços (Planilha)',
    description: 'Preencha os serviços da planilha orçamentária vinculada à obra',
    icon: FileSpreadsheet,
  },
  {
    value: 'template',
    label: 'Modelo Padrão',
    description: 'Carregue um template pré-definido e personalize conforme necessário',
    icon: Sparkles,
  },
];

interface RdoModeCardProps {
  obraId: string;
  mode: ModoAtividades;
  canChange: boolean;
}

/**
 * Cartão do Resumo do RDO que mostra o modo de registro de atividades da obra
 * e permite ao fiscal alterá-lo sem precisar criar um RDO no calendário.
 */
export function RdoModeCard({ obraId, mode, canChange }: RdoModeCardProps) {
  const { updateConfig, isUpdating } = useRdoConfig(obraId);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ModoAtividades>(mode);

  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[0];
  const Icon = current.icon;

  return (
    <>
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Registro de atividades desta obra</p>
              <p className="flex items-center gap-2 font-semibold">
                {current.label}
                <Badge variant="secondary">Configurado</Badge>
              </p>
            </div>
          </div>
          {canChange && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelected(mode);
                setOpen(true);
              }}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Alterar modo
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Modo de registro de atividades</DialogTitle>
            <DialogDescription>
              A escolha vale para todos os RDOs desta obra. Alterar pode invalidar dados já
              lançados em RDOs anteriores.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={selected}
            onValueChange={(v) => setSelected(v as ModoAtividades)}
            className="space-y-3 py-2"
          >
            {OPTIONS.map((opt) => {
              const OptIcon = opt.icon;
              const active = selected === opt.value;
              return (
                <Label
                  key={opt.value}
                  htmlFor={`mode-${opt.value}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50 ${
                    active ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={`mode-${opt.value}`} className="mt-1" />
                  <span className="space-y-1">
                    <span className="flex items-center gap-2 font-medium">
                      <OptIcon className="h-4 w-4" />
                      {opt.label}
                    </span>
                    <span className="block text-sm font-normal text-muted-foreground">
                      {opt.description}
                    </span>
                  </span>
                </Label>
              );
            })}
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={isUpdating || selected === mode}
              onClick={() => {
                updateConfig({ obra_id: obraId, modo_atividades: selected });
                setOpen(false);
              }}
            >
              {isUpdating ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
