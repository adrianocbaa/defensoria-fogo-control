import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMonths, addYears } from 'date-fns';
import { CalendarIcon, Upload, X } from 'lucide-react';
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
  hasHydrant: z.boolean(),
  hasAVCB: z.boolean(),
  avcbExpirationDate: z.date().optional(),
  avcbFile: z.any().optional(),
  extinguishers: z.object({
    h2o: z.object({
      quantity: z.number().min(0),
      firstRechargeDate: z.date().optional(),
    }),
    pqs: z.object({
      quantity: z.number().min(0),
      firstRechargeDate: z.date().optional(),
    }),
    co2: z.object({
      quantity: z.number().min(0),
      firstRechargeDate: z.date().optional(),
    }),
    abc: z.object({
      quantity: z.number().min(0),
      firstRechargeDate: z.date().optional(),
    }),
  }),
  hydrant: z.object({
    hoseExpirationDate: z.date().optional(),
    projectFile: z.any().optional(),
    brigadeCertificateFile: z.any().optional(),
  }).optional(),
});

type NucleusFormData = z.infer<typeof nucleusFormSchema>;

interface NucleusFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NucleusFormData) => void;
}

export function NucleusForm({ open, onOpenChange, onSubmit }: NucleusFormProps) {
  const [avcbFile, setAvcbFile] = useState<File | null>(null);
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [brigadeFile, setBrigadeFile] = useState<File | null>(null);

  const form = useForm<NucleusFormData>({
    resolver: zodResolver(nucleusFormSchema),
    defaultValues: {
      name: '',
      city: '',
      address: '',
      coordinates: { lat: -15.6014, lng: -56.0979 }, // Default to Cuiabá coordinates
      hasHydrant: false,
      hasAVCB: false,
      extinguishers: {
        h2o: { quantity: 0 },
        pqs: { quantity: 0 },
        co2: { quantity: 0 },
        abc: { quantity: 0 },
      },
      hydrant: {},
    },
  });

  const hasHydrant = form.watch('hasHydrant');
  const hasAVCB = form.watch('hasAVCB');

  const calculateNextRecharge = (firstRechargeDate: Date) => {
    return addMonths(firstRechargeDate, 12);
  };

  const calculateCylinderMaintenance = (firstRechargeDate: Date) => {
    return addMonths(firstRechargeDate, 36);
  };

  const calculateHoseStatus = (hoseDate: Date) => {
    const expirationDate = addYears(hoseDate, 5);
    const now = new Date();
    return {
      expirationDate,
      isExpired: expirationDate < now,
    };
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void
  ) => {
    const file = event.target.files?.[0] || null;
    setter(file);
  };

  const handleSubmit = (data: NucleusFormData) => {
    onSubmit(data);
    form.reset();
    setAvcbFile(null);
    setProjectFile(null);
    setBrigadeFile(null);
    onOpenChange(false);
  };

  const ExtinguisherSection = ({ type, label }: { type: keyof NucleusFormData['extinguishers']; label: string }) => {
    const quantity = form.watch(`extinguishers.${type}.quantity`);
    const firstRechargeDate = form.watch(`extinguishers.${type}.firstRechargeDate`);

    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <h4 className="font-medium text-primary">{label}</h4>
        
        <FormField
          control={form.control}
          name={`extinguishers.${type}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {quantity > 0 && (
          <>
            <FormField
              control={form.control}
              name={`extinguishers.${type}.firstRechargeDate`}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data da 1ª recarga</FormLabel>
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

            {firstRechargeDate && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Próxima recarga:</span>
                  <span className="font-medium">
                    {format(calculateNextRecharge(firstRechargeDate), "dd/MM/yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manutenção do cilindro:</span>
                  <span className="font-medium">
                    {format(calculateCylinderMaintenance(firstRechargeDate), "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
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

            {/* Localização no Mapa */}
            <div className="space-y-2">
              <Label>Localização do Núcleo</Label>
              <MapSelector
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

            {/* AVCB */}
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
                    <FormLabel>Possui AVCB</FormLabel>
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
                        <FormLabel>Data de validade do AVCB</FormLabel>
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

                  <div>
                    <Label>Anexar AVCB</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, setAvcbFile)}
                        className="hidden"
                        id="avcb-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('avcb-file')?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {avcbFile ? avcbFile.name : 'Selecionar arquivo'}
                      </Button>
                      {avcbFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAvcbFile(null)}
                          className="mt-2"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remover arquivo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Extintores */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Extintores</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ExtinguisherSection type="h2o" label="H2O" />
                <ExtinguisherSection type="pqs" label="PQS" />
                <ExtinguisherSection type="co2" label="CO2" />
                <ExtinguisherSection type="abc" label="ABC" />
              </div>
            </div>

            {/* Informações do Hidrante */}
            {hasHydrant && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="text-lg font-semibold text-primary">Informações do Hidrante</h3>
                
                <FormField
                  control={form.control}
                  name="hydrant.hoseExpirationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de vencimento das mangueiras</FormLabel>
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
                      {field.value && (
                        <div className="text-sm mt-2">
                          {(() => {
                            const status = calculateHoseStatus(field.value);
                            return (
                              <div className={cn(
                                "p-2 rounded",
                                status.isExpired ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
                              )}>
                                Data de vencimento: {format(status.expirationDate, "dd/MM/yyyy")} - 
                                <span className="font-medium ml-1">
                                  {status.isExpired ? "VENCIDO" : "VÁLIDO"}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div>
                    <Label>Anexar Projeto</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, setProjectFile)}
                        className="hidden"
                        id="project-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('project-file')?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {projectFile ? projectFile.name : 'Selecionar projeto'}
                      </Button>
                      {projectFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setProjectFile(null)}
                          className="mt-2"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remover arquivo
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Anexar Certificado de Brigadistas</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, setBrigadeFile)}
                        className="hidden"
                        id="brigade-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('brigade-file')?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {brigadeFile ? brigadeFile.name : 'Selecionar certificado'}
                      </Button>
                      {brigadeFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setBrigadeFile(null)}
                          className="mt-2"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remover arquivo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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