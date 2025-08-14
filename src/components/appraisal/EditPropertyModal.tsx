import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { propertiesApi, Property } from '@/services/appraisalApi';
import { toast } from '@/hooks/use-toast';
import { Edit } from 'lucide-react';

const propertySchema = z.object({
  kind: z.enum(['urban', 'rural'], { required_error: 'Tipo é obrigatório' }),
  address: z.string().min(1, 'Endereço é obrigatório'),
  lat: z.number().optional(),
  lon: z.number().optional(),
  land_area: z.number().min(0, 'Área do terreno deve ser positiva').optional(),
  built_area: z.number().min(0, 'Área construída deve ser positiva').optional(),
  quality: z.enum(['Inferior', 'Normal', 'Superior'], { required_error: 'Qualidade é obrigatória' }),
  age: z.number().min(0, 'Idade deve ser positiva').optional(),
  condition: z.enum(['Ruim', 'Regular', 'Bom', 'Ótimo'], { required_error: 'Estado de conservação é obrigatório' }),
  zoning: z.string().optional(),
  constraints: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface EditPropertyModalProps {
  property: Property;
  onSuccess?: (property: Property) => void;
}

export function EditPropertyModal({ property, onSuccess }: EditPropertyModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      kind: property.kind as 'urban' | 'rural',
      address: property.address || '',
      lat: property.lat || undefined,
      lon: property.lon || undefined,
      land_area: property.land_area || undefined,
      built_area: property.built_area || undefined,
      quality: property.quality as 'Inferior' | 'Normal' | 'Superior',
      age: property.age || undefined,
      condition: property.condition as 'Ruim' | 'Regular' | 'Bom' | 'Ótimo',
      zoning: property.zoning || '',
      constraints: property.constraints || '',
    }
  });

  const onSubmit = async (data: PropertyFormData) => {
    setLoading(true);
    try {
      await propertiesApi.update(property.id, data);
      
      toast({
        title: 'Sucesso',
        description: 'Imóvel atualizado com sucesso!',
      });

      setOpen(false);
      onSuccess?.(property);
    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar imóvel. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Imóvel</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kind">Tipo</Label>
              <Select 
                value={watch('kind')} 
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
              {errors.kind && <p className="text-red-500 text-sm">{errors.kind.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quality">Qualidade</Label>
              <Select 
                value={watch('quality')} 
                onValueChange={(value) => setValue('quality', value as 'Inferior' | 'Normal' | 'Superior')}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a qualidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inferior">Inferior</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Superior">Superior</SelectItem>
                </SelectContent>
              </Select>
              {errors.quality && <p className="text-red-500 text-sm">{errors.quality.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              placeholder="Endereço completo do imóvel"
              {...register('address')}
              disabled={loading}
            />
            {errors.address && <p className="text-red-500 text-sm">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                placeholder="Ex: -15.7801"
                {...register('lat', { valueAsNumber: true })}
                disabled={loading}
              />
              {errors.lat && <p className="text-red-500 text-sm">{errors.lat.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lon">Longitude</Label>
              <Input
                id="lon"
                type="number"
                step="any"
                placeholder="Ex: -47.9292"
                {...register('lon', { valueAsNumber: true })}
                disabled={loading}
              />
              {errors.lon && <p className="text-red-500 text-sm">{errors.lon.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="land_area">Área do Terreno (m²)</Label>
              <Input
                id="land_area"
                type="number"
                placeholder="Ex: 300"
                {...register('land_area', { valueAsNumber: true })}
                disabled={loading}
              />
              {errors.land_area && <p className="text-red-500 text-sm">{errors.land_area.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="built_area">Área Construída (m²)</Label>
              <Input
                id="built_area"
                type="number"
                placeholder="Ex: 150"
                {...register('built_area', { valueAsNumber: true })}
                disabled={loading}
              />
              {errors.built_area && <p className="text-red-500 text-sm">{errors.built_area.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Idade (anos)</Label>
              <Input
                id="age"
                type="number"
                placeholder="Ex: 10"
                {...register('age', { valueAsNumber: true })}
                disabled={loading}
              />
              {errors.age && <p className="text-red-500 text-sm">{errors.age.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Estado de Conservação</Label>
              <Select 
                value={watch('condition')} 
                onValueChange={(value) => setValue('condition', value as 'Ruim' | 'Regular' | 'Bom' | 'Ótimo')}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ruim">Ruim</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Bom">Bom</SelectItem>
                  <SelectItem value="Ótimo">Ótimo</SelectItem>
                </SelectContent>
              </Select>
              {errors.condition && <p className="text-red-500 text-sm">{errors.condition.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zoning">Zoneamento</Label>
            <Input
              id="zoning"
              placeholder="Ex: Residencial, Comercial, Industrial"
              {...register('zoning')}
              disabled={loading}
            />
            {errors.zoning && <p className="text-red-500 text-sm">{errors.zoning.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="constraints">Restrições</Label>
            <Textarea
              id="constraints"
              placeholder="Descreva quaisquer restrições ou limitações do imóvel"
              {...register('constraints')}
              disabled={loading}
              rows={3}
            />
            {errors.constraints && <p className="text-red-500 text-sm">{errors.constraints.message}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}