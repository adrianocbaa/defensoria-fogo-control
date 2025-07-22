import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Upload, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { MapSelector } from '@/components/MapSelector';
import { DocumentUpload } from '@/components/DocumentUpload';
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
import { useUserRole } from '@/hooks/useUserRole';

const nucleusFormSchema = z.object({
  name: z.string().min(1, 'Nome do núcleo é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  address: z.string().min(1, 'Endereço é obrigatório'),
  coordinates: z.object({
    lat: z.number().min(-90, 'Latitude deve estar entre -90 e 90').max(90, 'Latitude deve estar entre -90 e 90'),
    lng: z.number().min(-180, 'Longitude deve estar entre -180 e 180').max(180, 'Longitude deve estar entre -180 e 180'),
  }),
  // Modo Agente (dentro do fórum)
  isAgentMode: z.boolean(),
  // Informações de contato
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  // AVCB (Alvará do Corpo de Bombeiros)
  hasAVCB: z.boolean(),
  avcbExpirationDate: z.date().optional(),
  // Extintores individuais
  extinguishers: z.array(z.object({
    type: z.enum(['H2O', 'PQS', 'CO2', 'ABC']),
    location: z.string().min(1, 'Localização é obrigatória'),
    capacity: z.string().optional(),
    expirationDate: z.date(),
    hydrostaticTest: z.date().optional(),
    supportType: z.enum(['wall', 'tripod']).optional(),
    hasVerticalSignage: z.boolean().optional(),
  })),
  // Hidrantes
  hydrants: z.array(z.object({
    location: z.string().min(1, 'Localização é obrigatória'),
    status: z.enum(['verified', 'not_verified']),
    hoseExpirationDate: z.date().optional(),
    hasRegister: z.boolean(),
    hasHose: z.boolean(),
    hasKey: z.boolean(),
    hasCoupling: z.boolean(),
    hasAdapter: z.boolean(),
    hasNozzle: z.boolean(),
  })),
  // Documentos
  documents: z.array(z.object({
    name: z.string().min(1, 'Nome do documento é obrigatório'),
    type: z.enum(['project', 'fire-license', 'photos', 'report']),
    file: z.any(),
    url: z.string().optional(),
    uploadedAt: z.date().optional(),
  })),
});

type NucleusFormData = z.infer<typeof nucleusFormSchema>;

interface NucleusFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NucleusFormData) => void;
}

export function NucleusForm({ open, onOpenChange, onSubmit }: NucleusFormProps) {
  const { canEdit } = useUserRole();
  const form = useForm<NucleusFormData>({
    resolver: zodResolver(nucleusFormSchema),
    defaultValues: {
      name: '',
      city: '',
      address: '',
      coordinates: { lat: -15.6014, lng: -56.0979 }, // Default to Cuiabá coordinates
      isAgentMode: false,
      phone: '',
      email: '',
      hasAVCB: false,
      extinguishers: [],
      hydrants: [],
      documents: [],
    },
  });

  const hasAVCB = form.watch('hasAVCB');
  const isAgentMode = form.watch('isAgentMode');
  const extinguishers = form.watch('extinguishers');
  const hydrants = form.watch('hydrants');
  const documents = form.watch('documents');
  const address = form.watch('address');

  // Watch for type changes and auto-set capacity
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name && name.includes('.type')) {
        const typeMatch = name.match(/extinguishers\.(\d+)\.type/);
        if (typeMatch) {
          const index = parseInt(typeMatch[1]);
          const type = value.extinguishers?.[index]?.type;
          
          if (type === 'H2O') {
            form.setValue(`extinguishers.${index}.capacity`, '10L');
          } else if (['ABC', 'PQS', 'CO2'].includes(type as string)) {
            form.setValue(`extinguishers.${index}.capacity`, '');
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const addExtinguisher = (copyFromExtinguisher?: any) => {
    const currentExtinguishers = form.getValues('extinguishers');
    const newExtinguisher = copyFromExtinguisher ? {
      type: copyFromExtinguisher.type,
      location: copyFromExtinguisher.location,
      capacity: copyFromExtinguisher.capacity,
      expirationDate: new Date(),
      hydrostaticTest: undefined,
      supportType: copyFromExtinguisher.supportType,
      hasVerticalSignage: copyFromExtinguisher.hasVerticalSignage,
    } : {
      type: 'ABC' as const,
      location: '',
      capacity: '',
      expirationDate: new Date(),
      hydrostaticTest: undefined,
      supportType: undefined,
      hasVerticalSignage: false,
    };
    
    form.setValue('extinguishers', [
      ...currentExtinguishers,
      newExtinguisher
    ]);
  };

  const removeExtinguisher = (index: number) => {
    const currentExtinguishers = form.getValues('extinguishers');
    form.setValue('extinguishers', currentExtinguishers.filter((_, i) => i !== index));
  };

  const addHydrant = () => {
    const currentHydrants = form.getValues('hydrants');
    form.setValue('hydrants', [
      ...currentHydrants,
      {
        location: '',
        status: 'not_verified' as const,
        hoseExpirationDate: undefined,
        hasRegister: false,
        hasHose: false,
        hasKey: false,
        hasCoupling: false,
        hasAdapter: false,
        hasNozzle: false,
      }
    ]);
  };

  const removeHydrant = (index: number) => {
    const currentHydrants = form.getValues('hydrants');
    form.setValue('hydrants', currentHydrants.filter((_, i) => i !== index));
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

  const addDocumentFromUpload = (newDocument: any) => {
    const currentDocuments = form.getValues('documents');
    form.setValue('documents', [...currentDocuments, newDocument]);
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

  if (!canEdit) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle>Cadastro de Novo Núcleo</DialogTitle>
          
          {/* Toggle Fórum no canto superior direito */}
          <div className="absolute top-0 right-0 flex items-center space-x-2">
            <Label htmlFor="agent-mode" className="text-sm font-medium">
              Fórum
            </Label>
            <Switch
              id="agent-mode"
              checked={form.watch('isAgentMode')}
              onCheckedChange={(checked) => form.setValue('isAgentMode', checked)}
            />
          </div>
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

            {/* Local de Instalação no Mapa */}
            <div className="space-y-2">
              <Label>Local de Instalação do Núcleo</Label>
              <MapSelector
                address={address}
                onLocationSelect={(lat, lng) => {
                  form.setValue('coordinates.lat', lat);
                  form.setValue('coordinates.lng', lng);
                }}
                initialCoordinates={{
                  lat: form.watch('coordinates.lat') || -15.6014,
                  lng: form.watch('coordinates.lng') || -56.0979
                }}
              />
            </div>

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
                       <FormItem>
                         <FormLabel>Data de validade do Alvará</FormLabel>
                         <FormControl>
                           <Input
                             type="date"
                             value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                             onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined)}
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                </div>
              )}
            </div>

            {/* Extintores de Incêndio */}
            {!isAgentMode && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">Extintores de Incêndio</h3>
                  <div className="flex gap-2">
                    {extinguishers.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Copiar de:</Label>
                        <select
                          className="text-sm p-1 border border-border rounded bg-background"
                          onChange={(e) => {
                            if (e.target.value) {
                              const selectedIndex = parseInt(e.target.value);
                              addExtinguisher(extinguishers[selectedIndex]);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Selecionar extintor</option>
                          {extinguishers.map((ext, idx) => (
                            <option key={idx} value={idx}>
                              Extintor {idx + 1} ({ext.type} - {ext.location})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <Button type="button" onClick={() => addExtinguisher()} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Extintor
                    </Button>
                  </div>
                </div>

              {extinguishers.map((extintor, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Extintor {index + 1}</h4>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addExtinguisher(extintor)}
                        title="Copiar extintor"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExtinguisher(index)}
                        title="Excluir extintor"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
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
                       render={({ field }) => {
                         const currentType = form.watch(`extinguishers.${index}.type`);
                         return (
                           <FormItem>
                             <FormLabel>Capacidade</FormLabel>
                             <FormControl>
                               {currentType === 'H2O' ? (
                                 <Input 
                                   value="10L" 
                                   readOnly 
                                   className="bg-muted"
                                 />
                               ) : (
                                 <select
                                   {...field}
                                   className="w-full p-2 border border-border rounded-md bg-background"
                                 >
                                   <option value="">Selecione a capacidade</option>
                                   <option value="4kg">4kg</option>
                                   <option value="6kg">6kg</option>
                                 </select>
                               )}
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         );
                       }}
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
                         name={`extinguishers.${index}.expirationDate`}
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Data de Vencimento</FormLabel>
                             <FormControl>
                               <Input
                                 type="date"
                                 value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                 onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined)}
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />

                       <FormField
                         control={form.control}
                         name={`extinguishers.${index}.hydrostaticTest`}
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Teste Hidrostático</FormLabel>
                             <FormControl>
                               <Input
                                 type="date"
                                 value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                 onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined)}
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />

                     <FormField
                       control={form.control}
                       name={`extinguishers.${index}.supportType`}
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Tipo de Suporte</FormLabel>
                           <FormControl>
                             <select
                               {...field}
                               className="w-full p-2 border border-border rounded-md bg-background"
                             >
                               <option value="">Selecionar suporte</option>
                               <option value="wall">Parede</option>
                               <option value="tripod">Tripé</option>
                             </select>
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                     <FormField
                       control={form.control}
                       name={`extinguishers.${index}.hasVerticalSignage`}
                       render={({ field }) => (
                         <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                           <FormControl>
                             <Checkbox
                               checked={field.value}
                               onCheckedChange={field.onChange}
                             />
                           </FormControl>
                           <div className="space-y-1 leading-none">
                             <FormLabel>
                               Possui Sinalização Vertical
                             </FormLabel>
                           </div>
                         </FormItem>
                       )}
                     />
                   </div>
                </div>
              ))}
              </div>
            )}

            {/* Hidrantes */}
            {!isAgentMode && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">Hidrantes</h3>
                  <Button type="button" onClick={addHydrant} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Hidrante
                  </Button>
                </div>

              {hydrants.map((hidrant, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Hidrante {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHydrant(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`hydrants.${index}.location`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Local de Instalação</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Entrada Principal, Corredor A" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`hydrants.${index}.status`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="w-full p-2 border border-border rounded-md bg-background"
                            >
                              <option value="verified">Verificado</option>
                              <option value="not_verified">Não Verificado</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                     <FormField
                       control={form.control}
                       name={`hydrants.${index}.hoseExpirationDate`}
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Validade da Mangueira (Opcional)</FormLabel>
                           <FormControl>
                             <Input
                               type="date"
                               value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                               onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined)}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                  </div>

                  {/* Acessórios do Hidrante */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Acessórios</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`hydrants.${index}.hasRegister`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm">Registro</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`hydrants.${index}.hasHose`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm">Mangueira</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`hydrants.${index}.hasKey`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm">Chave</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`hydrants.${index}.hasCoupling`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm">Engate (Storz)</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`hydrants.${index}.hasAdapter`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm">Adaptador</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`hydrants.${index}.hasNozzle`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm">Esguicho</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}

            {/* Documentos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">Documentos</h3>
              </div>

              {/* Upload Component */}
              <DocumentUpload onDocumentAdd={addDocumentFromUpload} />

              {documents.map((document, index) => (
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
                            <Input placeholder="Ex: Planta baixa" {...field} />
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
                          <FormLabel>Tipo</FormLabel>
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

                    {document.url && (
                      <div className="md:col-span-2">
                        <Label>Link do Documento</Label>
                        <div className="flex gap-2">
                          <Input
                            value={document.url}
                            readOnly
                            className="bg-muted"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.open(document.url, '_blank')}
                          >
                            Visualizar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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