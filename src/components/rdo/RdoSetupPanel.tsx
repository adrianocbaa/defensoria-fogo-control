import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Edit, FileSpreadsheet, Sparkles, Settings2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ModoAtividades, useRdoConfig } from '@/hooks/useRdoConfig';

interface RdoSetupPanelProps {
  obraId: string;
  isFiscal: boolean;
}

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

/**
 * Configuração inicial do RDO da obra — exibida no primeiro acesso ao módulo,
 * sem necessidade de criar um RDO no calendário.
 */
export function RdoSetupPanel({ obraId, isFiscal }: RdoSetupPanelProps) {
  const { user } = useAuth();
  const { createConfig, isCreating } = useRdoConfig(obraId);
  const [selectedMode, setSelectedMode] = useState<ModoAtividades>('manual');

  if (!isFiscal) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Configuração do RDO pendente</h3>
            <p className="max-w-md text-muted-foreground">
              O Fiscal ainda não definiu como as atividades serão registradas nesta obra.
              Aguarde a configuração para iniciar o preenchimento dos RDOs.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Settings2 className="h-5 w-5 text-primary" />
          Configuração inicial do RDO
        </CardTitle>
        <CardDescription>
          Antes de iniciar os relatórios diários, defina como as atividades serão registradas
          nesta obra. Nenhum RDO será criado no calendário agora — a configuração vale para todos
          os RDOs futuros.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedMode}
          onValueChange={(v) => setSelectedMode(v as ModoAtividades)}
          className="grid gap-3 md:grid-cols-3"
        >
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = selectedMode === opt.value;
            return (
              <Label
                key={opt.value}
                htmlFor={`setup-${opt.value}`}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50 ${
                  active ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <RadioGroupItem value={opt.value} id={`setup-${opt.value}`} className="mt-1" />
                <span className="space-y-1">
                  <span className="flex items-center gap-2 font-medium">
                    <Icon className="h-4 w-4" />
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

        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={isCreating}
            onClick={() =>
              createConfig({
                obra_id: obraId,
                modo_atividades: selectedMode,
                chosen_by: user?.id,
              })
            }
          >
            {isCreating ? 'Salvando...' : 'Salvar configuração'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
