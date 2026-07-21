import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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
  disabled?: boolean;
}

const GRAVIDADE_LEVELS = [
  { level: 1, label: "1-Baixa", cls: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" },
  { level: 2, label: "2-Leve", cls: "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" },
  { level: 3, label: "3-Média", cls: "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400" },
  { level: 4, label: "4-Alta", cls: "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400" },
  { level: 5, label: "5-Crítica", cls: "border-red-600 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
];

export function OcorrenciasStep({ reportId, obraId, disabled }: OcorrenciasStepProps) {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, Partial<Occurrence>>>({});
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
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
    onMutate: async (variables: { id: string; field: keyof Occurrence; value: any }) => {
      await queryClient.cancelQueries({ queryKey: ['rdo-occurrences', reportId] });
      const previous = queryClient.getQueryData<Occurrence[]>(['rdo-occurrences', reportId]);
      if (previous) {
        const next = previous.map((o) =>
          o.id === variables.id ? { ...o, [variables.field]: variables.value } as Occurrence : o
        );
        queryClient.setQueryData(['rdo-occurrences', reportId], next);
      }
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if ((context as any)?.previous) {
        queryClient.setQueryData(['rdo-occurrences', reportId], (context as any).previous);
      }
      toast.error('Não foi possível salvar. Tente novamente.');
    },
    onSuccess: (_data, variables) => {
      const { id, field } = variables as { id: string; field: keyof Occurrence; value: any };
      setLocalValues((prev) => {
        const next = { ...prev };
        const obj = { ...(next[id] || {}) } as Partial<Occurrence>;
        delete (obj as any)[field];
        if (Object.keys(obj).length === 0) delete next[id];
        else next[id] = obj;
        return next;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-occurrences', reportId] });
    },
  });

  useEffect(() => {
    Object.entries(debouncedValues).forEach(([id, fields]) => {
      Object.entries(fields).forEach(([field, value]) => {
        updateMutation.mutate({ id, field: field as keyof Occurrence, value });
      });
    });
     
  }, [debouncedValues]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rdo_occurrences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-occurrences', reportId] });
      toast.success('Ocorrência removida');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Registro de Ocorrências do Dia</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Descreva qualquer anomalia, quebra de contrato, atrasos operacionais ou paralisações justificadas.
          </p>
        </div>
        {!disabled && (
          <Button
            onClick={() => addMutation.mutate()}
            className="bg-primary hover:bg-primary/90 shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Ocorrência
          </Button>
        )}
      </div>

      {occurrences.length === 0 ? (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma ocorrência registrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {occurrences.map((occurrence) => {
            const isEditingTitle = editingTitleId === occurrence.id;
            const currentTitle = localValues[occurrence.id!]?.titulo ?? occurrence.titulo;
            return (
              <Card key={occurrence.id} className="rounded-2xl shadow-sm">
                <CardContent className="p-6 space-y-5">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {isEditingTitle ? (
                        <Input
                          autoFocus
                          placeholder="Título da ocorrência"
                          value={currentTitle}
                          onChange={(e) =>
                            setLocalValues((prev) => ({
                              ...prev,
                              [occurrence.id!]: { ...prev[occurrence.id!], titulo: e.target.value },
                            }))
                          }
                          onBlur={() => setEditingTitleId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingTitleId(null);
                          }}
                          disabled={disabled}
                          className="text-lg font-semibold h-auto py-1"
                        />
                      ) : (
                        <h3 className="text-lg font-semibold truncate">
                          {currentTitle || <span className="text-muted-foreground font-normal italic">Sem título</span>}
                        </h3>
                      )}
                    </div>
                    {!disabled && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingTitleId(isEditingTitle ? null : occurrence.id!)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteMutation.mutate(occurrence.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Gravidade */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Nível de Gravidade</Label>
                    <div className="flex flex-wrap gap-2">
                      {GRAVIDADE_LEVELS.map((g) => {
                        const active = occurrence.gravidade === g.level;
                        return (
                          <button
                            key={g.level}
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              updateMutation.mutate({
                                id: occurrence.id!,
                                field: 'gravidade',
                                value: g.level,
                              })
                            }
                            className={cn(
                              "px-3 py-1.5 rounded-md border text-sm transition-all",
                              active
                                ? g.cls + " font-medium"
                                : "border-border bg-background text-muted-foreground hover:border-primary/50",
                              disabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {g.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Relato */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Relato Consolidado</Label>
                    <Textarea
                      placeholder="Descreva a ocorrência..."
                      rows={3}
                      value={(localValues[occurrence.id!]?.descricao ?? occurrence.descricao) || ''}
                      onChange={(e) =>
                        setLocalValues((prev) => ({
                          ...prev,
                          [occurrence.id!]: { ...prev[occurrence.id!], descricao: e.target.value },
                        }))
                      }
                      disabled={disabled}
                      className="bg-muted/30 resize-none"
                    />
                  </div>

                  {/* Impacto no cronograma */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Gera impacto no cronograma?</Label>
                    <Switch
                      checked={occurrence.impacto_cronograma}
                      onCheckedChange={(checked) =>
                        updateMutation.mutate({
                          id: occurrence.id!,
                          field: 'impacto_cronograma',
                          value: checked,
                        })
                      }
                      disabled={disabled}
                    />
                  </div>

                  {occurrence.impacto_cronograma && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          Justificativa do Impacto
                        </Label>
                        <Textarea
                          placeholder="Descreva a ação imediata necessária e o impacto no cronograma..."
                          rows={3}
                          value={(localValues[occurrence.id!]?.acao_imediata ?? occurrence.acao_imediata) || ''}
                          onChange={(e) =>
                            setLocalValues((prev) => ({
                              ...prev,
                              [occurrence.id!]: { ...prev[occurrence.id!], acao_imediata: e.target.value },
                            }))
                          }
                          disabled={disabled}
                          className="bg-background resize-none"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
