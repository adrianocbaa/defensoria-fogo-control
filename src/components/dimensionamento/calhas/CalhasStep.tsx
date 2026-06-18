import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Ruler, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Calha,
  CalhasForm,
  MATERIAIS_CALHA,
  TIPOS_CALHA,
  TipoCalha,
  calhasFormSchema,
} from './calhaSchema';

interface Props {
  defaultValues?: CalhasForm;
  onSubmit: (values: CalhasForm) => void;
  onBack: () => void;
}

const novoPonto = (n: number) => ({
  id: crypto.randomUUID(),
  rotulo: `PD${n}`,
  posicao_m: 0,
});

const novaCalha = (n: number): Calha =>
  ({
    id: crypto.randomUUID(),
    nome: `Calha ${n.toString().padStart(2, '0')}`,
    comprimento_m: 10,
    tipo: 'semicircular' as TipoCalha,
    declividade_pct: 0.5,
    material: 'PVC',
    manning_n: 0.011,
    diametro_m: 0.1,
    largura_m: undefined,
    altura_m: undefined,
    base_menor_m: undefined,
    base_maior_m: undefined,
    geometria_personalizada: '',
    pontos_descida: [novoPonto(1)],
  }) as Calha;

export function CalhasStep({ defaultValues, onSubmit, onBack }: Props) {
  const form = useForm<CalhasForm>({
    resolver: zodResolver(calhasFormSchema),
    defaultValues: defaultValues ?? { calhas: [novaCalha(1)] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'calhas',
  });

  useEffect(() => {
    if (!fields.length) append(novaCalha(1));
  }, [fields.length, append]);

  const handleAdicionar = () => append(novaCalha(fields.length + 1));
  const handleRemover = (i: number) => {
    if (fields.length === 1) {
      toast({ title: 'Deve haver ao menos uma calha' });
      return;
    }
    remove(i);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-start gap-3 rounded-md border bg-muted/40 px-4 py-3">
          <Ruler className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            Cadastre cada calha com sua geometria, declividade, material e os{' '}
            <strong>pontos de descida</strong> ao longo do comprimento. A vazão
            será calculada na próxima etapa pela equação de{' '}
            <strong>Manning</strong> (NBR 10844:1989).
          </div>
        </div>

        <div className="space-y-4">
          {fields.map((field, idx) => (
            <CalhaItem
              key={field.id}
              idx={idx}
              form={form}
              onRemover={() => handleRemover(idx)}
            />
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={handleAdicionar}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar calha
        </Button>

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

function CalhaItem({
  idx,
  form,
  onRemover,
}: {
  idx: number;
  form: ReturnType<typeof useForm<CalhasForm>>;
  onRemover: () => void;
}) {
  const tipo = useWatch({ control: form.control, name: `calhas.${idx}.tipo` });
  const material = useWatch({ control: form.control, name: `calhas.${idx}.material` });

  // sincroniza n de Manning quando o material muda (a menos que seja "Outro")
  useEffect(() => {
    const m = MATERIAIS_CALHA.find((x) => x.nome === material);
    if (m && !material.startsWith('Outro')) {
      form.setValue(`calhas.${idx}.manning_n`, m.n, { shouldValidate: false });
    }
  }, [material, idx, form]);

  const pontos = useFieldArray({
    control: form.control,
    name: `calhas.${idx}.pontos_descida`,
  });

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          Calha {idx + 1}
        </Badge>
        <Button type="button" variant="ghost" size="sm" onClick={onRemover}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`calhas.${idx}.nome`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da calha *</FormLabel>
              <FormControl>
                <Input placeholder="Ex.: Calha 01 — fachada leste" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`calhas.${idx}.tipo`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de calha *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TIPOS_CALHA.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <NumberField form={form} name={`calhas.${idx}.comprimento_m`} label="Comprimento (m) *" step="0.01" />
        <NumberField form={form} name={`calhas.${idx}.declividade_pct`} label="Declividade (%) *" step="0.01" />

        <FormField
          control={form.control}
          name={`calhas.${idx}.material`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Material *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MATERIAIS_CALHA.map((m) => (
                    <SelectItem key={m.nome} value={m.nome}>
                      {m.nome} (n = {m.n})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <NumberField
          form={form}
          name={`calhas.${idx}.manning_n`}
          label="Coef. de Manning (n) *"
          step="0.001"
        />
      </div>

      {/* dimensões dinâmicas conforme o tipo */}
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="text-xs font-semibold text-muted-foreground mb-3">
          Dimensões da seção
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tipo === 'semicircular' && (
            <NumberField form={form} name={`calhas.${idx}.diametro_m`} label="Diâmetro D (m) *" step="0.01" />
          )}
          {tipo === 'retangular' && (
            <>
              <NumberField form={form} name={`calhas.${idx}.largura_m`} label="Largura b (m) *" step="0.01" />
              <NumberField form={form} name={`calhas.${idx}.altura_m`} label="Altura h (m) *" step="0.01" />
            </>
          )}
          {tipo === 'trapezoidal' && (
            <>
              <NumberField form={form} name={`calhas.${idx}.base_menor_m`} label="Base menor (m) *" step="0.01" />
              <NumberField form={form} name={`calhas.${idx}.base_maior_m`} label="Base maior (m) *" step="0.01" />
              <NumberField form={form} name={`calhas.${idx}.altura_m`} label="Altura h (m) *" step="0.01" />
            </>
          )}
          {tipo === 'personalizada' && (
            <FormField
              control={form.control}
              name={`calhas.${idx}.geometria_personalizada`}
              render={({ field }) => (
                <FormItem className="md:col-span-3">
                  <FormLabel>Descrição da geometria *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a seção (ex.: U invertido com bordas de 8 cm, área molhada conhecida etc.)"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      </div>

      {/* pontos de descida */}
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            Pontos de descida
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => pontos.append(novoPonto(pontos.fields.length + 1))}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {pontos.fields.map((p, j) => (
            <div key={p.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <FormField
                control={form.control}
                name={`calhas.${idx}.pontos_descida.${j}.rotulo`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Rótulo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: PD1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <NumberField
                form={form}
                name={`calhas.${idx}.pontos_descida.${j}.posicao_m`}
                label="Posição na calha (m) *"
                step="0.01"
                small
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (pontos.fields.length === 1) {
                    toast({ title: 'Mantenha ao menos um ponto de descida' });
                    return;
                  }
                  pontos.remove(j);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NumberField({
  form,
  name,
  label,
  step = '0.01',
  small,
}: {
  form: ReturnType<typeof useForm<CalhasForm>>;
  name: any;
  label: string;
  step?: string;
  small?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={small ? 'text-xs' : ''}>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              step={step}
              min="0"
              inputMode="decimal"
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
  );
}
