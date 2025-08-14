import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';
import { propertiesApi, Property } from '@/services/appraisalApi';

const propertySchema = z.object({
  kind: z.enum(['urban', 'rural'], { required_error: 'Tipo é obrigatório' }),
  address: z.string().min(1, 'Endereço é obrigatório'),
  lat: z.number().optional(),
  lon: z.number().optional(),
  land_area: z.number().positive('Área do terreno deve ser positiva').optional(),
  built_area: z.number().positive('Área construída deve ser positiva').optional(),
  quality: z.string().optional(),
  age: z.number().min(0, 'Idade não pode ser negativa').optional(),
  condition: z.string().optional(),
  zoning: z.string().optional(),
  constraints: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface CreatePropertyModalProps {
  onSuccess?: (property: Property) => void;
}

export function CreatePropertyModal({ onSuccess }: CreatePropertyModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
  });

  const kindValue = watch('kind');
  const qualityValue = watch('quality');
  const conditionValue = watch('condition');

  const onSubmit = async (data: PropertyFormData) => {
    setLoading(true);
    try {
      // Ensure required fields are present
      if (!data.kind || !data.address) {
        throw new Error('Campos obrigatórios não preenchidos');
      }
      
      const result = await propertiesApi.create(data as Omit<Property, 'id' | 'created_at' | 'updated_at'>);
      
      if (result.error) {
        throw result.error;
      }

      toast({
        title: 'Sucesso',
        description: 'Imóvel criado com sucesso!',
      });

      if (result.data) {
        onSuccess?.(result.data);
      }
      
      setOpen(false);
      reset();
    } catch (error: any) {
      console.error('Error creating property:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar imóvel',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Imóvel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Imóvel</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="kind">Tipo *</Label>
                <Select
                  value={kindValue}
                  onValueChange={(value) => setValue('kind', value as 'urban' | 'rural')}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urban">Urbano</SelectItem>
                    <SelectItem value="rural">Rural</SelectItem>
                  </SelectContent>
                </Select>
                {errors.kind && (
                  <p className="text-sm text-destructive mt-1">{errors.kind.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="address">Endereço *</Label>
                <Input
                  id="address"
                  placeholder="Endereço completo"
                  {...register('address')}
                  disabled={loading}
                />
                {errors.address && (
                  <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  placeholder="-23.5505"
                  {...register('lat', { valueAsNumber: true })}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="lon">Longitude</Label>
                <Input
                  id="lon"
                  type="number"
                  step="any"
                  placeholder="-46.6333"
                  {...register('lon', { valueAsNumber: true })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="land_area">Área do Terreno (m²)</Label>
                <Input
                  id="land_area"
                  type="number"
                  step="0.01"
                  placeholder="300.00"
                  {...register('land_area', { valueAsNumber: true })}
                  disabled={loading}
                />
                {errors.land_area && (
                  <p className="text-sm text-destructive mt-1">{errors.land_area.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="built_area">Área Construída (m²)</Label>
                <Input
                  id="built_area"
                  type="number"
                  step="0.01"
                  placeholder="180.00"
                  {...register('built_area', { valueAsNumber: true })}
                  disabled={loading}
                />
                {errors.built_area && (
                  <p className="text-sm text-destructive mt-1">{errors.built_area.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quality">Qualidade</Label>
                <Select
                  value={qualityValue}
                  onValueChange={(value) => setValue('quality', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inferior">Inferior</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Superior">Superior</SelectItem>
                    <SelectItem value="Luxo">Luxo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="age">Idade (anos)</Label>
                <Input
                  id="age"
                  type="number"
                  min="0"
                  placeholder="10"
                  {...register('age', { valueAsNumber: true })}
                  disabled={loading}
                />
                {errors.age && (
                  <p className="text-sm text-destructive mt-1">{errors.age.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="condition">Estado de Conservação</Label>
                <Select
                  value={conditionValue}
                  onValueChange={(value) => setValue('condition', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Novo">Novo</SelectItem>
                    <SelectItem value="Excelente">Excelente</SelectItem>
                    <SelectItem value="Bom">Bom</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Ruim">Ruim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="zoning">Zoneamento</Label>
              <Input
                id="zoning"
                placeholder="Ex: Residencial, Comercial, Misto"
                {...register('zoning')}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="constraints">Restrições</Label>
              <Textarea
                id="constraints"
                placeholder="Descreva restrições, limitações ou observações importantes"
                {...register('constraints')}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar Imóvel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePropertyModal;