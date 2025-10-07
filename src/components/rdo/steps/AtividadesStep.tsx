import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useEffect } from "react";

interface Activity {
  id?: string;
  descricao: string;
  qtd: number;
  unidade: string;
  progresso: number;
  status: 'em_andamento' | 'concluida';
  observacao?: string;
}

interface AtividadesStepProps {
  reportId?: string;
  obraId: string;
}

export function AtividadesStep({ reportId, obraId }: AtividadesStepProps) {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, Partial<Activity>>>({});
  const debouncedValues = useDebounce(localValues, 500);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['rdo-activities', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('rdo_activities')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!reportId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) {
        toast.error('Salve o RDO antes de adicionar atividades');
        return;
      }

      const { error } = await supabase.from('rdo_activities').insert({
        obra_id: obraId,
        report_id: reportId,
        descricao: '',
        qtd: 0,
        unidade: '',
        progresso: 0,
        status: 'em_andamento',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-activities', reportId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: keyof Activity; value: any }) => {
      const { error } = await supabase
        .from('rdo_activities')
        .update({ [field]: value })
        .eq('id', id);
      
      if (error) throw error;
    },
  });

  useEffect(() => {
    Object.entries(debouncedValues).forEach(([id, fields]) => {
      Object.entries(fields).forEach(([field, value]) => {
        updateMutation.mutate({ id, field: field as keyof Activity, value });
      });
    });
    setLocalValues({});
  }, [debouncedValues]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rdo_activities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-activities', reportId] });
      toast.success('Atividade removida');
    },
  });

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Atividades Executadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Atividades Executadas</CardTitle>
        <Button onClick={() => addMutation.mutate()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma atividade registrada. Clique em "Adicionar" para começar.
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Input
                  placeholder="Descrição da atividade"
                  value={localValues[activity.id!]?.descricao ?? activity.descricao}
                  onChange={(e) =>
                    setLocalValues(prev => ({
                      ...prev,
                      [activity.id!]: { ...prev[activity.id!], descricao: e.target.value }
                    }))
                  }
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(activity.id!)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input
                  type="number"
                  placeholder="Qtd"
                  value={localValues[activity.id!]?.qtd ?? activity.qtd}
                  onChange={(e) =>
                    setLocalValues(prev => ({
                      ...prev,
                      [activity.id!]: { ...prev[activity.id!], qtd: parseFloat(e.target.value) || 0 }
                    }))
                  }
                />
                <Input
                  placeholder="Unidade"
                  value={localValues[activity.id!]?.unidade ?? activity.unidade}
                  onChange={(e) =>
                    setLocalValues(prev => ({
                      ...prev,
                      [activity.id!]: { ...prev[activity.id!], unidade: e.target.value }
                    }))
                  }
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Progresso %"
                  value={localValues[activity.id!]?.progresso ?? activity.progresso}
                  onChange={(e) =>
                    setLocalValues(prev => ({
                      ...prev,
                      [activity.id!]: { ...prev[activity.id!], progresso: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }
                    }))
                  }
                />
                <Select
                  value={activity.status}
                  onValueChange={(v) =>
                    updateMutation.mutate({
                      id: activity.id!,
                      field: 'status',
                      value: v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder="Observações sobre esta atividade..."
                rows={2}
                value={(localValues[activity.id!]?.observacao ?? activity.observacao) || ''}
                onChange={(e) =>
                  setLocalValues(prev => ({
                    ...prev,
                    [activity.id!]: { ...prev[activity.id!], observacao: e.target.value }
                  }))
                }
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
