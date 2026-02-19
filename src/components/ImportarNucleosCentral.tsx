import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSpreadsheet, Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readExcelFile } from '@/lib/excelUtils';

interface NucleoImportado {
  nome: string;
  cidade: string;
  endereco: string;
  telefones?: string;
  email?: string;
  lat?: number;
  lng?: number;
}

interface ImportarNucleosCentralProps {
  onImportar: (nucleos: NucleoImportado[]) => void;
  onFechar: () => void;
}

export function ImportarNucleosCentral({ onImportar, onFechar }: ImportarNucleosCentralProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setErro('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
        setArquivo(null);
        return;
      }
      setArquivo(file);
      setErro(null);
      setSucesso(null);
    }
  };

  const processarPlanilha = async () => {
    if (!arquivo) {
      setErro('Selecione um arquivo antes de importar');
      return;
    }

    setCarregando(true);
    setErro(null);
    setSucesso(null);

    try {
      const data = await arquivo.arrayBuffer();
      const jsonData = await readExcelFile(data);

      if (jsonData.length < 2) {
        throw new Error('A planilha está vazia ou não contém dados');
      }

      // Encontrar a linha de cabeçalho
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && row.length > 0) {
          const firstCell = row[0]?.toString().toLowerCase() || '';
          if (firstCell.includes('nome') || firstCell.includes('núcleo')) {
            headerRowIndex = i;
            break;
          }
        }
      }

      const dataRows = jsonData.slice(headerRowIndex + 1);
      const nucleosProcessados: NucleoImportado[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        // Pular linhas vazias
        if (!row || row.length === 0 || !row[0]) continue;

        const nome = row[0] ? row[0].toString().trim() : '';
        const cidade = row[1] ? row[1].toString().trim() : '';
        const endereco = row[2] ? row[2].toString().trim() : '';

        // Validar campos obrigatórios
        if (!nome || !cidade || !endereco) {
          console.warn(`Linha ${i + headerRowIndex + 2}: Campos obrigatórios ausentes (Nome, Cidade, Endereço)`);
          continue;
        }

        const nucleo: NucleoImportado = {
          nome,
          cidade,
          endereco,
          telefones: row[3] ? row[3].toString().trim() : undefined,
          email: row[4] ? row[4].toString().trim() : undefined,
          lat: row[5] ? parseFloat(row[5]) : undefined,
          lng: row[6] ? parseFloat(row[6]) : undefined,
        };

        nucleosProcessados.push(nucleo);
      }

      if (nucleosProcessados.length === 0) {
        throw new Error('Nenhum núcleo válido foi encontrado na planilha');
      }

      setSucesso(`${nucleosProcessados.length} núcleo(s) processado(s) com sucesso!`);
      toast({
        title: 'Planilha processada',
        description: `${nucleosProcessados.length} núcleo(s) pronto(s) para importação`,
      });

      onImportar(nucleosProcessados);
    } catch (error: any) {
      console.error('Erro ao processar planilha:', error);
      setErro(error.message || 'Erro ao processar a planilha');
      toast({
        title: 'Erro ao processar planilha',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Núcleos da Planilha
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="file-upload" className="block text-sm font-medium mb-2">
            Selecione o arquivo Excel (.xlsx ou .xls)
          </label>
          <Input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={carregando}
          />
        </div>

        {erro && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {sucesso && (
          <Alert className="border-green-500 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{sucesso}</AlertDescription>
          </Alert>
        )}

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">
            Formato esperado da planilha:
          </h4>
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
            A primeira linha deve conter os cabeçalhos. As colunas devem estar na seguinte ordem:
          </p>
          <ul className="text-xs space-y-1 text-blue-700 dark:text-blue-300">
            <li>• <strong>Nome do Núcleo</strong> (obrigatório)</li>
            <li>• <strong>Cidade</strong> (obrigatório)</li>
            <li>• <strong>Endereço</strong> (obrigatório)</li>
            <li>• Telefones (opcional)</li>
            <li>• E-mail (opcional)</li>
            <li>• Latitude (opcional)</li>
            <li>• Longitude (opcional)</li>
          </ul>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            <strong>Nota:</strong> Após a importação, você poderá selecionar a visibilidade em módulos para cada núcleo.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={processarPlanilha}
            disabled={!arquivo || carregando}
            className="flex items-center gap-2"
          >
            {carregando ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importar
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onFechar} disabled={carregando}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
