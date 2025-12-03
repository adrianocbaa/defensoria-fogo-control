import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle, History, XCircle, ThumbsDown, Send, Trash2 } from "lucide-react";
import { createAuditLog } from "@/hooks/useRdoAuditLog";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  texto: string;
  created_by?: string;
  created_at: string;
  profiles?: {
    display_name?: string;
    email?: string;
    role?: 'admin' | 'editor' | 'contratada';
  };
}

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
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [newComment, setNewComment] = useState('');
  
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

  // Buscar comentários
  const { data: comments = [], isLoading: isLoadingComments } = useQuery({
    queryKey: ['rdo-comments', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      
      const { data: commentsData, error: commentsError } = await supabase
        .from('rdo_comments')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });
      
      if (commentsError) throw commentsError;
      if (!commentsData || commentsData.length === 0) return [];
      
      const creatorIds = [...new Set(commentsData.map(c => c.created_by).filter(Boolean))];
      if (creatorIds.length === 0) return commentsData as Comment[];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, role')
        .in('user_id', creatorIds);
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }
      
      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );
      
      return commentsData.map(comment => ({
        ...comment,
        profiles: comment.created_by ? profilesMap.get(comment.created_by) : undefined
      })) as Comment[];
    },
    enabled: !!reportId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (texto: string) => {
      if (!reportId) {
        throw new Error('RDO não salvo');
      }

      const { error } = await supabase.from('rdo_comments').insert({
        obra_id: obraId,
        report_id: reportId,
        texto,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-comments', reportId] });
      setNewComment('');
      toast.success('Comentário adicionado');
    },
    onError: (error) => {
      if (error.message === 'RDO não salvo') {
        toast.error('Salve o RDO antes de adicionar comentários');
      } else {
        toast.error('Erro ao adicionar comentário');
        console.error('Error adding comment:', error);
      }
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rdo_comments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-comments', reportId] });
      toast.success('Comentário removido');
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast.error('Digite um comentário');
      return;
    }
    addCommentMutation.mutate(newComment);
  };

  const handleValidateFiscal = async () => {
    if (!reportId) {
      toast.error("Salve o RDO antes de validar a assinatura");
      return;
    }
    
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
      
      // Buscar estado atual do banco para verificar se contratada já validou
      const { data: currentReport } = await supabase
        .from("rdo_reports")
        .select("assinatura_contratada_validado_em, status")
        .eq("id", reportId)
        .single();
      
      const contratadaJaValidou = currentReport?.assinatura_contratada_validado_em;
      const novoStatus = contratadaJaValidou ? 'aprovado' : (currentReport?.status || reportData?.status);
      
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
    if (!reportId) {
      toast.error("Salve o RDO antes de validar a assinatura");
      return;
    }
    
    if (!contratadaNome || !contratadaCargo || !contratadaDocumento) {
      toast.error("Preencha todos os campos do Responsável Técnico");
      return;
    }

    setIsSaving(true);
    try {
      const validatedAt = new Date().toISOString();
      
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

  const fiscalNomeDisplay = reportData?.assinatura_fiscal_nome || fiscalNome;
  const fiscalCargoDisplay = reportData?.assinatura_fiscal_cargo || fiscalCargo;
  const fiscalDocumentoDisplay = reportData?.assinatura_fiscal_documento || fiscalDocumento;
  
  const contratadaNomeDisplay = reportData?.assinatura_contratada_nome || contratadaNome;
  const contratadaCargoDisplay = reportData?.assinatura_contratada_cargo || contratadaCargo;
  const contratadaDocumentoDisplay = reportData?.assinatura_contratada_documento || contratadaDocumento;
  
  const bothValidated = fiscalValidado && contratadaValidado;
  const showBothSignatures = isApproved || bothValidated;
  const isPendingApproval = bothValidated && !isApproved;
  const showValidationFields = !isApproved && (!fiscalValidado || !contratadaValidado);
  const isLocked = bothValidated || isApproved;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-xl font-semibold mb-2">Validação e Comentários</h2>
        <p className="text-sm text-muted-foreground">
          Preencha os dados para validar assinaturas e deixe comentários sobre o relatório
        </p>
      </div>

      {/* Alerta se RDO não foi salvo ainda */}
      {!reportId && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este RDO ainda não foi salvo. Vá em "Atividades" para que o RDO seja salvo antes de adicionar comentários ou validar assinaturas.
          </AlertDescription>
        </Alert>
      )}

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

      {/* Layout lado a lado: Assinaturas + Comentários */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Coluna Esquerda: Assinaturas */}
        <div className="space-y-4">
          {showValidationFields && (
            <div className="space-y-4">
              {/* Fiscal/Gestor - mostrar se não validado */}
              {!fiscalValidado && canValidateFiscal && (
                <Card className="p-5">
                  <h3 className="font-semibold mb-4">Assinatura do Fiscal/Gestor (DPE-MT)</h3>
                  <div className="space-y-3">
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
                      disabled={isSaving || !reportId}
                      className="w-full"
                    >
                      Validar Assinatura
                    </Button>
                    
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
                    <div><span className="text-muted-foreground">Nome:</span><span className="ml-2 text-primary">{fiscalNomeDisplay}</span></div>
                    <div><span className="text-muted-foreground">Cargo:</span><span className="ml-2">{fiscalCargoDisplay}</span></div>
                    <div><span className="text-muted-foreground">CREA/CPF/ID:</span><span className="ml-2">{fiscalDocumentoDisplay}</span></div>
                    <div><span className="text-muted-foreground">Validado em:</span><span className="ml-2">{new Date(fiscalValidado).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</span></div>
                  </div>
                </Card>
              )}

              {/* Contratada */}
              {!contratadaValidado && canValidateContratada && (
                <Card className="p-5">
                  <h3 className="font-semibold mb-4">Assinatura do Responsável Técnico (Contratada)</h3>
                  <div className="space-y-3">
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
                      disabled={isSaving || !reportId}
                      className="w-full"
                    >
                      Validar Assinatura
                    </Button>
                  </div>
                </Card>
              )}
              
              {contratadaValidado && (
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-green-700 dark:text-green-400">Responsável Técnico (Contratada) - Validado</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-muted-foreground">Nome:</span><span className="ml-2 text-primary">{contratadaNomeDisplay}</span></div>
                    <div><span className="text-muted-foreground">Cargo:</span><span className="ml-2">{contratadaCargoDisplay}</span></div>
                    <div><span className="text-muted-foreground">CREA/CPF/ID:</span><span className="ml-2">{contratadaDocumentoDisplay}</span></div>
                    <div><span className="text-muted-foreground">Validado em:</span><span className="ml-2">{new Date(contratadaValidado).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</span></div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Resumo completo quando ambos validaram ou aprovado */}
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

              <Card className="border-primary/20">
                <div className="p-5">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Resumo das Assinaturas
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {/* Resumo Fiscal */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                        </div>
                        <h4 className="font-medium text-sm">Fiscal/Gestor (DPE-MT)</h4>
                      </div>
                      <div className="space-y-1 pl-8 text-sm">
                        <p><span className="text-muted-foreground">Nome:</span> {fiscalNomeDisplay || "—"}</p>
                        <p><span className="text-muted-foreground">Cargo:</span> {fiscalCargoDisplay || "—"}</p>
                        {fiscalValidado && (
                          <p><span className="text-muted-foreground">Validado:</span> {new Date(fiscalValidado).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</p>
                        )}
                      </div>
                    </div>

                    {/* Resumo Contratada */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                        </div>
                        <h4 className="font-medium text-sm">Responsável Técnico (Contratada)</h4>
                      </div>
                      <div className="space-y-1 pl-8 text-sm">
                        <p><span className="text-muted-foreground">Nome:</span> {contratadaNomeDisplay || "—"}</p>
                        <p><span className="text-muted-foreground">Cargo:</span> {contratadaCargoDisplay || "—"}</p>
                        {contratadaValidado && (
                          <p><span className="text-muted-foreground">Validado:</span> {new Date(contratadaValidado).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Coluna Direita: Comentários */}
        <div>
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Comentários</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de comentários */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Nenhum comentário. Seja o primeiro a comentar!
                  </div>
                ) : (
                  comments.map((comment) => {
                    const isContratadaComment = comment.profiles?.role === 'contratada';
                    const roleLabel = isContratadaComment ? 'Contratada' : 'Fiscal';
                    const roleColor = isContratadaComment
                      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
                      : 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
                    
                    return (
                      <div key={comment.id} className="flex gap-2 p-2 border rounded-lg">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {comment.profiles?.display_name?.[0]?.toUpperCase() || 
                             comment.profiles?.email?.[0]?.toUpperCase() || 
                             '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-medium truncate">
                                {comment.profiles?.display_name || comment.profiles?.email || 'Usuário'}
                              </p>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${roleColor}`}>
                                {roleLabel}
                              </Badge>
                            </div>
                            {!isLocked && comment.created_by === user?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => deleteCommentMutation.mutate(comment.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{comment.texto}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Campo de novo comentário */}
              {!isLocked && (
                <div className="space-y-2 pt-3 border-t">
                  <Textarea
                    placeholder="Escreva um comentário..."
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleAddComment();
                      }
                    }}
                    className="text-sm"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-muted-foreground">
                      Ctrl+Enter para enviar
                    </p>
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addCommentMutation.isPending || !reportId}
                    >
                      <Send className="h-3 w-3 mr-1.5" />
                      Enviar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
