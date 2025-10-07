import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useEffect } from "react";

interface Equipment {
  id?: string;
  equipamento: string;
  proprio_ou_terceiro?: 'proprio' | 'terceiro';
  horas_trabalhadas?: number;
  situacao?: 'operante' | 'parado' | 'manutencao';
  observacao?: string;
}

interface EquipamentosStepProps {
  reportId?: string;
  obraId: string;
  data: string;
}

export function EquipamentosStep({ reportId, obraId, data }: EquipamentosStepProps) {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, Partial<Equipment>>>({});
  const debouncedValues = useDebounce(localValues, 500);

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['rdo-equipment', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('rdo_equipment')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Equipment[];
    },
    enabled: !!reportId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) {
        toast.error('Salve o RDO antes de adicionar equipamentos');
        return;
      }

      const { error } = await supabase.from('rdo_equipment').insert({
        obra_id: obraId,
        report_id: reportId,
        equipamento: '',
        situacao: 'operante',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-equipment', reportId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: keyof Equipment; value: any }) => {
      const { error } = await supabase
        .from('rdo_equipment')
        .update({ [field]: value })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-equipment', reportId] });
    },
  });

  useEffect(() => {
    Object.entries(debouncedValues).forEach(([id, fields]) => {
      Object.entries(fields).forEach(([field, value]) => {
        updateMutation.mutate({ id, field: field as keyof Equipment, value });
      });
    });
    setLocalValues({});
  }, [debouncedValues]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rdo_equipment')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-equipment', reportId] });
      toast.success('Equipamento removido');
    },
  });

  const copyFromYesterday = async () => {
    // Placeholder para copiar equipamentos do dia anterior
    toast.info('Funcionalidade de copiar do dia anterior em desenvolvimento');
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Equipamentos</CardTitle>
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
        <CardTitle>Equipamentos</CardTitle>
        <div className="flex gap-2">
          <Button onClick={copyFromYesterday} size="sm" variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Duplicar de ontem
          </Button>
          <Button onClick={() => addMutation.mutate()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {equipment.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum equipamento registrado.
          </div>
        ) : (
          equipment.map((equip) => (
            <div key={equip.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Input
                  placeholder="Nome do equipamento"
                  value={localValues[equip.id!]?.equipamento ?? equip.equipamento}
                  onChange={(e) =>
                    setLocalValues(prev => ({
                      ...prev,
                      [equip.id!]: { ...prev[equip.id!], equipamento: e.target.value }
                    }))
                  }
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(equip.id!)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select
                  value={equip.proprio_ou_terceiro}
                  onValueChange={(v) =>
                    updateMutation.mutate({
                      id: equip.id!,
                      field: 'proprio_ou_terceiro',
                      value: v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprio">Próprio</SelectItem>
                    <SelectItem value="terceiro">Terceiro</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="Horas trabalhadas"
                  value={equip.horas_trabalhadas || ''}
                  onChange={(e) =>
                    updateMutation.mutate({
                      id: equip.id!,
                      field: 'horas_trabalhadas',
                      value: parseFloat(e.target.value) || undefined,
                    })
                  }
                />

                <Select
                  value={equip.situacao}
                  onValueChange={(v) =>
                    updateMutation.mutate({
                      id: equip.id!,
                      field: 'situacao',
                      value: v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operante">✓ Operante</SelectItem>
                    <SelectItem value="parado">⏸ Parado</SelectItem>
                    <SelectItem value="manutencao">🔧 Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder="Observações sobre o equipamento..."
                rows={2}
                value={(localValues[equip.id!]?.observacao ?? equip.observacao) || ''}
                onChange={(e) =>
                  setLocalValues(prev => ({
                    ...prev,
                    [equip.id!]: { ...prev[equip.id!], observacao: e.target.value }
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
