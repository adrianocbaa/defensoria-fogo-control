import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, FileCheck2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

import { CadastroObra, cadastroObraSchema } from './types';
import { NORMA, TIPOS_EDIFICACAO, UFS } from './constants';

interface Props {
  defaultValues?: Partial<CadastroObra>;
  onSubmit: (values: CadastroObra) => void;
}

export function CadastroObraStep({ defaultValues, onSubmit }: Props) {
  const form = useForm<CadastroObra>({
    resolver: zodResolver(cadastroObraSchema),
    defaultValues: {
      nome_obra: '',
      cidade: '',
      uf: undefined as unknown as CadastroObra['uf'],
      tipo_edificacao: undefined as unknown as CadastroObra['tipo_edificacao'],
      responsavel_tecnico: '',
      data_calculo: new Date().toISOString().slice(0, 10),
      observacoes: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileCheck2 className="h-4 w-4" />
            Norma utilizada
          </div>
          <Badge variant="secondary" className="font-mono">{NORMA}</Badge>
        </div>

        <FormField
          control={form.control}
          name="nome_obra"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da obra *</FormLabel>
              <FormControl>
                <Input placeholder="Ex.: Reforma do Fórum de Cuiabá" maxLength={150} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
          <FormField
            control={form.control}
            name="cidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex.: Cuiabá" maxLength={100} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="uf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UF *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-72">
                    {UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo_edificacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de edificação *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIPOS_EDIFICACAO.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="data_calculo"
            render={({ field }) => {
              const dateValue = field.value
                ? new Date(`${field.value}T00:00:00`)
                : undefined;
              return (
                <FormItem className="flex flex-col">
                  <FormLabel>Data do cálculo *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateValue
                            ? format(dateValue, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                            : 'Selecione a data'}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateValue}
                        onSelect={(d) =>
                          field.onChange(d ? format(d, 'yyyy-MM-dd') : '')
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        <FormField
          control={form.control}
          name="responsavel_tecnico"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsável técnico *</FormLabel>
              <FormControl>
                <Input placeholder="Nome e registro profissional (CREA/CAU)" maxLength={150} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionais sobre o cálculo (opcional)"
                  rows={4}
                  maxLength={2000}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit">Avançar</Button>
        </div>
      </form>
    </Form>
  );
}
