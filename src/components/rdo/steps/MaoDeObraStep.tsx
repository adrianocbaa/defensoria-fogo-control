import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useEffect, memo, useCallback } from "react";

interface Workforce {
  id?: string;
  funcao: string;
  origem?: 'propria' | 'empreiteira';
  quantidade: number;
  horas: number;
  observacao?: string;
}

interface MaoDeObraStepProps {
  reportId?: string;
  obraId: string;
  disabled?: boolean;
}

const FUNCOES_INDIRETA = [
  'Gerente de Contrato',
  'Engenheiro de Produção',
  'Técnico de Segurança',
  'Auxiliar Administrativo',
  'Comprador',
  'Orçamentista',
];

const FUNCOES_DIRETA = [
  'Ajudante Geral',
  'Armador',
  'Carpinteiro',
  'Pedreiro',
  'Soldador',
  'Eletricista',
  'Encanador',
  'Pintor',
  'Operador de Máquinas',
  'Servente',
];

interface WorkforceTableProps {
  title: string;
  items: Workforce[];
  funcoesSugeridas: string[];
  origem: 'propria' | 'empreiteira';
  disabled?: boolean;
  localValues: Record<string, Partial<Workforce>>;
  onLocalChange: (id: string, field: keyof Workforce, value: any) => void;
  onQuantidadeChange: (id: string, value: number) => void;
  onDelete: (id: string) => void;
  onAdd: (funcao: string | undefined, origem: 'propria' | 'empreiteira') => void;
}

const WorkforceTable = memo(({ 
  title, 
  items, 
  funcoesSugeridas,
  origem,
  disabled,
  localValues,
  onLocalChange,
  onQuantidadeChange,
  onDelete,
  onAdd,
}: WorkforceTableProps) => (
  <div className="flex-1 min-w-[280px]">
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-3 py-2 border-b">
        <h3 className="font-semibold text-sm text-center">{title}</h3>
      </div>
      <div className="bg-muted/30 grid grid-cols-[1fr_60px_32px] gap-1 px-2 py-1 border-b text-xs font-medium text-muted-foreground">
        <span>FUNÇÃO / CARGO</span>
        <span className="text-center">QTDE</span>
        <span></span>
      </div>
      <div className="divide-y max-h-[300px] overflow-y-auto">
        {items.map((worker) => (
          <div key={worker.id} className="grid grid-cols-[1fr_60px_32px] gap-1 px-2 py-1 items-center">
            <Input
              placeholder="Função"
              value={localValues[worker.id!]?.funcao ?? worker.funcao}
              onChange={(e) => onLocalChange(worker.id!, 'funcao', e.target.value)}
              className="h-7 text-sm border-0 shadow-none px-1 focus-visible:ring-1"
              disabled={disabled}
            />
            <Input
              type="number"
              min="0"
              value={worker.quantidade || ''}
              onChange={(e) => onQuantidadeChange(worker.id!, parseInt(e.target.value) || 0)}
              className="h-7 text-sm text-center border-0 shadow-none px-1 focus-visible:ring-1"
              disabled={disabled}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onDelete(worker.id!)}
              disabled={disabled}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Nenhum registro
          </div>
        )}
      </div>
      {!disabled && (
        <div className="border-t p-2 space-y-2">
          <div className="flex flex-wrap gap-1">
            {funcoesSugeridas.filter(f => !items.some(w => w.funcao === f)).slice(0, 4).map((funcao) => (
              <Button
                key={funcao}
                variant="outline"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => onAdd(funcao, origem)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {funcao}
              </Button>
            ))}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full h-7 text-xs"
            onClick={() => onAdd(undefined, origem)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
      )}
    </div>
  </div>
));

WorkforceTable.displayName = 'WorkforceTable';

export function MaoDeObraStep({ reportId, obraId, disabled }: MaoDeObraStepProps) {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, Partial<Workforce>>>({});
  const debouncedValues = useDebounce(localValues, 500);

  const { data: workforce = [], isLoading } = useQuery({
    queryKey: ['rdo-workforce', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('rdo_workforce')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Workforce[];
    },
    enabled: !!reportId,
  });

  // Separar por tipo (indireta = própria, direta = empreiteira)
  const maoObraIndireta = workforce.filter(w => w.origem === 'propria' || FUNCOES_INDIRETA.includes(w.funcao));
  const maoObraDireta = workforce.filter(w => w.origem === 'empreiteira' || (!FUNCOES_INDIRETA.includes(w.funcao) && FUNCOES_DIRETA.includes(w.funcao)));
  const outros = workforce.filter(w => !maoObraIndireta.includes(w) && !maoObraDireta.includes(w));

  const addMutation = useMutation({
    mutationFn: async ({ funcao, origem }: { funcao?: string; origem: 'propria' | 'empreiteira' }) => {
      if (!reportId) {
        toast.error('Salve o RDO antes de adicionar mão de obra');
        return;
      }

      const { error } = await supabase.from('rdo_workforce').insert({
        obra_id: obraId,
        report_id: reportId,
        funcao: funcao || '',
        origem,
        quantidade: 0,
        horas: 0,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-workforce', reportId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: keyof Workforce; value: any }) => {
      const { error } = await supabase
        .from('rdo_workforce')
        .update({ [field]: value })
        .eq('id', id);
      
      if (error) throw error;
    },
    onMutate: async (variables: { id: string; field: keyof Workforce; value: any }) => {
      await queryClient.cancelQueries({ queryKey: ['rdo-workforce', reportId] });
      const previous = queryClient.getQueryData<Workforce[]>(['rdo-workforce', reportId]);
      if (previous) {
        const next = previous.map((w) =>
          w.id === variables.id ? { ...w, [variables.field]: variables.value } as Workforce : w
        );
        queryClient.setQueryData(['rdo-workforce', reportId], next);
      }
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if ((context as any)?.previous) {
        queryClient.setQueryData(['rdo-workforce', reportId], (context as any).previous);
      }
      toast.error('Não foi possível salvar. Tente novamente.');
    },
    onSuccess: (_data, variables) => {
      const { id, field } = variables as { id: string; field: keyof Workforce; value: any };
      setLocalValues((prev) => {
        const next = { ...prev };
        const obj = { ...(next[id] || {}) } as Partial<Workforce>;
        delete (obj as any)[field];
        if (Object.keys(obj).length === 0) {
          delete next[id];
        } else {
          next[id] = obj;
        }
        return next;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-workforce', reportId] });
    },
  });

  useEffect(() => {
    Object.entries(debouncedValues).forEach(([id, fields]) => {
      Object.entries(fields).forEach(([field, value]) => {
        updateMutation.mutate({ id, field: field as keyof Workforce, value });
      });
    });
  }, [debouncedValues]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rdo_workforce')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-workforce', reportId] });
    },
  });

  const handleLocalChange = useCallback((id: string, field: keyof Workforce, value: any) => {
    setLocalValues(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  }, []);

  const handleQuantidadeChange = useCallback((id: string, value: number) => {
    updateMutation.mutate({ id, field: 'quantidade', value });
  }, [updateMutation]);

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleAdd = useCallback((funcao: string | undefined, origem: 'propria' | 'empreiteira') => {
    addMutation.mutate({ funcao, origem });
  }, [addMutation]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Mão de Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Mão de Obra</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          <WorkforceTable 
            title="MÃO DE OBRA INDIRETA" 
            items={[...maoObraIndireta, ...outros.filter(w => w.origem === 'propria')]}
            funcoesSugeridas={FUNCOES_INDIRETA}
            origem="propria"
            disabled={disabled}
            localValues={localValues}
            onLocalChange={handleLocalChange}
            onQuantidadeChange={handleQuantidadeChange}
            onDelete={handleDelete}
            onAdd={handleAdd}
          />
          <WorkforceTable 
            title="MÃO DE OBRA DIRETA" 
            items={[...maoObraDireta, ...outros.filter(w => w.origem !== 'propria')]}
            funcoesSugeridas={FUNCOES_DIRETA}
            origem="empreiteira"
            disabled={disabled}
            localValues={localValues}
            onLocalChange={handleLocalChange}
            onQuantidadeChange={handleQuantidadeChange}
            onDelete={handleDelete}
            onAdd={handleAdd}
          />
        </div>
      </CardContent>
    </Card>
  );
}
