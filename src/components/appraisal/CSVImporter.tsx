import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { comparablesApi } from '@/services/appraisalApi';
import { csvUtils } from '@/services/storageApi';

interface CSVUploadResult {
  success: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

interface CSVImporterProps {
  onSuccess?: () => void;
}

export function CSVImporter({ onSuccess }: CSVImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CSVUploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um arquivo CSV',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    setResult(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 5)); // Show first 5 rows
      },
      error: (error) => {
        toast({
          title: 'Erro',
          description: 'Erro ao processar arquivo CSV',
          variant: 'destructive',
        });
        console.error('CSV parse error:', error);
      }
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const data = results.data as any[];
          const validatedData = [];
          const errors = [];

          // Validate each row
          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const validation = csvUtils.validateComparableRow(row);

            if (validation.isValid) {
              let normalized = csvUtils.normalizeComparableRow(row);
              
              // Calculate price_unit if missing (Feature C)
              if (!normalized.price_unit && normalized.price_total) {
                if (normalized.kind === 'urban' && normalized.built_area && normalized.built_area > 0) {
                  normalized.price_unit = normalized.price_total / normalized.built_area;
                } else if (normalized.kind === 'rural' && normalized.land_area && normalized.land_area > 0) {
                  normalized.price_unit = normalized.price_total / normalized.land_area;
                }
              }
              
              validatedData.push(normalized);
            } else {
              errors.push({
                row: i + 1,
                error: validation.errors.join(', ')
              });
            }
          }

          // Import valid records
          let success = 0;
          const importErrors = [];

          for (let i = 0; i < validatedData.length; i++) {
            try {
              const result = await comparablesApi.create(validatedData[i]);
              if (result.error) {
                importErrors.push({
                  row: i + 1,
                  error: result.error.message || 'Erro ao importar'
                });
              } else {
                success++;
              }
            } catch (error: any) {
              importErrors.push({
                row: i + 1,
                error: error.message || 'Erro ao importar'
              });
            }
          }

          const finalResult = {
            success,
            errors: [...errors, ...importErrors]
          };

          setResult(finalResult);

          if (success > 0) {
            toast({
              title: 'Importação concluída',
              description: `${success} registros importados com sucesso`,
            });
            onSuccess?.();
          }

          if (finalResult.errors.length > 0) {
            toast({
              title: 'Avisos de importação',
              description: `${finalResult.errors.length} registros com erro`,
              variant: 'destructive',
            });
          }
        },
        error: (error) => {
          toast({
            title: 'Erro',
            description: 'Erro ao processar arquivo CSV',
            variant: 'destructive',
          });
          console.error('CSV parse error:', error);
        }
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro durante a importação',
        variant: 'destructive',
      });
      console.error('Import error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetImporter = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar Amostras via CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/10' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                Arraste um arquivo CSV ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground">
                Colunas obrigatórias: source, date, deal_type, price_total, land_area, built_area, quality, age, condition, lat, lon
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <Button asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  Selecionar Arquivo
                </label>
              </Button>
            </div>
          </div>
        )}

        {file && preview.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{file.name}</span>
                <Badge variant="secondary">{preview.length} registros (preview)</Badge>
              </div>
              <Button variant="outline" onClick={resetImporter}>
                Limpar
              </Button>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-full border rounded-lg">
                <div className="bg-muted p-2 border-b">
                  <p className="text-sm font-medium">Preview dos primeiros 5 registros</p>
                </div>
                <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                  {preview.map((row, index) => (
                    <div key={index} className="text-xs bg-background p-2 rounded border">
                      <div className="grid grid-cols-2 gap-2">
                        <span><strong>Fonte:</strong> {row.source || 'N/A'}</span>
                        <span><strong>Data:</strong> {row.date || 'N/A'}</span>
                        <span><strong>Tipo:</strong> {row.deal_type || 'N/A'}</span>
                        <span><strong>Valor:</strong> {row.price_total || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleImport} 
                disabled={loading}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar Dados
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium">Resultado da Importação</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{result.success}</div>
                  <div className="text-sm text-green-700">Registros importados</div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                  <div className="text-sm text-red-700">Erros encontrados</div>
                </CardContent>
              </Card>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-700">Erros de Validação</span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {result.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-sm bg-red-50 p-2 rounded border border-red-200">
                      <strong>Linha {error.row}:</strong> {error.error}
                    </div>
                  ))}
                  {result.errors.length > 10 && (
                    <div className="text-sm text-muted-foreground text-center">
                      ... e mais {result.errors.length - 10} erros
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button onClick={resetImporter} variant="outline" className="w-full">
              Importar Outro Arquivo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CSVImporter;