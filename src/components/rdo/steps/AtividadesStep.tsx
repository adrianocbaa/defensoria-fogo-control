import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, FileSpreadsheet, Sparkles, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AtividadesManualMode } from "./AtividadesManualMode";
import { AtividadesPlanilhaMode } from "./AtividadesPlanilhaMode";
import { AtividadesTemplateMode } from "./AtividadesTemplateMode";
import { ChooseModeDialog } from "../ChooseModeDialog";
import { useRdoConfig, ModoAtividades } from "@/hooks/useRdoConfig";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [localValues, setLocalValues] = useState<Record<string, Partial<Activity>>>({});
  const [showChooseDialog, setShowChooseDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  
  // Buscar configuração da obra
  const { config, isLoading: isLoadingConfig, createConfig, updateConfig, isCreating } = useRdoConfig(obraId);

  // Abrir dialog se não existe config
  useEffect(() => {
    if (!isLoadingConfig && !config) {
      setShowChooseDialog(true);
    }
  }, [isLoadingConfig, config]);

  const selectedMode = config?.modo_atividades || 'manual';

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['rdo-activities', reportId, selectedMode],
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
    enabled: !!reportId && !!config,
  });

  const handleConfirmMode = async (mode: ModoAtividades) => {
    createConfig({
      obra_id: obraId,
      modo_atividades: mode,
      chosen_by: user?.id,
    });

    // Atualizar também o RDO atual para consistência
    if (reportId) {
      await supabase
        .from('rdo_reports')
        .update({ modo_atividades: mode })
        .eq('id', reportId);
      
      queryClient.invalidateQueries({ queryKey: ['rdo-activities', reportId] });
    }

    setShowChooseDialog(false);
  };

  const handleChangeMode = async (mode: ModoAtividades) => {
    updateConfig({
      obra_id: obraId,
      modo_atividades: mode,
    });

    // Atualizar também o RDO atual
    if (reportId) {
      await supabase
        .from('rdo_reports')
        .update({ modo_atividades: mode })
        .eq('id', reportId);
      
      queryClient.invalidateQueries({ queryKey: ['rdo-activities', reportId] });
    }

    setShowChangeDialog(false);
  };

  if (isLoadingConfig || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const getModeLabel = (mode: ModoAtividades) => {
    switch (mode) {
      case 'manual':
        return 'Preenchimento Manual';
      case 'planilha':
        return 'Lista de Serviços (Planilha)';
      case 'template':
        return 'Modelo Padrão';
    }
  };

  return (
    <>
      <ChooseModeDialog
        open={showChooseDialog}
        onConfirm={handleConfirmMode}
        isLoading={isCreating}
      />

      <AlertDialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Alterar Modo de Preenchimento
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta ação alterará o modo de preenchimento para <strong>todos os RDOs futuros</strong> desta obra.
              </p>
              <p className="text-destructive font-medium">
                ⚠️ Atenção: Esta mudança pode invalidar dados já lançados nos RDOs anteriores.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Re-open choose dialog to select new mode
                setShowChangeDialog(false);
                setShowChooseDialog(true);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-4">
        {/* Info do Modo Atual */}
        {config && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedMode === 'manual' && <Edit className="h-5 w-5 text-primary" />}
                  {selectedMode === 'planilha' && <FileSpreadsheet className="h-5 w-5 text-primary" />}
                  {selectedMode === 'template' && <Sparkles className="h-5 w-5 text-primary" />}
                  <div>
                    <p className="text-sm font-medium">Modo da obra:</p>
                    <p className="text-lg font-semibold">{getModeLabel(selectedMode)}</p>
                  </div>
                  <Badge variant="secondary" className="ml-2">Fixado</Badge>
                </div>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChangeDialog(true)}
                  >
                    Alterar Modo
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {selectedMode === 'manual' 
                  ? 'Registre manualmente as atividades executadas no dia'
                  : selectedMode === 'planilha'
                  ? 'Preencha os serviços da planilha orçamentária vinculada à obra'
                  : 'Carregue um template pré-definido e personalize conforme necessário'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Conteúdo do Modo Selecionado */}
        {selectedMode === 'manual' ? (
          <AtividadesManualMode
            reportId={reportId}
            obraId={obraId}
            activities={activities}
            localValues={localValues}
            setLocalValues={setLocalValues}
          />
        ) : selectedMode === 'planilha' ? (
          <AtividadesPlanilhaMode
            reportId={reportId}
            obraId={obraId}
            dataRdo={data}
          />
        ) : (
          <AtividadesTemplateMode
            reportId={reportId}
            obraId={obraId}
            localValues={localValues}
            setLocalValues={setLocalValues}
          />
        )}
      </div>
    </>
  );
}
