import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Layers, Sigma } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toast } from '@/hooks/use-toast';

import {
  Pano,
  PanosForm,
  TIPOS_TELHADO,
  UNIDADES_INCLINACAO,
  calcularAreaContribuicao,
  panosFormSchema,
} from './panoSchema';

interface Props {
  defaultValues?: PanosForm;
  onSubmit: (values: PanosForm) => void;
  onBack: () => void;
}

const novoPano = (n: number): Pano => ({
  id: crypto.randomUUID(),
  nome: `Pano ${n}`,
  comprimento_m: 0,
  projecao_m: 0,
  inclinacao_valor: 30,
  inclinacao_unidade: '%',
  tipo_telhado: 'Fibrocimento',
  calha_associada: '',
});

export function PanosTelhadoStep({ defaultValues, onSubmit, onBack }: Props) {
  const form = useForm<PanosForm>({
    resolver: zodResolver(panosFormSchema),
    defaultValues: defaultValues ?? { panos: [novoPano(1)] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'panos',
  });

  // observa todos os panos para recalcular áreas em tempo real
  const watched = form.watch('panos');

  useEffect(() => {
    if (!fields.length) append(novoPano(1));
  }, [fields.length, append]);

  const totalArea = watched.reduce((sum, p) => {
    try {
      return sum + calcularAreaContribuicao(p as Pano).areaContribuicao;
    } catch {
      return sum;
    }
  }, 0);

  const handleAdicionar = () => append(novoPano(fields.length + 1));
  const handleRemover = (i: number) => {
    if (fields.length === 1) {
      toast({ title: 'Deve haver ao menos um pano' });
      return;
    }
    remove(i);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-start gap-3 rounded-md border bg-muted/40 px-4 py-3">
          <Layers className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            Cadastre cada pano (água) do telhado. A{' '}
            <strong>área de contribuição</strong> é calculada conforme a{' '}
            <strong>Tabela 1 da NBR 10844:1989</strong>:{' '}
            <code className="text-xs">A = a·b·(1 + tan θ / 2)</code>.
          </div>
        </div>

        <div className="space-y-4">
          {fields.map((field, idx) => {
            const pano = watched?.[idx] as Pano | undefined;
            const calc = pano ? safeCalc(pano) : null;
            return (
              <div
                key={field.id}
                className="rounded-lg border bg-card p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    Pano {idx + 1}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemover(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`panos.${idx}.nome`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do pano *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: Água esquerda" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`panos.${idx}.tipo_telhado`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de telhado *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIPOS_TELHADO.map((t) => (
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
                    name={`panos.${idx}.comprimento_m`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comprimento horizontal b (m) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            placeholder="Ex.: 12,00"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`panos.${idx}.projecao_m`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Projeção horizontal a (m) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            placeholder="Ex.: 4,50"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-[1fr_110px] gap-2">
                    <FormField
                      control={form.control}
                      name={`panos.${idx}.inclinacao_valor`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inclinação *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              inputMode="decimal"
                              placeholder="Ex.: 30"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`panos.${idx}.inclinacao_unidade`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidade</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {UNIDADES_INCLINACAO.map((u) => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`panos.${idx}.calha_associada`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calha associada</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex.: Calha 01 (será definida na próxima etapa)"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {calc && (
                  <div className="rounded-md border bg-muted/40 px-3 py-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <Info label="Inclinação" value={`${calc.inclinacaoPct}% • ${calc.inclinacaoGraus}°`} />
                    <Info label="Área em planta" value={`${calc.areaPlanta} m²`} />
                    <Info label="Área inclinada" value={`${calc.areaInclinada} m²`} />
                    <Info
                      label="Área contribuição (NBR)"
                      value={`${calc.areaContribuicao} m²`}
                      highlight
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdicionar}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar pano
        </Button>

        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Sigma className="h-4 w-4 text-primary" />
            <span className="font-medium">Área total de contribuição</span>
          </div>
          <div className="text-lg font-bold">{totalArea.toFixed(2)} m²</div>
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button type="submit">Avançar</Button>
        </div>
      </form>
    </Form>
  );
}

function safeCalc(p: Pano) {
  try {
    if (!p?.comprimento_m || !p?.projecao_m) return null;
    return calcularAreaContribuicao(p);
  } catch {
    return null;
  }
}

function Info({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className={highlight ? 'font-semibold text-primary' : 'font-medium'}>{value}</div>
    </div>
  );
}
