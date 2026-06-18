import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CloudRain, Database, Loader2, Radio, Save, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
import { toast } from '@/hooks/use-toast';

import {
  ChuvaProjeto,
  chuvaProjetoSchema,
  FONTES_INTENSIDADE,
} from './chuvaSchema';
import { useIntensidadesPluviometricas } from '@/hooks/useIntensidadesPluviometricas';

interface Props {
  cidade: string;
  uf: string;
  defaultValues?: Partial<ChuvaProjeto>;
  onSubmit: (values: ChuvaProjeto) => void;
  onBack: () => void;
}

export function ChuvaProjetoStep({
  cidade,
  uf,
  defaultValues,
  onSubmit,
  onBack,
}: Props) {
  const form = useForm<ChuvaProjeto>({
    resolver: zodResolver(chuvaProjetoSchema),
    defaultValues: {
      intensidade_mm_h: undefined as unknown as number,
      tempo_retorno_anos: 5,
      duracao_min: 5,
      fonte: 'Tabela NBR 10844',
      observacoes_chuva: '',
      ...defaultValues,
    },
  });

  const { rows, salvar, refetch } = useIntensidadesPluviometricas(cidade, uf);
  const [salvando, setSalvando] = useState(false);
  const [buscandoInmet, setBuscandoInmet] = useState(false);
  const [sugeriu, setSugeriu] = useState(false);

  // Sugestão automática: pega o primeiro registro (maior TR) ao chegar com cidade/UF
  useEffect(() => {
    if (sugeriu || !rows.length || defaultValues?.intensidade_mm_h) return;
    const r = rows[0];
    form.reset({
      intensidade_mm_h: Number(r.intensidade_mm_h),
      tempo_retorno_anos: r.tempo_retorno_anos,
      duracao_min: r.duracao_min,
      fonte: (FONTES_INTENSIDADE as readonly string[]).includes(r.fonte)
        ? (r.fonte as ChuvaProjeto['fonte'])
        : 'Entrada manual',
      observacoes_chuva: r.observacoes ?? '',
    });
    setSugeriu(true);
  }, [rows, sugeriu, defaultValues, form]);

  const handleSalvarBase = async () => {
    const valid = await form.trigger();
    if (!valid) {
      toast({ title: 'Preencha os campos válidos antes de salvar', variant: 'destructive' });
      return;
    }
    if (!cidade || !uf) {
      toast({
        title: 'Cidade/UF ausentes',
        description: 'Volte à Etapa 1 e preencha cidade e UF para salvar na base.',
        variant: 'destructive',
      });
      return;
    }
    const v = form.getValues();
    try {
      setSalvando(true);
      await salvar({
        cidade: cidade.trim(),
        uf,
        intensidade_mm_h: v.intensidade_mm_h,
        tempo_retorno_anos: v.tempo_retorno_anos,
        duracao_min: v.duracao_min,
        fonte: v.fonte,
        observacoes: v.observacoes_chuva || null,
      });
      toast({
        title: 'Intensidade salva',
        description: `${cidade}/${uf} • ${v.intensidade_mm_h} mm/h • TR ${v.tempo_retorno_anos} anos`,
      });
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar',
        description: e?.message ?? 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleBuscarInmet = async () => {
    if (!cidade || !uf) {
      toast({
        title: 'Cidade/UF ausentes',
        description: 'Volte à Etapa 1 e preencha cidade e UF.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setBuscandoInmet(true);
      const { data, error } = await supabase.functions.invoke('inmet-buscar-intensidade', {
        body: { cidade: cidade.trim(), uf, anos: 10 },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Não foi possível obter dados do INMET');

      const obs = `INMET • Estação ${data.estacao.nome} (${data.estacao.codigo}) • ${data.serie.anos_analisados} anos • ${data.metodo}`;
      form.reset({
        intensidade_mm_h: data.intensidade_mm_h,
        tempo_retorno_anos: data.tempo_retorno_anos,
        duracao_min: data.duracao_min,
        fonte: 'Estação pluviométrica',
        observacoes_chuva: obs,
      });

      toast({
        title: 'Estimativa do INMET aplicada',
        description: `${data.intensidade_mm_h} mm/h • ${data.estacao.nome}. Confirme com IDF local antes de finalizar.`,
      });
    } catch (e: any) {
      toast({
        title: 'Erro ao consultar INMET',
        description: e?.message ?? 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setBuscandoInmet(false);
    }
  };

  const aplicarRegistro = (id: string) => {
    const r = rows.find((x) => x.id === id);
    if (!r) return;
    form.reset({
      intensidade_mm_h: Number(r.intensidade_mm_h),
      tempo_retorno_anos: r.tempo_retorno_anos,
      duracao_min: r.duracao_min,
      fonte: (FONTES_INTENSIDADE as readonly string[]).includes(r.fonte)
        ? (r.fonte as ChuvaProjeto['fonte'])
        : 'Entrada manual',
      observacoes_chuva: r.observacoes ?? '',
    });
    toast({ title: 'Valores aplicados ao formulário' });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-start gap-3 rounded-md border bg-muted/40 px-4 py-3">
          <CloudRain className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            Conforme a <strong>NBR 10844</strong>, recomenda-se duração de chuva
            de <strong>5 min</strong> e período de retorno conforme a tipologia
            (1, 5 ou 25 anos). Você pode ajustar e usar dados locais.
          </div>
        </div>

        <div className="rounded-md border border-sky-500/30 bg-sky-50/60 dark:bg-sky-950/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-sm">
            <Radio className="h-4 w-4 text-sky-600 mt-0.5" />
            <div>
              <div className="font-medium">Estimar i₅ por reanálise climática (ERA5)</div>
              <div className="text-xs text-muted-foreground">
                Usa a série histórica de precipitação diária da reanálise ERA5
                (Open-Meteo) e aplica desagregação CETESB 24h→5min. Resultado é
                referência auxiliar — confirme com IDF local antes de finalizar.
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBuscarInmet}
            disabled={buscandoInmet || !cidade || !uf}
          >
            {buscandoInmet ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Radio className="h-4 w-4 mr-2" />
            )}
            {buscandoInmet ? 'Consultando ERA5...' : 'Estimar pela ERA5'}
          </Button>
        </div>


        {rows.length > 0 && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              {rows.length} registro{rows.length > 1 ? 's' : ''} encontrado
              {rows.length > 1 ? 's' : ''} para {cidade}/{uf}
            </div>
            <div className="flex flex-wrap gap-2">
              {rows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => aplicarRegistro(r.id)}
                  className="text-xs rounded-full border bg-background px-3 py-1 hover:bg-accent transition"
                  title={r.fonte}
                >
                  <span className="font-semibold">{Number(r.intensidade_mm_h)} mm/h</span>
                  <span className="text-muted-foreground"> • TR {r.tempo_retorno_anos}a • {r.duracao_min}min</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="intensidade_mm_h"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intensidade pluviométrica (mm/h) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    placeholder="Ex.: 150"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tempo_retorno_anos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tempo de retorno (anos) *</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={field.value ? String(field.value) : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1 ano</SelectItem>
                    <SelectItem value="5">5 anos</SelectItem>
                    <SelectItem value="10">10 anos</SelectItem>
                    <SelectItem value="25">25 anos</SelectItem>
                    <SelectItem value="50">50 anos</SelectItem>
                    <SelectItem value="100">100 anos</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="duracao_min"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duração da chuva (min) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    placeholder="Ex.: 5"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="fonte"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fonte do dado *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FONTES_INTENSIDADE.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observacoes_chuva"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Referência da curva IDF, código da estação, etc."
                  rows={3}
                  maxLength={500}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="rounded-md border bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="h-4 w-4" />
            <span>
              Base interna de intensidades por cidade
              {cidade && uf ? (
                <Badge variant="secondary" className="ml-2">{cidade}/{uf}</Badge>
              ) : (
                <span className="ml-2 italic">— preencha cidade/UF na Etapa 1</span>
              )}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSalvarBase}
            disabled={salvando || !cidade || !uf}
          >
            <Save className="h-4 w-4 mr-2" />
            {salvando ? 'Salvando...' : 'Salvar nesta base'}
          </Button>
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
