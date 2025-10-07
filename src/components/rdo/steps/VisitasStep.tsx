import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useEffect } from "react";

interface Visit {
  id?: string;
  visitante: string;
  cargo?: string;
  instituicao?: string;
  hora?: string;
  assunto?: string;
}

interface VisitasStepProps {
  reportId?: string;
  obraId: string;
}

export function VisitasStep({ reportId, obraId }: VisitasStepProps) {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, Partial<Visit>>>({});
  const debouncedValues = useDebounce(localValues, 500);

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['rdo-visits', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('rdo_visits')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Visit[];
    },
    enabled: !!reportId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) {
        toast.error('Salve o RDO antes de adicionar visitas');
        return;
      }

      const { error } = await supabase.from('rdo_visits').insert({
        obra_id: obraId,
        report_id: reportId,
        visitante: '',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-visits', reportId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: keyof Visit; value: any }) => {
      const { error } = await supabase
        .from('rdo_visits')
        .update({ [field]: value })
        .eq('id', id);
      
      if (error) throw error;
    },
  });

  useEffect(() => {
    Object.entries(debouncedValues).forEach(([id, fields]) => {
      Object.entries(fields).forEach(([field, value]) => {
        updateMutation.mutate({ id, field: field as keyof Visit, value });
      });
    });
    setLocalValues({});
  }, [debouncedValues]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rdo_visits')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-visits', reportId] });
      toast.success('Visita removida');
    },
  });

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Visitas</CardTitle>
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
        <CardTitle>Visitas</CardTitle>
        <Button onClick={() => addMutation.mutate()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {visits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma visita registrada.
          </div>
        ) : (
          visits.map((visit) => (
            <div key={visit.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Input
                  placeholder="Nome do visitante"
                  value={localValues[visit.id!]?.visitante ?? visit.visitante}
                  onChange={(e) =>
                    setLocalValues(prev => ({
                      ...prev,
                      [visit.id!]: { ...prev[visit.id!], visitante: e.target.value }
                    }))
                  }
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(visit.id!)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Cargo"
                  value={(localValues[visit.id!]?.cargo ?? visit.cargo) || ''}
                  onChange={(e) =>
                    setLocalValues(prev => ({
                      ...prev,
                      [visit.id!]: { ...prev[visit.id!], cargo: e.target.value }
                    }))
                  }
                />
                <Input
                  placeholder="Instituição"
                  value={(localValues[visit.id!]?.instituicao ?? visit.instituicao) || ''}
                  onChange={(e) =>
                    setLocalValues(prev => ({
                      ...prev,
                      [visit.id!]: { ...prev[visit.id!], instituicao: e.target.value }
                    }))
                  }
                />
                <Input
                  type="time"
                  placeholder="Hora"
                  value={visit.hora || ''}
                  onChange={(e) =>
                    updateMutation.mutate({
                      id: visit.id!,
                      field: 'hora',
                      value: e.target.value,
                    })
                  }
                />
              </div>

              <Textarea
                placeholder="Assunto da visita..."
                rows={2}
                value={(localValues[visit.id!]?.assunto ?? visit.assunto) || ''}
                onChange={(e) =>
                  setLocalValues(prev => ({
                    ...prev,
                    [visit.id!]: { ...prev[visit.id!], assunto: e.target.value }
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
