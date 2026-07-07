import { useMaintenanceManagers } from '@/hooks/useMaintenanceManagers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/** Multi-seleção de servidores da manutenção (perfil GM). */
export function ManagersMultiSelect({ value, onChange, disabled, placeholder = 'Selecione servidor(es)...', className }: Props) {
  const { managers } = useMaintenanceManagers();
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };
  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  const selected = value.map((id) => managers.find((m) => m.id === id)).filter(Boolean) as { id: string; nome: string }[];
  // Inclui IDs não encontrados (ex.: gerentes removidos) como placeholder para não sumir
  const missing = value.filter((id) => !managers.some((m) => m.id === id));

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between h-9 font-normal"
            disabled={disabled}
          >
            <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
              {value.length === 0
                ? placeholder
                : `${value.length} servidor${value.length > 1 ? 'es' : ''} selecionado${value.length > 1 ? 's' : ''}`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar servidor..." />
            <CommandList>
              <CommandEmpty>Nenhum servidor encontrado.</CommandEmpty>
              <CommandGroup>
                {managers.map((m) => {
                  const checked = value.includes(m.id);
                  return (
                    <CommandItem key={m.id} value={m.nome} onSelect={() => toggle(m.id)}>
                      <Check className={cn('mr-2 h-4 w-4', checked ? 'opacity-100' : 'opacity-0')} />
                      {m.nome}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {(selected.length > 0 || missing.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {selected.map((m) => (
            <Badge key={m.id} variant="secondary" className="text-xs gap-1 pr-1">
              {m.nome}
              {!disabled && (
                <button
                  type="button"
                  className="ml-1 rounded hover:bg-background/50"
                  onClick={() => remove(m.id)}
                  aria-label={`Remover ${m.nome}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {missing.map((id) => (
            <Badge key={id} variant="outline" className="text-xs gap-1 pr-1 opacity-70">
              (removido)
              {!disabled && (
                <button type="button" className="ml-1 rounded hover:bg-background/50" onClick={() => remove(id)}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
