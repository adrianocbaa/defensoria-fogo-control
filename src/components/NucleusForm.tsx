import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMonths, addYears } from 'date-fns';
import { CalendarIcon, Upload, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MapSelector } from '@/components/MapSelector';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

const nucleusFormSchema = z.object({
  name: z.string().min(1, 'Nome do núcleo é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  address: z.string().min(1, 'Endereço é obrigatório'),
  coordinates: z.object({
    lat: z.number().min(-90, 'Latitude deve estar entre -90 e 90').max(90, 'Latitude deve estar entre -90 e 90'),
    lng: z.number().min(-180, 'Longitude deve estar entre -180 e 180').max(180, 'Longitude deve estar entre -180 e 180'),
  }),
  // Informações de contato
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  hasHydrant: z.boolean(),
  // AVCB (Alvará do Corpo de Bombeiros)
  hasAVCB: z.boolean(),
  avcbExpirationDate: z.date().optional(),
  // Extintores individuais
  extinguishers: z.array(z.object({
    type: z.enum(['H2O', 'PQS', 'CO2', 'ABC']),
    location: z.string().min(1, 'Localização é obrigatória'),
    serialNumber: z.string().optional(),
    capacity: z.string().optional(),
    expirationDate: z.date(),
    lastInspection: z.date().optional(),
  })),
  // Documentos
  documents: z.array(z.object({
    name: z.string().min(1, 'Nome do documento é obrigatório'),
    type: z.enum(['project', 'fire-license', 'photos', 'report']),
    file: z.any(),
  })),
});

type NucleusFormData = z.infer<typeof nucleusFormSchema>;

interface NucleusFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NucleusFormData) => void;
}

export function NucleusForm({ open, onOpenChange, onSubmit }: NucleusFormProps) {
  const form = useForm<NucleusFormData>({
    resolver: zodResolver(nucleusFormSchema),
    defaultValues: {
      name: '',
      city: '',
      address: '',
      coordinates: { lat: -15.6014, lng: -56.0979 }, // Default to Cuiabá coordinates
      phone: '',
      email: '',
      hasHydrant: false,
      hasAVCB: false,
      extinguishers: [],
      documents: [],
    },
  });

  const hasAVCB = form.watch('hasAVCB');
  const extinguishers = form.watch('extinguishers');
  const documents = form.watch('documents');

  const addExtinguisher = () => {
    const currentExtinguishers = form.getValues('extinguishers');
    form.setValue('extinguishers', [
      ...currentExtinguishers,
      {
        type: 'ABC' as const,
        location: '',
        serialNumber: '',
        capacity: '',
        expirationDate: new Date(),
        lastInspection: undefined,
      }
    ]);
  };

  const removeExtinguisher = (index: number) => {
    const currentExtinguishers = form.getValues('extinguishers');
    form.setValue('extinguishers', currentExtinguishers.filter((_, i) => i !== index));
  };

  const addDocument = () => {
    const currentDocuments = form.getValues('documents');
    form.setValue('documents', [
      ...currentDocuments,
      {
        name: '',
        type: 'project' as const,
        file: null,
      }
    ]);
  };

  const removeDocument = (index: number) => {
    const currentDocuments = form.getValues('documents');
    form.setValue('documents', currentDocuments.filter((_, i) => i !== index));
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      const currentDocuments = form.getValues('documents');
      currentDocuments[index].file = file;
      if (!currentDocuments[index].name) {
        currentDocuments[index].name = file.name;
      }
      form.setValue('documents', [...currentDocuments]);
    }
  };

  const handleSubmit = (data: NucleusFormData) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastro de Novo Núcleo</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Nome do Núcleo */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Núcleo</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome do núcleo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cidade */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite a cidade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Local de Instalação no Mapa */}
            <div className="space-y-2">
              <Label>Local de Instalação do Núcleo</Label>
              <MapSelector
                onLocationSelect={async (lat, lng) => {
                  form.setValue('coordinates.lat', lat);
                  form.setValue('coordinates.lng', lng);
                  
                  // Fazer geocoding reverso para preencher o endereço
                  try {
                    const response = await fetch(
                      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw&language=pt`
                    );
                    const data = await response.json();
                    
                    if (data.features && data.features.length > 0) {
                      const address = data.features[0].place_name;
                      form.setValue('address', address);
                    }
                  } catch (error) {
                    console.error('Erro ao obter endereço:', error);
                  }
                }}
                initialCoordinates={{
                  lat: form.watch('coordinates.lat') || -15.6014,
                  lng: form.watch('coordinates.lng') || -56.0979
                }}
              />
            </div>

            {/* Endereço */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o endereço completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Informações de Contato */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 0000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Hidrante */}
            <FormField
              control={form.control}
              name="hasHydrant"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Possui Hidrante</FormLabel>
                </FormItem>
              )}
            />

            {/* Alvará do Corpo de Bombeiros (AVCB) */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="hasAVCB"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Possui Alvará do Corpo de Bombeiros (AVCB)</FormLabel>
                  </FormItem>
                )}
              />

              {hasAVCB && (
                <div className="ml-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="avcbExpirationDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de validade do Alvará</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy")
                                ) : (
                                  <span>Selecionar data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Extintores de Incêndio */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">Extintores de Incêndio</h3>
                <Button type="button" onClick={addExtinguisher} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Extintor
                </Button>
              </div>

              {extinguishers.map((extintor, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Extintor {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExtinguisher(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`extinguishers.${index}.type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="w-full p-2 border border-border rounded-md bg-background"
                            >
                              <option value="ABC">ABC - Multipropósito</option>
                              <option value="H2O">H2O - Água</option>
                              <option value="PQS">PQS - Pó Químico Seco</option>
                              <option value="CO2">CO2 - Gás Carbônico</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`extinguishers.${index}.capacity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 6kg, 10L" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                     <FormField
                       control={form.control}
                       name={`extinguishers.${index}.location`}
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Local de Instalação</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Recepção, Sala de Informática" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`extinguishers.${index}.serialNumber`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Série</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: EXT001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`extinguishers.${index}.expirationDate`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data de Vencimento</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <span>Selecionar data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`extinguishers.${index}.lastInspection`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Última Inspeção (opcional)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <span>Selecionar data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              {extinguishers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum extintor cadastrado. Clique em "Adicionar Extintor" para começar.
                </div>
              )}
            </div>

            {/* Documentos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">Documentos</h3>
                <Button type="button" onClick={addDocument} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Documento
                </Button>
              </div>

              {documents.map((doc, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Documento {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`documents.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Documento</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Projeto Preventivo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`documents.${index}.type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo do Documento</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="w-full p-2 border border-border rounded-md bg-background"
                            >
                              <option value="project">Projeto</option>
                              <option value="fire-license">Alvará Bombeiros</option>
                              <option value="photos">Fotos</option>
                              <option value="report">Relatório</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Arquivo</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.zip"
                        onChange={(e) => handleFileUpload(e, index)}
                        className="hidden"
                        id={`document-file-${index}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById(`document-file-${index}`)?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {doc.file ? doc.file.name : 'Selecionar arquivo'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {documents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum documento cadastrado. Clique em "Adicionar Documento" para começar.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Cadastrar Núcleo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}