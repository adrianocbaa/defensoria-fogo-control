import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useEffect } from "react";

interface Occurrence {
  id?: string;
  titulo: string;
  descricao?: string;
  gravidade: number;
  impacto_cronograma: boolean;
  acao_imediata?: string;
}

interface OcorrenciasStepProps {
  reportId?: string;
  obraId: string;
}

export function OcorrenciasStep({ reportId, obraId }: OcorrenciasStepProps) {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, Partial<Occurrence>>>({});
  const debouncedValues = useDebounce(localValues, 500);

  const { data: occurrences = [], isLoading } = useQuery({
    queryKey: ['rdo-occurrences', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('rdo_occurrences')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Occurrence[];
    },
    enabled: !!reportId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) {
        toast.error('Salve o RDO antes de adicionar ocorrências');
        return;
      }

      const { error } = await supabase.from('rdo_occurrences').insert({
        obra_id: obraId,
        report_id: reportId,
        titulo: '',
        gravidade: 3,
        impacto_cronograma: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-occurrences', reportId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: keyof Occurrence; value: any }) => {
      const { error } = await supabase
        .from('rdo_occurrences')
        .update({ [field]: value })
        .eq('id', id);
      
      if (error) throw error;
    },
  });

  useEffect(() => {
    Object.entries(debouncedValues).forEach(([id, fields]) => {
      Object.entries(fields).forEach(([field, value]) => {
        updateMutation.mutate({ id, field: field as keyof Occurrence, value });
      });
    });
    setLocalValues({});
  }, [debouncedValues]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rdo_occurrences')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-occurrences', reportId] });
      toast.success('Ocorrência removida');
    },
  });

  const getGravidadeBadge = (gravidade: number) => {
    if (gravidade >= 4) return <Badge variant="destructive">Alta</Badge>;
    if (gravidade === 3) return <Badge className="bg-orange-500">Média</Badge>;
    return <Badge variant="secondary">Baixa</Badge>;
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Ocorrências</CardTitle>
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
        <CardTitle>Ocorrências</CardTitle>
        <Button onClick={() => addMutation.mutate()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {occurrences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma ocorrência registrada.
          </div>
        ) : (
          occurrences.map((occurrence) => (
            <div
              key={occurrence.id}
              className={`p-4 border rounded-lg space-y-3 ${
                occurrence.gravidade >= 4 ? 'border-destructive/50 bg-destructive/5' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  {occurrence.gravidade >= 4 && (
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                  )}
                  <Input
                    placeholder="Título da ocorrência"
                    value={localValues[occurrence.id!]?.titulo ?? occurrence.titulo}
                    onChange={(e) =>
                      setLocalValues(prev => ({
                        ...prev,
                        [occurrence.id!]: { ...prev[occurrence.id!], titulo: e.target.value }
                      }))
                    }
                    className="flex-1"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(occurrence.id!)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Gravidade (1-5)</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() =>
                          updateMutation.mutate({
                            id: occurrence.id!,
                            field: 'gravidade',
                            value: level,
                          })
                        }
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          level <= occurrence.gravidade
                            ? level >= 4
                              ? 'bg-destructive border-destructive'
                              : level === 3
                              ? 'bg-orange-500 border-orange-500'
                              : 'bg-yellow-500 border-yellow-500'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                {getGravidadeBadge(occurrence.gravidade)}
              </div>

              <Textarea
                placeholder="Descrição da ocorrência..."
                rows={2}
                value={(localValues[occurrence.id!]?.descricao ?? occurrence.descricao) || ''}
                onChange={(e) =>
                  setLocalValues(prev => ({
                    ...prev,
                    [occurrence.id!]: { ...prev[occurrence.id!], descricao: e.target.value }
                  }))
                }
              />

              <div className="flex items-center gap-2">
                <Switch
                  checked={occurrence.impacto_cronograma}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({
                      id: occurrence.id!,
                      field: 'impacto_cronograma',
                      value: checked,
                    })
                  }
                />
                <Label>Impacto no cronograma</Label>
              </div>

              {occurrence.impacto_cronograma && (
                <Textarea
                  placeholder="Ação imediata necessária..."
                  rows={2}
                  value={(localValues[occurrence.id!]?.acao_imediata ?? occurrence.acao_imediata) || ''}
                  onChange={(e) =>
                    setLocalValues(prev => ({
                      ...prev,
                      [occurrence.id!]: { ...prev[occurrence.id!], acao_imediata: e.target.value }
                    }))
                  }
                />
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
