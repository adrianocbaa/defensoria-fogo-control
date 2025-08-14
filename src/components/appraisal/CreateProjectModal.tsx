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
import { projectsApi, Project } from '@/services/appraisalApi';

const projectSchema = z.object({
  purpose: z.string().min(1, 'Finalidade é obrigatória'),
  base_date: z.string().min(1, 'Data base é obrigatória'),
  approach: z.string().min(1, 'Método é obrigatório'),
  property_id: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface CreateProjectModalProps {
  onSuccess?: (project: Project) => void;
}

export function CreateProjectModal({ onSuccess }: CreateProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      base_date: new Date().toISOString().split('T')[0],
    },
  });

  const approachValue = watch('approach');

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true);
    try {
      const result = await projectsApi.create(data);
      
      if (result.error) {
        throw result.error;
      }

      toast({
        title: 'Sucesso',
        description: 'Projeto criado com sucesso!',
      });

      if (result.data) {
        onSuccess?.(result.data);
      }
      
      setOpen(false);
      reset();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar projeto',
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
          Novo Projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="purpose">Finalidade *</Label>
              <Textarea
                id="purpose"
                placeholder="Ex: Avaliação para garantia hipotecária"
                {...register('purpose')}
                disabled={loading}
              />
              {errors.purpose && (
                <p className="text-sm text-destructive mt-1">{errors.purpose.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base_date">Data Base *</Label>
                <Input
                  id="base_date"
                  type="date"
                  {...register('base_date')}
                  disabled={loading}
                />
                {errors.base_date && (
                  <p className="text-sm text-destructive mt-1">{errors.base_date.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="approach">Método de Avaliação *</Label>
                <Select
                  value={approachValue}
                  onValueChange={(value) => setValue('approach', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comparativo_mercado">Comparativo de Mercado</SelectItem>
                    <SelectItem value="custo_reposicao">Custo de Reposição</SelectItem>
                    <SelectItem value="renda">Método da Renda</SelectItem>
                    <SelectItem value="evolutivo">Método Evolutivo</SelectItem>
                    <SelectItem value="residual">Método Residual</SelectItem>
                  </SelectContent>
                </Select>
                {errors.approach && (
                  <p className="text-sm text-destructive mt-1">{errors.approach.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="property_id">Imóvel (Opcional)</Label>
              <Input
                id="property_id"
                placeholder="ID do imóvel (se aplicável)"
                {...register('property_id')}
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
              Criar Projeto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateProjectModal;