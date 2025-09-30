import { Eye } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useModules } from '@/hooks/useNucleosCentral';

interface ModuleVisibilitySelectorProps {
  selectedModules: string[];
  onModuleToggle: (moduleKey: string) => void;
}

export function ModuleVisibilitySelector({
  selectedModules,
  onModuleToggle,
}: ModuleVisibilitySelectorProps) {
  const { modules, loading } = useModules();

  // Filtrar para excluir o módulo "obras"
  const filteredModules = modules.filter((module) => module.key !== 'obras');

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando módulos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="h-5 w-5 text-muted-foreground" />
        <div>
          <h3 className="font-medium">Visibilidade em Módulos</h3>
          <p className="text-sm text-muted-foreground">
            Controle em quais módulos este núcleo aparecerá nos mapas
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {filteredModules.map((module) => (
          <div key={module.id} className="flex items-center space-x-2">
            <Checkbox
              id={`module-${module.key}`}
              checked={selectedModules.includes(module.key)}
              onCheckedChange={() => onModuleToggle(module.key)}
            />
            <Label
              htmlFor={`module-${module.key}`}
              className="text-sm font-normal cursor-pointer"
            >
              {module.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
