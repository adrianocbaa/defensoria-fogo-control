import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check, AlertCircle } from "lucide-react";
import { createAuditLog } from "@/hooks/useRdoAuditLog";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const isRejected = reportData?.status === "reprovado";
  
  const [fiscalNome, setFiscalNome] = useState(reportData?.assinatura_fiscal_nome || "");
  const [fiscalCargo, setFiscalCargo] = useState(reportData?.assinatura_fiscal_cargo || "");
  const [fiscalDocumento, setFiscalDocumento] = useState(reportData?.assinatura_fiscal_documento || "");
  const [fiscalValidadoLocal, setFiscalValidadoLocal] = useState<string | null>(reportData?.assinatura_fiscal_validado_em || null);
  
  const [contratadaNome, setContratadaNome] = useState(reportData?.assinatura_contratada_nome || "");
  const [contratadaCargo, setContratadaCargo] = useState(reportData?.assinatura_contratada_cargo || "");
  const [contratadaDocumento, setContratadaDocumento] = useState(reportData?.assinatura_contratada_documento || "");
  const [contratadaValidadoLocal, setContratadaValidadoLocal] = useState<string | null>(reportData?.assinatura_contratada_validado_em || null);
  
  // Usar estado local para atualização imediata da UI
  const fiscalValidado = fiscalValidadoLocal;
  const contratadaValidado = contratadaValidadoLocal;

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
      
      const { error: updateError } = await supabase
        .from("rdo_reports")
        .update({
          assinatura_fiscal_nome: fiscalNome,
          assinatura_fiscal_cargo: fiscalCargo,
          assinatura_fiscal_documento: fiscalDocumento,
          assinatura_fiscal_validado_em: validatedAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (updateError) throw updateError;

      await createAuditLog({
        obraId,
        reportId,
        acao: "ASSINAR_FISCAL",
        detalhes: { nome: fiscalNome, cargo: fiscalCargo, documento: fiscalDocumento },
        actorId: user?.id,
        actorNome: fiscalNome,
      });

      // Atualizar estado local imediatamente para refletir na UI
      setFiscalValidadoLocal(validatedAt);
      
      toast.success("Validação do Fiscal/Gestor registrada");
      onUpdate();
    } catch (error: any) {
      console.error("Error validating fiscal signature:", error);
      toast.error("Erro ao validar assinatura");
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
      
      const { error: updateError } = await supabase
        .from("rdo_reports")
        .update({
          assinatura_contratada_nome: contratadaNome,
          assinatura_contratada_cargo: contratadaCargo,
          assinatura_contratada_documento: contratadaDocumento,
          assinatura_contratada_validado_em: validatedAt,
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
      
      toast.success("Validação do Responsável Técnico registrada");
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
  
  // Ambos validaram (RDO concluído por ambas as partes)
  const bothValidated = fiscalValidado && contratadaValidado && !isRejected;
  
  // Determinar se deve mostrar ambas assinaturas ou apenas a própria
  // - Aprovado: mostrar ambas
  // - Ambos validaram mas não aprovado: cada um vê só a sua
  const showBothSignatures = isApproved;
  const showOnlyOwnSignature = bothValidated && !isApproved;
  
  // Determinar se deve mostrar os campos de validação
  // Mostrar campos se: não aprovado E (falta assinatura OU foi reprovado)
  const showValidationFields = !isApproved && (!fiscalValidado || !contratadaValidado || isRejected);

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-xl font-semibold mb-2">Validação de Assinaturas</h2>
        <p className="text-sm text-muted-foreground">
          Preencha os dados e valide para registrar sua assinatura no relatório
        </p>
      </div>

      {/* Alerta quando RDO está reprovado */}
      {isRejected && (
        <Alert className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            Este RDO foi reprovado. Clique em "Reabrir RDO" para permitir edição e novas assinaturas.
          </AlertDescription>
        </Alert>
      )}

      {/* Mostrar campos de validação apenas se necessário */}
      {showValidationFields && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fiscal/Gestor - mostrar se não validado OU se foi reprovado e assinaturas foram limpas */}
        {((!fiscalValidado || isRejected) && canValidateFiscal) && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Assinatura do Fiscal/Gestor (DPE-MT)</h3>
          {isRejected && fiscalValidado && (
            <Alert className="mb-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                RDO foi reprovado. Clique em "Reabrir RDO" para permitir nova validação.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="fiscal-nome">Nome *</Label>
              <Input
                id="fiscal-nome"
                value={fiscalNome}
                onChange={(e) => setFiscalNome(e.target.value)}
                placeholder="Nome completo"
                disabled={isRejected && !!fiscalValidado}
              />
            </div>
            <div>
              <Label htmlFor="fiscal-cargo">Cargo *</Label>
              <Input
                id="fiscal-cargo"
                value={fiscalCargo}
                onChange={(e) => setFiscalCargo(e.target.value)}
                placeholder="Cargo/Função"
                disabled={isRejected && !!fiscalValidado}
              />
            </div>
            <div>
              <Label htmlFor="fiscal-documento">CREA/CPF/ID *</Label>
              <Input
                id="fiscal-documento"
                value={fiscalDocumento}
                onChange={(e) => setFiscalDocumento(e.target.value)}
                placeholder="Documento"
                disabled={isRejected && !!fiscalValidado}
              />
            </div>
            <Button
              onClick={handleValidateFiscal}
              disabled={isSaving || (isRejected && !!fiscalValidado)}
              className="w-full"
            >
              Validar Assinatura
            </Button>
          </div>
        </Card>
        )}
        
        {fiscalValidado && !isRejected && (
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
        {!contratadaValidado && !isRejected && canValidateContratada && (
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
        {contratadaValidado && !isRejected && (
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

      {/* Mostrar apenas a própria assinatura quando ambos validaram mas não foi aprovado ainda */}
      {showOnlyOwnSignature && (
        <>
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              🔒 RDO concluído por ambas as partes. Todas as edições estão bloqueadas. Aguardando aprovação final.
            </p>
          </div>

          {/* Mostrar apenas a assinatura do usuário atual */}
          <Card className="border-primary/20">
            <div className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                Sua Assinatura
              </h3>
              
              {/* Se for fiscal/gestor, mostrar assinatura do fiscal */}
              {canValidateFiscal && fiscalValidado && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-medium">Fiscal/Gestor (DPE-MT) - Validado</h4>
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
                    <div>
                      <p className="text-xs text-muted-foreground">Data/Hora da Validação</p>
                      <p className="text-sm">{new Date(fiscalValidado).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Se for contratada, mostrar assinatura da contratada */}
              {canValidateContratada && contratadaValidado && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-medium">Responsável Técnico (Contratada) - Validado</h4>
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
                    <div>
                      <p className="text-xs text-muted-foreground">Data/Hora da Validação</p>
                      <p className="text-sm">{new Date(contratadaValidado).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Mostrar resumo completo quando aprovado */}
      {showBothSignatures && (
        <>
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ RDO aprovado. As assinaturas não podem mais ser alteradas.
            </p>
          </div>

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
