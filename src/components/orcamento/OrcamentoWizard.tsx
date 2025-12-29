import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ChevronLeft, ChevronRight, Check, FileSpreadsheet } from 'lucide-react';
import { useCreateOrcamento } from '@/hooks/useOrcamentos';
import type { OrcamentoFormData, BaseReferencia } from '@/types/orcamento';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, title: 'Passo 1', subtitle: 'Informações Gerais' },
  { id: 2, title: 'Passo 2', subtitle: 'Arredondamento, encargos e BDI' },
  { id: 3, title: 'Passo 3', subtitle: 'Bases' },
];

const categorias = [
  'Construção Civil',
  'Reforma',
  'Manutenção',
  'Infraestrutura',
  'Outros',
];

const basesNacionais = [
  { nome: 'SINAPI', locais: ['Mato Grosso', 'São Paulo', 'Rio de Janeiro', 'Minas Gerais'], versoes: ['11/2025', '10/2025', '09/2025'] },
  { nome: 'SBC', locais: ['CBA - Cuiabá', 'São Paulo'], versoes: ['12/2025', '11/2025', '10/2025'] },
  { nome: 'SICRO3', locais: ['Mato Grosso', 'Nacional'], versoes: ['07/2025', '06/2025'] },
];

const formSchema = z.object({
  codigo: z.string().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  cliente: z.string().optional(),
  categoria: z.string().optional(),
  prazo_entrega: z.string().optional(),
  is_licitacao: z.boolean().default(false),
  tipo_licitacao: z.string().optional(),
  data_abertura_licitacao: z.string().optional(),
  numero_processo_licitacao: z.string().optional(),
  arredondamento: z.enum(['truncar_2', 'arredondar_2', 'nao_arredondar']).default('truncar_2'),
  tipo_encargo: z.enum(['onerado', 'desonerado']).default('desonerado'),
  bdi_incidencia: z.enum(['preco_unitario', 'preco_final']).default('preco_unitario'),
  bdi_percentual: z.number().default(27.54),
  bdi_manual: z.number().nullable().optional(),
  bases_referencia: z.array(z.object({
    nome: z.string(),
    local: z.string(),
    versao: z.string(),
    arredondamento: z.string().optional(),
  })).default([]),
});

export function OrcamentoWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [useBdiManual, setUseBdiManual] = useState(false);
  
  const createOrcamento = useCreateOrcamento();
  
  const form = useForm<OrcamentoFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: '',
      nome: '',
      cliente: '',
      categoria: '',
      prazo_entrega: '',
      is_licitacao: false,
      tipo_licitacao: '',
      data_abertura_licitacao: '',
      numero_processo_licitacao: '',
      arredondamento: 'truncar_2',
      tipo_encargo: 'desonerado',
      bdi_incidencia: 'preco_unitario',
      bdi_percentual: 27.54,
      bdi_manual: null,
      bases_referencia: [],
    },
  });

  const isLicitacao = form.watch('is_licitacao');
  const selectedBases = form.watch('bases_referencia') || [];

  const toggleBase = (nome: string, local: string, versao: string) => {
    const current = form.getValues('bases_referencia') || [];
    const exists = current.find(b => b.nome === nome && b.local === local);
    
    if (exists) {
      form.setValue('bases_referencia', current.filter(b => !(b.nome === nome && b.local === local)));
    } else {
      form.setValue('bases_referencia', [...current, { nome, local, versao, arredondamento: 'seguir_config' }]);
    }
  };

  const updateBaseVersao = (nome: string, local: string, versao: string) => {
    const current = form.getValues('bases_referencia') || [];
    form.setValue('bases_referencia', current.map(b => 
      b.nome === nome && b.local === local ? { ...b, versao } : b
    ));
  };

  const isBaseSelected = (nome: string, local: string) => {
    return selectedBases.some(b => b.nome === nome && b.local === local);
  };

  const getBaseVersao = (nome: string, local: string) => {
    return selectedBases.find(b => b.nome === nome && b.local === local)?.versao || '';
  };

  const onSubmit = async (data: OrcamentoFormData) => {
    try {
      const result = await createOrcamento.mutateAsync(data);
      navigate(`/orcamento/${result.id}`);
    } catch (error) {
      console.error('Error creating orcamento:', error);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary/10 rounded-full">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Novo orçamento</h1>
          <p className="text-muted-foreground">Formulário de criação de orçamento</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                "flex flex-col items-start px-4 py-2 border-l-4 transition-colors",
                currentStep === step.id
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:bg-muted/50"
              )}
            >
              <span className={cn(
                "font-semibold",
                currentStep === step.id ? "text-primary" : "text-muted-foreground"
              )}>
                {step.title}
              </span>
              <span className="text-sm text-muted-foreground">{step.subtitle}</span>
            </button>
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="pt-6">
              {/* Step 1 - Informações Gerais */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="codigo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código</FormLabel>
                          <FormControl>
                            <Input placeholder="Auto-gerado se vazio" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição*</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do orçamento" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="cliente"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do cliente" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="categoria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria*</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categorias.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="prazo_entrega"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo de entrega</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <FormField
                      control={form.control}
                      name="is_licitacao"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 font-medium">LICITAÇÃO</FormLabel>
                        </FormItem>
                      )}
                    />

                    {isLicitacao && (
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <FormField
                          control={form.control}
                          name="tipo_licitacao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Licitação</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="data_abertura_licitacao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data e Hora de Abertura</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="numero_processo_licitacao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número do Processo</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2 - Arredondamento, encargos e BDI */}
              {currentStep === 2 && (
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                        Arredondamento do Orçamento
                      </h3>
                      <FormField
                        control={form.control}
                        name="arredondamento"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className="space-y-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="truncar_2" id="truncar" />
                                  <Label htmlFor="truncar" className="flex items-center gap-2">
                                    Truncar em 2 casas decimais
                                    <Badge variant="default" className="bg-primary text-xs">Padrão do TCU</Badge>
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="arredondar_2" id="arredondar" />
                                  <Label htmlFor="arredondar">Arredondar em 2 casas decimais</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="nao_arredondar" id="nao_arredondar" />
                                  <Label htmlFor="nao_arredondar">Não arredondar</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                        BDI - Benefícios e Despesas Indiretas
                      </h3>
                      <FormField
                        control={form.control}
                        name="bdi_incidencia"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className="space-y-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="preco_unitario" id="preco_unit" />
                                  <Label htmlFor="preco_unit" className="flex items-center gap-2">
                                    Incidir sobre o preço unitário da composição
                                    <Badge variant="default" className="bg-green-600 text-xs">TCU recomenda</Badge>
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="preco_final" id="preco_final" />
                                  <Label htmlFor="preco_final">Incidir sobre o preço final do orçamento</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="mt-4 space-y-3">
                        <Select defaultValue="default">
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um BDI existente" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">BDI Padrão (27,54%)</SelectItem>
                            <SelectItem value="custom">Novo BDI</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-3">
                          <Checkbox 
                            id="bdi_manual" 
                            checked={useBdiManual}
                            onCheckedChange={(checked) => setUseBdiManual(!!checked)}
                          />
                          <Label htmlFor="bdi_manual">BDI manual</Label>
                          {useBdiManual && (
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="%" 
                              className="w-24"
                              onChange={(e) => form.setValue('bdi_manual', parseFloat(e.target.value) || null)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                      Encargos Sociais
                    </h3>
                    <FormField
                      control={form.control}
                      name="tipo_encargo"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="desonerado" id="desonerado" />
                                <Label htmlFor="desonerado">Desonerado</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="onerado" id="onerado" />
                                <Label htmlFor="onerado">Não desonerado</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 3 - Bases */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2 flex-wrap">
                      {selectedBases.map((base) => (
                        <Badge key={`${base.nome}-${base.local}`} variant="secondary" className="gap-1">
                          {base.nome} - {base.local} - {base.versao}
                          <button 
                            type="button"
                            onClick={() => toggleBase(base.nome, base.local, base.versao)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={prevStep}>
                        {'<< Voltar'}
                      </Button>
                      <Button type="submit" disabled={createOrcamento.isPending}>
                        {createOrcamento.isPending ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-center font-semibold mb-4">Bases Nacionais</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Base</TableHead>
                          <TableHead>Local</TableHead>
                          <TableHead>Versão</TableHead>
                          <TableHead>Arredondamento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {basesNacionais.map((base) => 
                          base.locais.map((local) => (
                            <TableRow key={`${base.nome}-${local}`}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={isBaseSelected(base.nome, local)}
                                    onCheckedChange={() => toggleBase(base.nome, local, base.versoes[0])}
                                  />
                                  {base.nome}
                                </div>
                              </TableCell>
                              <TableCell>{local}</TableCell>
                              <TableCell>
                                <Select
                                  value={getBaseVersao(base.nome, local) || base.versoes[0]}
                                  onValueChange={(v) => updateBaseVersao(base.nome, local, v)}
                                  disabled={!isBaseSelected(base.nome, local)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {base.versoes.map(v => (
                                      <SelectItem key={v} value={v}>{v}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select defaultValue="seguir_config" disabled={!isBaseSelected(base.nome, local)}>
                                  <SelectTrigger className="w-52">
                                    <SelectValue placeholder="Seguir configuração" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="seguir_config">Seguir a configuração do orçamento</SelectItem>
                                    <SelectItem value="truncar">Truncar em 2 casas</SelectItem>
                                    <SelectItem value="arredondar">Arredondar em 2 casas</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation buttons for steps 1 and 2 */}
          {currentStep < 3 && (
            <div className="flex justify-between mt-6">
              <Button type="button" variant="link" onClick={prevStep} disabled={currentStep === 1}>
                Voltar
              </Button>
              <Button type="button" onClick={nextStep}>
                Próximo
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}

// Import table component
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
