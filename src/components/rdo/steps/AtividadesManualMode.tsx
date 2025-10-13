import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface Activity {
  id?: string;
  descricao: string;
  progresso: number;
  status: 'em_andamento' | 'concluida';
  observacao?: string;
}

interface AtividadesManualModeProps {
  reportId?: string;
  obraId: string;
  activities: Activity[];
  localValues: Record<string, Partial<Activity>>;
  setLocalValues: React.Dispatch<React.SetStateAction<Record<string, Partial<Activity>>>>;
}

export function AtividadesManualMode({
  reportId,
  obraId,
  activities,
  localValues,
  setLocalValues,
}: AtividadesManualModeProps) {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) {
        toast.error('Salve o RDO antes de adicionar atividades');
        return;
      }

      const { error } = await supabase.from('rdo_activities').insert({
        obra_id: obraId,
        report_id: reportId,
        tipo: 'manual',
        descricao: '',
        progresso: 0,
        status: 'em_andamento',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-activities', reportId] });
      toast.success('Atividade adicionada');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-activities', reportId] });
    },
  });

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

  const handleBlur = (activityId: string, field: keyof Activity) => {
    const value = localValues[activityId]?.[field];
    if (value !== undefined) {
      updateMutation.mutate({ id: activityId, field, value });
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Edit className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Preenchimento Manual</CardTitle>
        </div>
        <Button onClick={() => addMutation.mutate()} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Adicionar</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma atividade registrada.</p>
            <p className="text-sm mt-1">Clique em "Adicionar" para começar.</p>
          </div>
        ) : (
          activities.map((activity) => {
            const progresso = localValues[activity.id!]?.progresso ?? activity.progresso;
            return (
              <div key={activity.id} className="p-4 border rounded-xl space-y-3 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <Input
                    placeholder="Descrição da atividade executada"
                    value={localValues[activity.id!]?.descricao ?? activity.descricao}
                    onChange={(e) =>
                      setLocalValues(prev => ({
                        ...prev,
                        [activity.id!]: { ...prev[activity.id!], descricao: e.target.value }
                      }))
                    }
                    onBlur={() => handleBlur(activity.id!, 'descricao')}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(activity.id!)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <label className="font-medium">Progresso</label>
                      <span className="font-semibold text-primary">{progresso}%</span>
                    </div>
                    <Slider
                      value={[progresso]}
                      onValueChange={([value]) => {
                        setLocalValues(prev => ({
                          ...prev,
                          [activity.id!]: { ...prev[activity.id!], progresso: value }
                        }));
                      }}
                      onValueCommit={() => handleBlur(activity.id!, 'progresso')}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <Select
                    value={localValues[activity.id!]?.status ?? activity.status}
                    onValueChange={(v: 'em_andamento' | 'concluida') => {
                      setLocalValues(prev => ({
                        ...prev,
                        [activity.id!]: { ...prev[activity.id!], status: v }
                      }));
                      updateMutation.mutate({
                        id: activity.id!,
                        field: 'status',
                        value: v,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                    </SelectContent>
                  </Select>

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
                    onBlur={() => handleBlur(activity.id!, 'observacao')}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
