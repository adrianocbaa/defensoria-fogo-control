import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GerarRelatorioMedicaoDialogProps {
  obraId: string;
  medicaoAtual: number;
  dadosObra: any;
  dadosMedicao: any;
}

export function GerarRelatorioMedicaoDialog({
  obraId,
  medicaoAtual,
  dadosObra,
  dadosMedicao
}: GerarRelatorioMedicaoDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [numeroMedicao, setNumeroMedicao] = useState(medicaoAtual.toString());
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dataVistoria, setDataVistoria] = useState("");
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [responsavelNome, setResponsavelNome] = useState("Adriano Augusto de Sousa Melo");
  const [responsavelCargo, setResponsavelCargo] = useState("Assessor Especial");
  const [observacoes, setObservacoes] = useState("");
  const [relatorioGerado, setRelatorioGerado] = useState<any>(null);

  const gerarRelatorio = async () => {
    if (!dataInicio || !dataFim || !dataVistoria) {
      toast.error("Preencha todas as datas obrigatórias");
      return;
    }

    setLoading(true);
    try {
      // Preparar dados para a IA
      const dadosParaIA = {
        obra: {
          id: dadosObra.id,
          titulo: dadosObra.nome,
          endereco: dadosObra.endereco || "",
          municipio: dadosObra.municipio || "",
          uf: dadosObra.uf || "MT",
          contrato_numero: dadosObra.contrato_numero || "",
          empresa_executora: dadosObra.empresa_executora || "Empresa não informada",
          valor_total_obra: dadosObra.valor_total || 0,
          prazo_dias: dadosObra.prazo_dias || 0
        },
        periodo_medido: {
          data_inicio: dataInicio,
          data_fim: dataFim,
          data_vistoria: dataVistoria,
          data_emissao: dataEmissao
        },
        numero_medicao: numeroMedicao,
        cronograma_previsto: dadosMedicao.cronograma_previsto || [],
        medicao_atual: dadosMedicao.medicao_atual || [],
        responsavel_fiscalizacao: {
          nome: responsavelNome,
          cargo: responsavelCargo
        },
        observacoes_sistema: observacoes,
        metadados: {
          local_emissao: `${dadosObra.municipio || "Cuiabá"}/MT`,
          assinatura_nome: responsavelNome,
          assinatura_cargo: responsavelCargo
        }
      };

      const { data, error } = await supabase.functions.invoke('gerar-relatorio-medicao', {
        body: { dados: dadosParaIA }
      });

      if (error) throw error;

      setRelatorioGerado(data);
      toast.success("Relatório gerado com sucesso!");
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadHTML = () => {
    if (!relatorioGerado?.render_html) return;
    
    const blob = new Blob([relatorioGerado.render_html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-medicao-${numeroMedicao}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTXT = () => {
    if (!relatorioGerado?.plaintext) return;
    
    const blob = new Blob([relatorioGerado.plaintext], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-medicao-${numeroMedicao}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Gerar Relatório Técnico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Relatório Técnico de Medição</DialogTitle>
        </DialogHeader>

        {!relatorioGerado ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numeroMedicao">Número da Medição</Label>
                <Input
                  id="numeroMedicao"
                  value={numeroMedicao}
                  onChange={(e) => setNumeroMedicao(e.target.value)}
                  placeholder="Ex: 1ª, 2ª, 3ª"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataEmissao">Data de Emissão</Label>
                <Input
                  id="dataEmissao"
                  type="date"
                  value={dataEmissao}
                  onChange={(e) => setDataEmissao(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data Início do Período *</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataFim">Data Fim do Período *</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataVistoria">Data da Vistoria *</Label>
                <Input
                  id="dataVistoria"
                  type="date"
                  value={dataVistoria}
                  onChange={(e) => setDataVistoria(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavelNome">Responsável pela Fiscalização</Label>
              <Input
                id="responsavelNome"
                value={responsavelNome}
                onChange={(e) => setResponsavelNome(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavelCargo">Cargo</Label>
              <Input
                id="responsavelCargo"
                value={responsavelCargo}
                onChange={(e) => setResponsavelCargo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações do Sistema (opcional)</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ocorrências, notas de fiscalização, etc."
                rows={4}
              />
            </div>

            <Button onClick={gerarRelatorio} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando relatório...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Relatório com IA
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={downloadHTML} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download HTML
              </Button>
              <Button onClick={downloadTXT} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download TXT
              </Button>
              <Button onClick={() => setRelatorioGerado(null)} variant="secondary">
                Gerar Novo
              </Button>
            </div>

            <div className="border rounded-lg p-4 bg-muted/50 max-h-[500px] overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: relatorioGerado.render_html }} />
            </div>

            {relatorioGerado.resumo_json && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold mb-2">Resumo:</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Valor Medido no Período:</strong> R$ {relatorioGerado.resumo_json.valor_medido_periodo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p><strong>% Previsto Acumulado:</strong> {relatorioGerado.resumo_json.perc_previsto_acumulado?.toFixed(2)}%</p>
                  <p><strong>% Medido Acumulado:</strong> {relatorioGerado.resumo_json.perc_medido_acumulado?.toFixed(2)}%</p>
                  <p><strong>Desvio:</strong> {relatorioGerado.resumo_json.desvio_pp?.toFixed(2)} p.p.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
