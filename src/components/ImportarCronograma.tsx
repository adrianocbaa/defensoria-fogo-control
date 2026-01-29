import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useCronogramaFinanceiro, CronogramaFinanceiro, CronogramaItem } from '@/hooks/useCronogramaFinanceiro';

interface ImportarCronogramaProps {
  obraId: string;
  onSuccess?: () => void;
}

export function ImportarCronograma({ obraId, onSuccess }: ImportarCronogramaProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CronogramaItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { saveCronograma, loading } = useCronogramaFinanceiro();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Processar dados do cronograma
      const items: CronogramaItem[] = [];
      let currentItem: CronogramaItem | null = null;
      
      // Encontrar linha de cabeçalho com os períodos
      let headerRowIndex = -1;
      let periodoColumns: { colIndex: number; dias: number }[] = [];
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[0] === 'Item' || row[0] === 'ITEM') {
          headerRowIndex = i;
          // Identificar colunas de períodos (30 DIAS, 60 DIAS, 75 DIAS, etc.)
          for (let j = 2; j < row.length; j++) {
            const cellValue = row[j]?.toString().toUpperCase();
            if (cellValue && cellValue.includes('DIAS')) {
              const match = cellValue.match(/(\d+)\s*DIAS/);
              if (match) {
                periodoColumns.push({ colIndex: j, dias: parseInt(match[1]) });
              }
            }
          }
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('Formato de planilha não reconhecido. Certifique-se de que há uma linha começando com "Item".');
      }

      // Processar linhas de dados (após cabeçalho)
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Verificar se é uma linha de item (número no início)
        if (row[0] && !isNaN(row[0])) {
          const itemNumero = parseInt(row[0].toString());
          const descricao = row[1]?.toString() || '';
          const totalEtapa = parseFloat(row[2]?.toString().replace(/[^\d.,]/g, '').replace(',', '.') || '0');
          
          // Pular linhas de totais/porcentagem
          if (descricao.toUpperCase().includes('PORCENTAGEM') || 
              descricao.toUpperCase().includes('CUSTO') || 
              descricao.toUpperCase().includes('ACUMULADO')) {
            continue;
          }

          currentItem = {
            item_numero: itemNumero,
            descricao: descricao,
            total_etapa: totalEtapa,
            periodos: [],
          };

          // Extrair valores dos períodos usando o valor real do cabeçalho
          periodoColumns.forEach(({ colIndex, dias }) => {
            const valorStr = row[colIndex]?.toString() || '0';
            const valor = parseFloat(valorStr.replace(/[^\d.,]/g, '').replace(',', '.') || '0');
            
            if (valor > 0) {
              const percentual = totalEtapa > 0 ? (valor / totalEtapa) * 100 : 0;
              
              currentItem.periodos.push({
                periodo: dias, // Usa o valor real do cabeçalho (30, 60, 75, etc.)
                valor: valor,
                percentual: parseFloat(percentual.toFixed(2)),
              });
            }
          });

          items.push(currentItem);
        }
      }

      if (items.length === 0) {
        throw new Error('Nenhum item MACRO foi encontrado na planilha.');
      }

      setPreview(items);
      toast.success(`${items.length} itens MACRO identificados`);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivo Excel');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      toast.error('Nenhum dado para importar');
      return;
    }

    const cronograma: CronogramaFinanceiro = {
      obra_id: obraId,
      nome: file?.name || 'Cronograma Financeiro',
      items: preview,
    };

    const success = await saveCronograma(cronograma);
    
    if (success) {
      setOpen(false);
      setFile(null);
      setPreview([]);
      onSuccess?.();
    }
  };

  const resetImport = () => {
    setFile(null);
    setPreview([]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Importar Cronograma
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Cronograma Financeiro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Selecione o arquivo Excel contendo o cronograma financeiro
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  O arquivo deve conter os MACROS da planilha com valores distribuídos por períodos (30, 60, 90 dias, etc.)
                </p>
                <div className="flex flex-col gap-3 items-center">
                  <label htmlFor="cronograma-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" asChild>
                      <span>Selecionar Arquivo</span>
                    </Button>
                  </label>
                  <input
                    id="cronograma-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    asChild
                    className="gap-2"
                  >
                    <a href="/templates/Modelo_-_Cronograma.xlsx" download>
                      <Download className="w-4 h-4" />
                      Baixar Modelo Excel
                    </a>
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Formato Esperado:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                  <li>Coluna "Item": número do item MACRO (1, 2, 3...)</li>
                  <li>Coluna "Descrição": nome do item (ex: ADMINISTRAÇÃO, PINTURA)</li>
                  <li>Coluna "Total Por Etapa": valor total do item</li>
                  <li>Colunas "30 DIAS", "60 DIAS", etc.: valores distribuídos por período</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetImport}
                  disabled={loading || isProcessing}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {isProcessing ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : preview.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {preview.length} itens MACRO identificados
                    </span>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-medium">Item</th>
                            <th className="text-left p-2 font-medium">Descrição</th>
                            <th className="text-right p-2 font-medium">Total</th>
                            <th className="text-center p-2 font-medium">Períodos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {preview.map((item) => (
                            <tr key={item.item_numero}>
                              <td className="p-2">{item.item_numero}</td>
                              <td className="p-2">{item.descricao}</td>
                              <td className="p-2 text-right font-mono">
                                {formatCurrency(item.total_etapa)}
                              </td>
                              <td className="p-2 text-center">{item.periodos.length}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={resetImport} disabled={loading}>
                      Cancelar
                    </Button>
                    <Button onClick={handleImport} disabled={loading}>
                      {loading ? 'Importando...' : 'Confirmar Importação'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
