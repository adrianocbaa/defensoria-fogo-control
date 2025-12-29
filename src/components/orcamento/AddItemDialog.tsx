import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateOrcamentoItem } from '@/hooks/useOrcamentoItens';
import { useBaseComposicoes } from '@/hooks/useBaseComposicoes';
import type { OrcamentoItem } from '@/types/orcamento';
import { Search } from 'lucide-react';

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: 'etapa' | 'composicao' | 'insumo';
  orcamentoId: string;
  existingItems: OrcamentoItem[];
  parentId?: string;
}

const unidades = ['UN', 'M', 'M²', 'M³', 'KG', 'L', 'H', 'VB', 'MÊS', 'DIA'];

export function AddItemDialog({
  open,
  onOpenChange,
  tipo,
  orcamentoId,
  existingItems,
  parentId,
}: AddItemDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBase, setSelectedBase] = useState<string | null>(null);
  
  const createItem = useCreateOrcamentoItem();
  const { data: baseComposicoes, isLoading: loadingBases } = useBaseComposicoes(searchTerm);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      descricao: '',
      codigo: '',
      unidade: 'UN',
      quantidade: 0,
      preco_unitario_base: 0,
      eh_mao_de_obra: false,
    },
  });

  // Calculate next item number
  const getNextItemNumber = () => {
    const sameLevel = existingItems.filter(i => i.parent_id === (parentId || null) && i.tipo === tipo);
    const maxNum = sameLevel.reduce((max, item) => {
      const parts = item.item_numero.split('.');
      const num = parseInt(parts[parts.length - 1]) || 0;
      return Math.max(max, num);
    }, 0);
    
    if (parentId) {
      const parent = existingItems.find(i => i.id === parentId);
      return parent ? `${parent.item_numero}.${maxNum + 1}` : String(maxNum + 1);
    }
    return String(maxNum + 1);
  };

  const onSelectBase = (baseId: string) => {
    const base = baseComposicoes?.find(b => b.id === baseId);
    if (base) {
      setValue('descricao', base.descricao);
      setValue('codigo', base.codigo);
      setValue('unidade', base.unidade);
      setValue('preco_unitario_base', base.preco_unitario);
      setValue('eh_mao_de_obra', base.eh_mao_de_obra);
      setSelectedBase(baseId);
    }
  };

  const onSubmit = async (data: any) => {
    const nivel = parentId ? (existingItems.find(i => i.id === parentId)?.nivel || 0) + 1 : 1;
    const ordem = existingItems.filter(i => i.parent_id === (parentId || null)).length;

    await createItem.mutateAsync({
      orcamento_id: orcamentoId,
      parent_id: parentId || null,
      nivel,
      ordem,
      item_numero: getNextItemNumber(),
      tipo: tipo === 'etapa' ? 'etapa' : tipo === 'composicao' ? 'servico' : 'insumo',
      codigo: data.codigo || null,
      codigo_base: selectedBase ? baseComposicoes?.find(b => b.id === selectedBase)?.codigo : null,
      fonte: selectedBase ? baseComposicoes?.find(b => b.id === selectedBase)?.fonte : null,
      descricao: data.descricao,
      unidade: tipo === 'etapa' ? null : data.unidade,
      quantidade: tipo === 'etapa' ? 0 : parseFloat(data.quantidade) || 0,
      preco_unitario_base: tipo === 'etapa' ? 0 : parseFloat(data.preco_unitario_base) || 0,
      preco_unitario_com_bdi: 0,
      valor_total: 0,
      bdi_personalizado: null,
      encargo_personalizado: null,
      eh_mao_de_obra: data.eh_mao_de_obra,
    });

    reset();
    setSelectedBase(null);
    setSearchTerm('');
    onOpenChange(false);
  };

  const tipoLabels = {
    etapa: 'Nova Etapa',
    composicao: 'Nova Composição/Serviço',
    insumo: 'Novo Insumo',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tipoLabels[tipo]}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Search from base (for composicao and insumo) */}
          {tipo !== 'etapa' && (
            <div className="space-y-2">
              <Label>Buscar na base de composições</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchTerm && baseComposicoes && baseComposicoes.length > 0 && (
                <div className="border rounded-md max-h-48 overflow-auto">
                  {baseComposicoes.map((base) => (
                    <button
                      key={base.id}
                      type="button"
                      onClick={() => onSelectBase(base.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b last:border-b-0 ${
                        selectedBase === base.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-sm text-primary">{base.codigo}</span>
                          <span className="mx-2">-</span>
                          <span className="text-sm">{base.descricao}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{base.fonte}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                placeholder={tipo === 'etapa' ? 'Opcional' : 'Ex: 73610'}
                {...register('codigo')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                placeholder="Nome do item"
                {...register('descricao', { required: 'Descrição é obrigatória' })}
              />
              {errors.descricao && (
                <span className="text-sm text-destructive">{errors.descricao.message}</span>
              )}
            </div>
          </div>

          {tipo !== 'etapa' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unidade">Unidade</Label>
                  <Select
                    value={watch('unidade')}
                    onValueChange={(v) => setValue('unidade', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    step="0.000001"
                    {...register('quantidade')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preco_unitario_base">Preço Unitário (R$)</Label>
                  <Input
                    id="preco_unitario_base"
                    type="number"
                    step="0.01"
                    {...register('preco_unitario_base')}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="eh_mao_de_obra"
                  checked={watch('eh_mao_de_obra')}
                  onCheckedChange={(checked) => setValue('eh_mao_de_obra', !!checked)}
                />
                <Label htmlFor="eh_mao_de_obra">É mão de obra (aplica encargos sociais)</Label>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createItem.isPending}>
              {createItem.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
