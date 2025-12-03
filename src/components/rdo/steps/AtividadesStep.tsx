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
  disabled?: boolean;
  ensureRdoExists?: () => Promise<string | null>;
}

export function AtividadesStep({ reportId, obraId, data, disabled, ensureRdoExists }: AtividadesStepProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin, isContratada, canEdit } = useUserRole();
  const [localValues, setLocalValues] = useState<Record<string, Partial<Activity>>>({});
  const [showChooseDialog, setShowChooseDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | undefined>(reportId);
  
  // Somente Fiscal (admin, editor, gm) pode definir o modo - Contratada não pode
  const isFiscal = canEdit && !isContratada;
  
  // Buscar configuração da obra
  const { config, isLoading: isLoadingConfig, createConfig, updateConfig, isCreating } = useRdoConfig(obraId);

  // Criar RDO automaticamente quando entrar nesta aba se não existir
  useEffect(() => {
    let isMounted = true;
    
    if (!reportId && !currentReportId && ensureRdoExists && config) {
      ensureRdoExists()
        .then((newId) => {
          if (isMounted && newId) {
            setCurrentReportId(newId);
          }
        })
        .catch((error) => {
          console.error('Erro ao criar RDO automaticamente:', error);
        });
    }
    
    return () => {
      isMounted = false;
    };
  }, [reportId, currentReportId, ensureRdoExists, config]);

  // Sincronizar reportId quando vier do parent
  useEffect(() => {
    if (reportId) {
      setCurrentReportId(reportId);
    }
  }, [reportId]);

  // Abrir dialog se não existe config E usuário é Fiscal
  useEffect(() => {
    if (!isLoadingConfig && !config && isFiscal) {
      setShowChooseDialog(true);
    }
  }, [isLoadingConfig, config, isFiscal]);

  const selectedMode = config?.modo_atividades || 'manual';

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['rdo-activities', currentReportId, selectedMode],
    queryFn: async () => {
      if (!currentReportId) return [];
      const { data, error } = await supabase
        .from('rdo_activities')
        .select('*')
        .eq('report_id', currentReportId)
        .eq('tipo', selectedMode)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!currentReportId && !!config,
  });

  const handleConfirmMode = async (mode: ModoAtividades) => {
    createConfig({
      obra_id: obraId,
      modo_atividades: mode,
      chosen_by: user?.id,
    });

    // Atualizar também o RDO atual para consistência
    if (currentReportId) {
      await supabase
        .from('rdo_reports')
        .update({ modo_atividades: mode })
        .eq('id', currentReportId);
      
      queryClient.invalidateQueries({ queryKey: ['rdo-activities', currentReportId] });
    }

    setShowChooseDialog(false);
  };

  const handleChangeMode = async (mode: ModoAtividades) => {
    updateConfig({
      obra_id: obraId,
      modo_atividades: mode,
    });

    // Atualizar também o RDO atual
    if (currentReportId) {
      await supabase
        .from('rdo_reports')
        .update({ modo_atividades: mode })
        .eq('id', currentReportId);
      
      queryClient.invalidateQueries({ queryKey: ['rdo-activities', currentReportId] });
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

  // Se não existe config e usuário é Contratada, mostrar mensagem de aguardo
  if (!config && isContratada) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Modo de Preenchimento Pendente</h3>
            <p className="text-muted-foreground max-w-md">
              O Fiscal ainda não definiu o modo de preenchimento das atividades para esta obra.
              Aguarde a definição para prosseguir com o registro das atividades.
            </p>
          </div>
        </CardContent>
      </Card>
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
      {/* Dialog só aparece para Fiscal */}
      {isFiscal && (
        <ChooseModeDialog
          open={showChooseDialog}
          onConfirm={handleConfirmMode}
          isLoading={isCreating}
        />
      )}

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
                {isFiscal && !disabled && (
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
            reportId={currentReportId}
            obraId={obraId}
            activities={activities}
            localValues={localValues}
            setLocalValues={setLocalValues}
            disabled={disabled}
          />
        ) : selectedMode === 'planilha' ? (
          <AtividadesPlanilhaMode
            reportId={currentReportId}
            obraId={obraId}
            dataRdo={data}
            disabled={disabled}
          />
        ) : (
          <AtividadesTemplateMode
            reportId={currentReportId}
            obraId={obraId}
            localValues={localValues}
            setLocalValues={setLocalValues}
            disabled={disabled}
          />
        )}
      </div>
    </>
  );
}
