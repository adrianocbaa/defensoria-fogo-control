import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MATERIAIS_CALHA } from './calhaSchema';

export const parametrosAutomaticoSchema = z.object({
  material: z.string().min(1, 'Selecione um material'),
  manning_n: z.coerce.number().positive().max(0.1),
  declividade_pct: z.coerce.number().min(0.05, 'Mínimo 0,05% (NBR 10844)').max(20),
  num_descidas: z.coerce.number().int().min(1, 'Mínimo 1').max(50),
  fs_alvo: z.coerce.number().min(1, 'Mínimo 1,0').max(5),
});

export type ParametrosAutomaticoForm = z.infer<typeof parametrosAutomaticoSchema>;

interface Props {
  defaultValues?: ParametrosAutomaticoForm;
  onSubmit: (v: ParametrosAutomaticoForm) => void;
  onBack: () => void;
}

export function ParametrosAutomaticoStep({ defaultValues, onSubmit, onBack }: Props) {
  const form = useForm<ParametrosAutomaticoForm>({
    resolver: zodResolver(parametrosAutomaticoSchema),
    defaultValues: defaultValues ?? {
      material: 'PVC',
      manning_n: 0.011,
      declividade_pct: 0.5,
      num_descidas: 2,
      fs_alvo: 1.2,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="text-sm text-muted-foreground">
          Informe os parâmetros do projeto. O sistema testará automaticamente as calhas
          comerciais cadastradas na biblioteca e recomendará a menor seção que atende
          à vazão de projeto com a margem de segurança definida.
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="material"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material padrão</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    const m = MATERIAIS_CALHA.find((x) => x.nome === v);
                    if (m) form.setValue('manning_n', m.n);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MATERIAIS_CALHA.map((m) => (
                      <SelectItem key={m.nome} value={m.nome}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Filtra a biblioteca por este material.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="manning_n"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coef. de Manning (n)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="declividade_pct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Declividade (%)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.05" {...field} />
                </FormControl>
                <FormDescription>NBR 10844: mínimo 0,5% recomendado.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="num_descidas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pontos de descida</FormLabel>
                <FormControl>
                  <Input type="number" step="1" {...field} />
                </FormControl>
                <FormDescription>Quantidade de condutores verticais.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fs_alvo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fator de segurança alvo</FormLabel>
                <FormControl>
                  <Input type="number" step="0.05" {...field} />
                </FormControl>
                <FormDescription>Recomendado ≥ 1,2.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={onBack}>Voltar</Button>
          <Button type="submit">Dimensionar</Button>
        </div>
      </form>
    </Form>
  );
}
