import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { municipioDaUf, municipiosDaUf, type Municipio } from '@/lib/municipios';

export function MunicipioCombobox({ uf, value, savedName, onChange }: {
  uf: string; value: string; savedName?: string; onChange: (municipio: Municipio) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const options = useMemo(() => municipiosDaUf(uf).filter(m => normalize(m.nome).includes(normalize(search))), [uf, search]);
  const selected = municipioDaUf(uf, value);
  return (
    <Popover open={open} onOpenChange={next => { setOpen(next); if (!next) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-label="Município" aria-expanded={open} disabled={!uf} className="w-full justify-between font-normal min-w-0">
          <span className="truncate">{selected?.nome ?? (value && savedName ? savedName : uf ? 'Selecione o município' : 'Selecione a UF primeiro')}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Pesquisar município..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Nenhum município encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map(m => <CommandItem key={m.ibge} value={m.ibge} onSelect={() => { onChange(m); setOpen(false); setSearch(''); }}>
                <Check className={`mr-2 h-4 w-4 shrink-0 ${m.ibge === value ? 'opacity-100' : 'opacity-0'}`} />{m.nome}
              </CommandItem>)}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}