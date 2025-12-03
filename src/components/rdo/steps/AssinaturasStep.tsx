import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check, AlertCircle, History, XCircle, ThumbsDown } from "lucide-react";
import { createAuditLog } from "@/hooks/useRdoAuditLog";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AssinaturasStepProps {
  reportId: string;
  obraId: string;
  reportData: any;
  onUpdate: () => void;
}

export function AssinaturasStep({
  reportId,
  obraId,
  reportData,
  onUpdate,
}: AssinaturasStepProps) {
  const { user } = useAuth();
  const { canEdit, isAdmin, isContratada } = useUserRole();
  const [isSaving, setIsSaving] = useState(false);
  
  const canValidateFiscal = canEdit || isAdmin;
  const canValidateContratada = isContratada;
  
  const isApproved = reportData?.status === "aprovado";
  
  const [fiscalNome, setFiscalNome] = useState(reportData?.assinatura_fiscal_nome || "");
  const [fiscalCargo, setFiscalCargo] = useState(reportData?.assinatura_fiscal_cargo || "");
  const [fiscalDocumento, setFiscalDocumento] = useState(reportData?.assinatura_fiscal_documento || "");
  const [fiscalValidadoLocal, setFiscalValidadoLocal] = useState<string | null>(reportData?.assinatura_fiscal_validado_em || null);
  
  const [contratadaNome, setContratadaNome] = useState(reportData?.assinatura_contratada_nome || "");
  const [contratadaCargo, setContratadaCargo] = useState(reportData?.assinatura_contratada_cargo || "");
  const [contratadaDocumento, setContratadaDocumento] = useState(reportData?.assinatura_contratada_documento || "");
  const [contratadaValidadoLocal, setContratadaValidadoLocal] = useState<string | null>(reportData?.assinatura_contratada_validado_em || null);
  const [rejectObservation, setRejectObservation] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  
  // Usar estado local para atualização imediata da UI
  const fiscalValidado = fiscalValidadoLocal;
  const contratadaValidado = contratadaValidadoLocal;

  // Buscar histórico de reprovações
  const { data: rejectionHistory } = useQuery({
    queryKey: ['rdo-rejection-history', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from('rdo_audit_log')
        .select('*')
        .eq('report_id', reportId)
        .eq('acao', 'REPROVAR')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!reportId,
  });

  const handleValidateFiscal = async () => {
    if (!canValidateFiscal) {
      toast.error("Você não tem permissão para validar esta assinatura");
      return;
    }
    
    if (!fiscalNome || !fiscalCargo || !fiscalDocumento) {
      toast.error("Preencha todos os campos do Fiscal/Gestor");
      return;
    }

    setIsSaving(true);
    try {
      const validatedAt = new Date().toISOString();
      
      // Se a contratada já validou, quando o fiscal assinar = APROVADO automaticamente
      const contratadaJaValidou = reportData?.assinatura_contratada_validado_em;
      const novoStatus = contratadaJaValidou ? 'aprovado' : reportData?.status;
      
      const { error: updateError } = await supabase
        .from("rdo_reports")
        .update({
          assinatura_fiscal_nome: fiscalNome,
          assinatura_fiscal_cargo: fiscalCargo,
          assinatura_fiscal_documento: fiscalDocumento,
          assinatura_fiscal_validado_em: validatedAt,
          fiscal_concluido_em: validatedAt,
          status: novoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (updateError) throw updateError;

      await createAuditLog({
        obraId,
        reportId,
        acao: contratadaJaValidou ? "APROVAR" : "ASSINAR_FISCAL",
        detalhes: { nome: fiscalNome, cargo: fiscalCargo, documento: fiscalDocumento },
        actorId: user?.id,
        actorNome: fiscalNome,
      });

      // Atualizar estado local imediatamente para refletir na UI
      setFiscalValidadoLocal(validatedAt);
      
      if (contratadaJaValidou) {
        toast.success("RDO aprovado com sucesso!");
      } else {
        toast.success("Validação do Fiscal/Gestor registrada. Aguardando Contratada.");
      }
      onUpdate();
    } catch (error: any) {
      console.error("Error validating fiscal signature:", error);
      toast.error("Erro ao validar assinatura");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectObservation.trim()) {
      toast.error("Informe o motivo da reprovação");
      return;
    }

    setIsSaving(true);
    try {
      // Reprovar = reabrir automaticamente o RDO (limpar assinaturas e voltar para preenchendo)
      const { error: updateError } = await supabase
        .from("rdo_reports")
        .update({
          status: 'preenchendo',
          aprovacao_observacao: rejectObservation,
          assinatura_fiscal_validado_em: null,
          assinatura_contratada_validado_em: null,
          fiscal_concluido_em: null,
          contratada_concluido_em: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (updateError) throw updateError;

      await createAuditLog({
        obraId,
        reportId,
        acao: "REPROVAR",
        detalhes: { observacao: rejectObservation },
        actorId: user?.id,
      });

      // Resetar estados locais
      setFiscalValidadoLocal(null);
      setContratadaValidadoLocal(null);
      setRejectObservation("");
      setShowRejectInput(false);

      toast.success("RDO reprovado e reaberto para edição");
      onUpdate();
    } catch (error: any) {
      console.error("Error rejecting RDO:", error);
      toast.error("Erro ao reprovar RDO");
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateContratada = async () => {
    if (!contratadaNome || !contratadaCargo || !contratadaDocumento) {
      toast.error("Preencha todos os campos do Responsável Técnico");
      return;
    }

    setIsSaving(true);
    try {
      const validatedAt = new Date().toISOString();
      
      // Verificar se o fiscal já validou para determinar o status
      const fiscalJaValidou = reportData?.assinatura_fiscal_validado_em;
      const novoStatus = fiscalJaValidou ? 'concluido' : reportData?.status;
      
      const { error: updateError } = await supabase
        .from("rdo_reports")
        .update({
          assinatura_contratada_nome: contratadaNome,
          assinatura_contratada_cargo: contratadaCargo,
          assinatura_contratada_documento: contratadaDocumento,
          assinatura_contratada_validado_em: validatedAt,
          contratada_concluido_em: validatedAt,
          status: novoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (updateError) throw updateError;

      await createAuditLog({
        obraId,
        reportId,
        acao: "ASSINAR_CONTRATADA",
        detalhes: { nome: contratadaNome, cargo: contratadaCargo, documento: contratadaDocumento },
        actorId: user?.id,
        actorNome: contratadaNome,
      });

      // Atualizar estado local imediatamente para refletir na UI
      setContratadaValidadoLocal(validatedAt);
      
      if (fiscalJaValidou) {
        toast.success("RDO concluído por ambas as partes e pronto para aprovação");
      } else {
        toast.success("Validação do Responsável Técnico registrada. Aguardando Fiscal.");
      }
      onUpdate();
    } catch (error: any) {
      console.error("Error validating contratada signature:", error);
      toast.error("Erro ao validar assinatura");
    } finally {
      setIsSaving(false);
    }
  };

  // Valores para exibição (preferir reportData para garantir dados salvos)
  const fiscalNomeDisplay = reportData?.assinatura_fiscal_nome || fiscalNome;
  const fiscalCargoDisplay = reportData?.assinatura_fiscal_cargo || fiscalCargo;
  const fiscalDocumentoDisplay = reportData?.assinatura_fiscal_documento || fiscalDocumento;
  
  const contratadaNomeDisplay = reportData?.assinatura_contratada_nome || contratadaNome;
  const contratadaCargoDisplay = reportData?.assinatura_contratada_cargo || contratadaCargo;
  const contratadaDocumentoDisplay = reportData?.assinatura_contratada_documento || contratadaDocumento;
  
  // Ambos validaram
  const bothValidated = fiscalValidado && contratadaValidado;
  
  // Determinar se deve mostrar ambas assinaturas
  // - Aprovado: mostrar ambas
  // - Ambos validaram: mostrar ambas
  const showBothSignatures = isApproved || bothValidated;
  
  // Pendente de aprovação (ambos validaram, mas ainda não foi aprovado)
  const isPendingApproval = bothValidated && !isApproved;
  
  // Determinar se deve mostrar os campos de validação
  // Mostrar campos se: não aprovado E (falta assinatura de alguma parte)
  const showValidationFields = !isApproved && (!fiscalValidado || !contratadaValidado);

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-xl font-semibold mb-2">Validação de Assinaturas</h2>
        <p className="text-sm text-muted-foreground">
          Preencha os dados e valide para registrar sua assinatura no relatório
        </p>
      </div>

      {/* Histórico de Reprovações */}
      {rejectionHistory && rejectionHistory.length > 0 && (
        <Collapsible defaultOpen={rejectionHistory.length > 0}>
          <Card className="border-amber-200 dark:border-amber-800">
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 rounded-lg transition-colors">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-semibold">Histórico de Reprovações ({rejectionHistory.length})</h3>
              </div>
              <span className="text-sm text-muted-foreground">Clique para expandir</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-3">
                {rejectionHistory.map((item: any, index: number) => (
                  <div 
                    key={item.id} 
                    className="flex gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900"
                  >
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-red-700 dark:text-red-300">
                          Reprovação #{rejectionHistory.length - index}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          {new Date(item.created_at).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}
                        </span>
                      </div>
                      <p className="text-sm mt-1 text-foreground">
                        <span className="font-medium">Motivo:</span>{' '}
                        {item.detalhes?.observacao || 'Não informado'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Mostrar campos de validação apenas se necessário */}
      {showValidationFields && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fiscal/Gestor - mostrar se não validado */}
        {!fiscalValidado && canValidateFiscal && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Assinatura do Fiscal/Gestor (DPE-MT)</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fiscal-nome">Nome *</Label>
              <Input
                id="fiscal-nome"
                value={fiscalNome}
                onChange={(e) => setFiscalNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="fiscal-cargo">Cargo *</Label>
              <Input
                id="fiscal-cargo"
                value={fiscalCargo}
                onChange={(e) => setFiscalCargo(e.target.value)}
                placeholder="Cargo/Função"
              />
            </div>
            <div>
              <Label htmlFor="fiscal-documento">CREA/CPF/ID *</Label>
              <Input
                id="fiscal-documento"
                value={fiscalDocumento}
                onChange={(e) => setFiscalDocumento(e.target.value)}
                placeholder="Documento"
              />
            </div>
            <Button
              onClick={handleValidateFiscal}
              disabled={isSaving}
              className="w-full"
            >
              Validar Assinatura
            </Button>
            
            {/* Botão Reprovar - apenas quando Contratada já assinou */}
            {contratadaValidado && !showRejectInput && (
              <Button
                variant="destructive"
                onClick={() => setShowRejectInput(true)}
                disabled={isSaving}
                className="w-full"
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Reprovar RDO
              </Button>
            )}
            
            {/* Input de motivo da reprovação */}
            {showRejectInput && (
              <div className="space-y-2 border-t pt-4 mt-2">
                <Label htmlFor="reject-observation">Motivo da Reprovação *</Label>
                <Input
                  id="reject-observation"
                  value={rejectObservation}
                  onChange={(e) => setRejectObservation(e.target.value)}
                  placeholder="Descreva o motivo da reprovação"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isSaving || !rejectObservation.trim()}
                    className="flex-1"
                  >
                    Confirmar Reprovação
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectInput(false);
                      setRejectObservation("");
                    }}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
        )}
        
        {fiscalValidado && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-green-700 dark:text-green-400">Fiscal/Gestor (DPE-MT) - Validado</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>
                <span className="ml-2 text-primary">{fiscalNomeDisplay}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cargo:</span>
                <span className="ml-2">{fiscalCargoDisplay}</span>
              </div>
              <div>
                <span className="text-muted-foreground">CREA/CPF/ID:</span>
                <span className="ml-2">{fiscalDocumentoDisplay}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Validado em:</span>
                <span className="ml-2">{new Date(fiscalValidado).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Contratada - mostrar formulário apenas se não validou ainda */}
        {!contratadaValidado && canValidateContratada && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Assinatura do Responsável Técnico (Contratada)</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contratada-nome">Nome *</Label>
              <Input
                id="contratada-nome"
                value={contratadaNome}
                onChange={(e) => setContratadaNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="contratada-cargo">Cargo *</Label>
              <Input
                id="contratada-cargo"
                value={contratadaCargo}
                onChange={(e) => setContratadaCargo(e.target.value)}
                placeholder="Cargo/Função"
              />
            </div>
            <div>
              <Label htmlFor="contratada-documento">CREA/CPF/ID *</Label>
              <Input
                id="contratada-documento"
                value={contratadaDocumento}
                onChange={(e) => setContratadaDocumento(e.target.value)}
                placeholder="Documento"
              />
            </div>
            <Button
              onClick={handleValidateContratada}
              disabled={isSaving}
              className="w-full"
            >
              Validar Assinatura
            </Button>
          </div>
        </Card>
        )}
        
        {/* Card de validado da Contratada - aparece para todos verem após validação */}
        {contratadaValidado && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-green-700 dark:text-green-400">Responsável Técnico (Contratada) - Validado</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>
                <span className="ml-2 text-primary">{contratadaNomeDisplay}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cargo:</span>
                <span className="ml-2">{contratadaCargoDisplay}</span>
              </div>
              <div>
                <span className="text-muted-foreground">CREA/CPF/ID:</span>
                <span className="ml-2">{contratadaDocumentoDisplay}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Validado em:</span>
                <span className="ml-2">{new Date(contratadaValidado).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</span>
              </div>
            </div>
          </Card>
        )}
        </div>
      )}


      {/* Mostrar resumo completo quando ambos validaram ou quando aprovado */}
      {showBothSignatures && (
        <>
          {isPendingApproval ? (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                🔒 RDO concluído por ambas as partes. Todas as edições estão bloqueadas. Aguardando aprovação final.
              </p>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ RDO aprovado. As assinaturas não podem mais ser alteradas.
              </p>
            </div>
          )}

          {/* Resumo das Assinaturas - ambas visíveis */}
          <Card className="border-primary/20">
            <div className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                Resumo das Assinaturas
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resumo Fiscal */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-medium">Fiscal/Gestor (DPE-MT)</h4>
                  </div>
                  
                  <div className="space-y-2 pl-10">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="text-sm font-medium">{fiscalNomeDisplay || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cargo</p>
                      <p className="text-sm">{fiscalCargoDisplay || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CREA/CPF/ID</p>
                      <p className="text-sm">{fiscalDocumentoDisplay || "—"}</p>
                    </div>
                    {fiscalValidado && (
                      <div>
                        <p className="text-xs text-muted-foreground">Data/Hora da Validação</p>
                        <p className="text-sm">{new Date(fiscalValidado).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resumo Contratada */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-medium">Responsável Técnico (Contratada)</h4>
                  </div>
                  
                  <div className="space-y-2 pl-10">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="text-sm font-medium">{contratadaNomeDisplay || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cargo</p>
                      <p className="text-sm">{contratadaCargoDisplay || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CREA/CPF/ID</p>
                      <p className="text-sm">{contratadaDocumentoDisplay || "—"}</p>
                    </div>
                    {contratadaValidado && (
                      <div>
                        <p className="text-xs text-muted-foreground">Data/Hora da Validação</p>
                        <p className="text-sm">{new Date(contratadaValidado).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
