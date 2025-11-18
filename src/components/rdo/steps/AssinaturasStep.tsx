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
  const canValidateContratada = isContratada; // Apenas usuários com role "contratada"
  
  const [fiscalNome, setFiscalNome] = useState(reportData?.assinatura_fiscal_nome || "");
  const [fiscalCargo, setFiscalCargo] = useState(reportData?.assinatura_fiscal_cargo || "");
  const [fiscalDocumento, setFiscalDocumento] = useState(reportData?.assinatura_fiscal_documento || "");
  
  const [contratadaNome, setContratadaNome] = useState(reportData?.assinatura_contratada_nome || "");
  const [contratadaCargo, setContratadaCargo] = useState(reportData?.assinatura_contratada_cargo || "");
  const [contratadaDocumento, setContratadaDocumento] = useState(reportData?.assinatura_contratada_documento || "");

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

      toast.success("Validação do Responsável Técnico registrada");
      onUpdate();
    } catch (error: any) {
      console.error("Error validating contratada signature:", error);
      toast.error("Erro ao validar assinatura");
    } finally {
      setIsSaving(false);
    }
  };

  const fiscalValidado = reportData?.assinatura_fiscal_validado_em;
  const contratadaValidado = reportData?.assinatura_contratada_validado_em;
  const isApproved = reportData?.status === "aprovado";
  
  // Usar os valores dos estados locais ou do reportData
  const fiscalNomeDisplay = fiscalNome || reportData?.assinatura_fiscal_nome;
  const fiscalCargoDisplay = fiscalCargo || reportData?.assinatura_fiscal_cargo;
  const fiscalDocumentoDisplay = fiscalDocumento || reportData?.assinatura_fiscal_documento;
  
  const contratadaNomeDisplay = contratadaNome || reportData?.assinatura_contratada_nome;
  const contratadaCargoDisplay = contratadaCargo || reportData?.assinatura_contratada_cargo;
  const contratadaDocumentoDisplay = contratadaDocumento || reportData?.assinatura_contratada_documento;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-xl font-semibold mb-2">Validação de Assinaturas</h2>
        <p className="text-sm text-muted-foreground">
          Preencha os dados e valide para registrar sua assinatura no relatório
        </p>
      </div>

      {/* Ocultar campos de validação quando aprovado */}
      {!isApproved && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fiscal/Gestor */}
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
                disabled={!!fiscalValidado || isApproved || !canValidateFiscal}
              />
            </div>
            <div>
              <Label htmlFor="fiscal-cargo">Cargo *</Label>
              <Input
                id="fiscal-cargo"
                value={fiscalCargo}
                onChange={(e) => setFiscalCargo(e.target.value)}
                placeholder="Cargo/Função"
                disabled={!!fiscalValidado || isApproved || !canValidateFiscal}
              />
            </div>
            <div>
              <Label htmlFor="fiscal-documento">CREA/CPF/ID *</Label>
              <Input
                id="fiscal-documento"
                value={fiscalDocumento}
                onChange={(e) => setFiscalDocumento(e.target.value)}
                placeholder="Documento"
                disabled={!!fiscalValidado || isApproved || !canValidateFiscal}
              />
            </div>
            {!canValidateFiscal && !fiscalValidado && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Apenas usuários com permissão de Editor ou Administrador podem validar esta assinatura.
                </AlertDescription>
              </Alert>
            )}
            {fiscalValidado ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-3 rounded-md">
                <Check className="h-4 w-4" />
                <span>Validado em {new Date(fiscalValidado).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</span>
              </div>
            ) : canValidateFiscal ? (
              <Button
                onClick={handleValidateFiscal}
                disabled={isSaving || isApproved}
                className="w-full"
              >
                Validar Assinatura
              </Button>
            ) : null}
          </div>
        </Card>

        {/* Contratada */}
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
                disabled={!!contratadaValidado || isApproved || !canValidateContratada}
              />
            </div>
            <div>
              <Label htmlFor="contratada-cargo">Cargo *</Label>
              <Input
                id="contratada-cargo"
                value={contratadaCargo}
                onChange={(e) => setContratadaCargo(e.target.value)}
                placeholder="Cargo/Função"
                disabled={!!contratadaValidado || isApproved || !canValidateContratada}
              />
            </div>
            <div>
              <Label htmlFor="contratada-documento">CREA/CPF/ID *</Label>
              <Input
                id="contratada-documento"
                value={contratadaDocumento}
                onChange={(e) => setContratadaDocumento(e.target.value)}
                placeholder="Documento"
                disabled={!!contratadaValidado || isApproved || !canValidateContratada}
              />
            </div>
            {!canValidateContratada && !contratadaValidado && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Apenas usuários com permissão de "Contratada" podem validar esta assinatura.
                </AlertDescription>
              </Alert>
            )}
            {contratadaValidado ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-3 rounded-md">
                <Check className="h-4 w-4" />
                <span>Validado em {new Date(contratadaValidado).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</span>
              </div>
            ) : canValidateContratada ? (
              <Button
                onClick={handleValidateContratada}
                disabled={isSaving || isApproved}
                className="w-full"
              >
                Validar Assinatura
              </Button>
            ) : null}
          </div>
        </Card>
        </div>
      )}

      {isApproved && (
        <>
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ RDO aprovado. As assinaturas não podem mais ser alteradas.
            </p>
          </div>

          {/* Resumo das Assinaturas */}
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
