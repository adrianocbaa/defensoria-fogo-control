import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, FileSpreadsheet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AtividadesManualMode } from "./AtividadesManualMode";
import { AtividadesPlanilhaMode } from "./AtividadesPlanilhaMode";
import { toast } from "sonner";

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
  data: string;
}

export function AtividadesStep({ reportId, obraId, data }: AtividadesStepProps) {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, Partial<Activity>>>({});
  const [selectedMode, setSelectedMode] = useState<'manual' | 'planilha'>('manual');

  // Buscar modo salvo no RDO
  const { data: rdoReport } = useQuery({
    queryKey: ['rdo-report-mode', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      const { data, error } = await supabase
        .from('rdo_reports')
        .select('modo_atividades')
        .eq('id', reportId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  // Atualizar modo selecionado quando carregar do banco
  useEffect(() => {
    if (rdoReport?.modo_atividades) {
      setSelectedMode(rdoReport.modo_atividades as 'manual' | 'planilha');
    }
  }, [rdoReport]);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['rdo-activities', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('rdo_activities')
        .select('*')
        .eq('report_id', reportId)
        .eq('tipo', selectedMode)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!reportId,
  });

  const updateModeMutation = useMutation({
    mutationFn: async (mode: 'manual' | 'planilha') => {
      if (!reportId) {
        toast.error('Salve o RDO antes de alterar o modo');
        return;
      }

      const { error } = await supabase
        .from('rdo_reports')
        .update({ modo_atividades: mode })
        .eq('id', reportId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-report-mode', reportId] });
      queryClient.invalidateQueries({ queryKey: ['rdo-activities', reportId] });
      toast.success('Modo de preenchimento alterado');
    },
  });

  const handleModeChange = (mode: 'manual' | 'planilha') => {
    setSelectedMode(mode);
    updateModeMutation.mutate(mode);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletor de Modo */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Modo de Preenchimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant={selectedMode === 'manual' ? 'default' : 'outline'}
              className="flex-1 justify-start gap-2"
              onClick={() => handleModeChange('manual')}
            >
              <Edit className="h-4 w-4" />
              Preenchimento Manual
              {selectedMode === 'manual' && (
                <Badge variant="secondary" className="ml-auto">Ativo</Badge>
              )}
            </Button>
            <Button
              variant={selectedMode === 'planilha' ? 'default' : 'outline'}
              className="flex-1 justify-start gap-2"
              onClick={() => handleModeChange('planilha')}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Lista de Serviços (Planilha)
              {selectedMode === 'planilha' && (
                <Badge variant="secondary" className="ml-auto">Ativo</Badge>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {selectedMode === 'manual' 
              ? 'Registre manualmente as atividades executadas no dia'
              : 'Preencha os serviços da planilha orçamentária vinculada à obra'}
          </p>
        </CardContent>
      </Card>

      {/* Conteúdo do Modo Selecionado */}
      {selectedMode === 'manual' ? (
        <AtividadesManualMode
          reportId={reportId}
          obraId={obraId}
          activities={activities}
          localValues={localValues}
          setLocalValues={setLocalValues}
        />
      ) : (
        <AtividadesPlanilhaMode
          reportId={reportId}
          obraId={obraId}
          dataRdo={data}
        />
      )}
    </div>
  );
}
