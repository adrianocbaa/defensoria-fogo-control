import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useEffect } from "react";

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
}

const FUNCOES_COMUNS = [
  'Engenheiro',
  'Mestre de Obras',
  'Pedreiro',
  'Servente',
  'Carpinteiro',
  'Eletricista',
  'Encanador',
  'Pintor',
  'Armador',
  'Operador de Máquinas',
];

export function MaoDeObraStep({ reportId, obraId }: MaoDeObraStepProps) {
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

  const addMutation = useMutation({
    mutationFn: async (funcao?: string) => {
      if (!reportId) {
        toast.error('Salve o RDO antes de adicionar mão de obra');
        return;
      }

      const { error } = await supabase.from('rdo_workforce').insert({
        obra_id: obraId,
        report_id: reportId,
        funcao: funcao || '',
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
  });

  useEffect(() => {
    Object.entries(debouncedValues).forEach(([id, fields]) => {
      Object.entries(fields).forEach(([field, value]) => {
        updateMutation.mutate({ id, field: field as keyof Workforce, value });
      });
    });
    setLocalValues({});
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
      toast.success('Função removida');
    },
  });

  const copyFromYesterday = async () => {
    toast.info('Funcionalidade de copiar do dia anterior em desenvolvimento');
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Mão de Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Mão de Obra</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Adicionar função comum:</span>
          {FUNCOES_COMUNS.filter(f => !workforce.some(w => w.funcao === f)).map((funcao) => (
            <Badge
              key={funcao}
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
              onClick={() => addMutation.mutate(funcao)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {funcao}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={copyFromYesterday} size="sm" variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Duplicar de ontem
          </Button>
          <Button onClick={() => addMutation.mutate(undefined)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Outra função
          </Button>
        </div>

        {workforce.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma função registrada. Use os badges acima para adicionar rapidamente.
          </div>
        ) : (
          <div className="space-y-3">
            {workforce.map((worker) => (
              <div key={worker.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Input
                    placeholder="Função"
                    value={localValues[worker.id!]?.funcao ?? worker.funcao}
                    onChange={(e) =>
                      setLocalValues(prev => ({
                        ...prev,
                        [worker.id!]: { ...prev[worker.id!], funcao: e.target.value }
                      }))
                    }
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(worker.id!)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select
                    value={worker.origem}
                    onValueChange={(v) =>
                      updateMutation.mutate({
                        id: worker.id!,
                        field: 'origem',
                        value: v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="propria">Própria</SelectItem>
                      <SelectItem value="empreiteira">Empreiteira</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    placeholder="Quantidade"
                    min="0"
                    value={worker.quantidade}
                    onChange={(e) =>
                      updateMutation.mutate({
                        id: worker.id!,
                        field: 'quantidade',
                        value: parseInt(e.target.value) || 0,
                      })
                    }
                  />

                  <Input
                    type="number"
                    placeholder="Horas"
                    min="0"
                    step="0.5"
                    value={worker.horas}
                    onChange={(e) =>
                      updateMutation.mutate({
                        id: worker.id!,
                        field: 'horas',
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <Textarea
                  placeholder="Observações sobre esta equipe..."
                  rows={2}
                  value={(localValues[worker.id!]?.observacao ?? worker.observacao) || ''}
                  onChange={(e) =>
                    setLocalValues(prev => ({
                      ...prev,
                      [worker.id!]: { ...prev[worker.id!], observacao: e.target.value }
                    }))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
