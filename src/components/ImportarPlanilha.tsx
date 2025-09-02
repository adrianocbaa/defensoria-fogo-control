import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { normalizeText } from '@/lib/utils'

interface Item {
  id: number;
  item: string;
  codigo: string;
  banco: string;
  descricao: string;
  und: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  aditivo: { qnt: number; percentual: number; total: number };
  totalContrato: number;
  importado: boolean;
  nivel: number;
  ehAdministracaoLocal: boolean;
  ordem: number;
}

interface ImportarPlanilhaProps {
  onImportar: (dados: Item[]) => void;
  onFechar: () => void;
}

interface ImportResult {
  success: boolean;
  data?: Item[];
  errors: string[];
  warnings: string[];
  summary: {
    imported: number;
    warnings: number;
    errors: number;
  };
}

interface ColumnMapping {
  item: number;
  codigo_banco: number;
  descricao: number;
  und: number;
  quant: number;
  valor_unit_bdi: number;
  valor_total_bdi: number;
}

// Normaliza texto removendo acentos, pontuação e espaços duplos
const normalizeHeader = (text: string): string => {
  return normalizeText(text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim());
}

// Mapeia sinônimos de cabeçalho para nomes padronizados  
const mapHeaderSynonym = (normalized: string): string => {
  const synonyms: Record<string, string> = {
    'item': 'item',
    'codigobanco': 'codigo_banco',
    'codigo': 'codigo_banco',
    'descricao': 'descricao',
    'und': 'und',
    'unidade': 'und',
    'quant': 'quant',
    'quant.': 'quant',
    'quantidade': 'quant',
    'valorunitcombdiedesc': 'valor_unit_bdi',
    'valorunitcombdiedesconto': 'valor_unit_bdi',
    'valortotalcombdiedesconto': 'valor_total_bdi',
    'valortotalcombdi': 'valor_total_bdi'
  };
  
  return synonyms[normalized] || normalized;
}

// Detecta mapeamento de colunas baseado no cabeçalho
const detectColumnMapping = (headers: string[]): { mapping: Partial<ColumnMapping>; missing: string[]; found: string[] } => {
  const requiredColumns = ['item', 'codigo_banco', 'descricao', 'und', 'quant', 'valor_unit_bdi', 'valor_total_bdi'];
  const mapping: Partial<ColumnMapping> = {};
  const found: string[] = [];
  
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const mapped = mapHeaderSynonym(normalized);
    
    if (requiredColumns.includes(mapped)) {
      mapping[mapped as keyof ColumnMapping] = index;
      found.push(header);
    }
  });
  
  const missing = requiredColumns.filter(col => !(col in mapping));
  
  return { mapping, missing, found };
}

// Converte string para número aceitando . ou , como decimal
const parseNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  let str = String(value).replace(/\s/g, ''); // Remove espaços
  
  // Detectar formato brasileiro (vírgula como decimal)
  if (str.includes(',')) {
    // Se tem ponto e vírgula, ponto é separador de milhar
    if (str.includes('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Só vírgula - pode ser decimal ou separador de milhar
      // Se vírgula está nos últimos 3 dígitos, é decimal
      const commaIndex = str.lastIndexOf(',');
      if (str.length - commaIndex <= 3) {
        str = str.replace(',', '.');
      } else {
        str = str.replace(/,/g, '');
      }
    }
  } else if (str.includes('.')) {
    // Só pontos - se múltiplos pontos, todos menos último são separadores de milhar
    const dots = str.split('.');
    if (dots.length > 2) {
      str = dots.slice(0, -1).join('') + '.' + dots[dots.length - 1];
    }
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Valida e processa uma linha de dados
const processRow = (row: any[], mapping: ColumnMapping, rowIndex: number): { item?: Item; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Verifica se linha está vazia
  if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
    return { errors, warnings };
  }
  
  const item = String(row[mapping.item] || '').trim();
  if (!item) {
    errors.push(`Linha ${rowIndex + 1} sem 'Item'`);
    return { errors, warnings };
  }
  
  // Verifica se Item parece ser número ou data
  if (/^\d+([.,]\d+)?$/.test(item) || !isNaN(Date.parse(item))) {
    warnings.push(`Linha ${rowIndex + 1}: Item parece ser número/data. Formate a coluna Item como Texto.`);
  }
  
  const quant = parseNumber(row[mapping.quant]);
  let valorUnit = parseNumber(row[mapping.valor_unit_bdi]);
  let valorTotal = parseNumber(row[mapping.valor_total_bdi]);
  
  // Cálculos automáticos
  if (!valorTotal && quant && valorUnit) {
    valorTotal = Math.round(quant * valorUnit * 100) / 100;
  } else if (!valorUnit && valorTotal && quant > 0) {
    valorUnit = Math.round((valorTotal / quant) * 100) / 100;
  } else if (valorUnit && valorTotal && quant > 0) {
    // Verificar divergência quando ambos estão presentes
    const calculatedTotal = quant * valorUnit;
    if (Math.abs(calculatedTotal - valorTotal) / valorTotal > 0.01) {
      warnings.push(`Linha ${rowIndex + 1}: Divergência entre valor unitário e total (>1%)`);
    }
  }
  
  if (quant <= 0) {
    warnings.push(`Linha ${rowIndex + 1}: Quantidade ≤ 0 (pode ser item de título)`);
  }
  
  return {
    item: {
      id: Date.now() + rowIndex,
      item,
      codigo: String(row[mapping.codigo_banco] || ''),
      banco: String(row[mapping.codigo_banco] || ''),
      descricao: String(row[mapping.descricao] || ''),
      und: String(row[mapping.und] || ''),
      quantidade: quant,
      valorUnitario: valorUnit,
      valorTotal,
      aditivo: { qnt: 0, percentual: 0, total: 0 },
      totalContrato: valorTotal,
      importado: true,
      nivel: 3,
      ehAdministracaoLocal: false,
      ordem: rowIndex
    },
    errors,
    warnings
  };
}

const ImportarPlanilha = ({ onImportar, onFechar }: ImportarPlanilhaProps) => {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      
      if (validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        setArquivo(file)
        setResult(null)
      } else {
        setResult({
          success: false,
          errors: ['Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV (.csv)'],
          warnings: [],
          summary: { imported: 0, warnings: 0, errors: 1 }
        });
        setArquivo(null)
      }
    }
  }

  const processCSV = async (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`Erro ao processar CSV: ${results.errors[0].message}`));
            return;
          }
          resolve(results.data as any[][]);
        },
        error: (error) => reject(error),
        delimiter: '',  // Auto-detect
        skipEmptyLines: false
      });
    });
  }

  const processExcel = async (file: File): Promise<any[][]> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    // Encontrar primeira sheet com dados úteis
    let selectedSheet = null;
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      const usefulLines = jsonData.filter(row => row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''));
      
      if (usefulLines.length >= 2) {
        selectedSheet = worksheet;
        break;
      }
    }
    
    if (!selectedSheet) {
      throw new Error('Nenhuma sheet com dados úteis encontrada (mínimo 2 linhas)');
    }
    
    return XLSX.utils.sheet_to_json(selectedSheet, { header: 1 }) as any[][];
  }

  const processarPlanilha = async () => {
    if (!arquivo) {
      setResult({
        success: false,
        errors: ['Por favor, selecione um arquivo'],
        warnings: [],
        summary: { imported: 0, warnings: 0, errors: 1 }
      });
      return;
    }

    setCarregando(true);
    setResult(null);

    try {
      // Processar arquivo baseado no tipo
      let jsonData: any[][];
      if (arquivo.name.toLowerCase().endsWith('.csv')) {
        jsonData = await processCSV(arquivo);
      } else {
        jsonData = await processExcel(arquivo);
      }

      // Encontrar primeira linha não vazia como cabeçalho
      let headerRowIndex = -1;
      let headers: string[] = [];
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.some(cell => cell && String(cell).trim() !== '')) {
          headers = row.map(cell => String(cell || ''));
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('Nenhuma linha de cabeçalho encontrada');
      }

      // Detectar mapeamento de colunas
      const { mapping, missing, found } = detectColumnMapping(headers);
      
      if (missing.length > 0) {
        setResult({
          success: false,
          errors: [`Cabeçalho inválido. Faltando: ${missing.join(', ')}. Encontrado: ${found.join(', ')}.`],
          warnings: [],
          summary: { imported: 0, warnings: 0, errors: 1 }
        });
        return;
      }

      // Processar linhas de dados
      const allErrors: string[] = [];
      const allWarnings: string[] = [];
      const items: Item[] = [];
      
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const { item, errors, warnings } = processRow(jsonData[i], mapping as ColumnMapping, i - headerRowIndex);
        
        allErrors.push(...errors);
        allWarnings.push(...warnings);
        
        if (item) {
          items.push(item);
        }
      }

      const result: ImportResult = {
        success: items.length > 0,
        data: items,
        errors: allErrors.slice(0, 10), // Mostrar apenas 10 primeiros erros
        warnings: allWarnings.slice(0, 10), // Mostrar apenas 10 primeiros avisos
        summary: {
          imported: items.length,
          warnings: allWarnings.length,
          errors: allErrors.length
        }
      };

      setResult(result);

      if (result.success && items.length > 0) {
        onImportar(items);
        
        // Fechar o modal após 3 segundos se não houver avisos críticos
        if (allWarnings.length === 0) {
          setTimeout(() => {
            onFechar();
          }, 3000);
        }
      }

    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setResult({
        success: false,
        errors: [`Erro ao processar arquivo: ${(error as Error).message}`],
        warnings: [],
        summary: { imported: 0, warnings: 0, errors: 1 }
      });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Planilha
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Selecione o arquivo (.xlsx, .xls, .csv)
          </label>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="cursor-pointer"
          />
        </div>

        {result && (
          <div className="space-y-3">
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {result.errors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {result.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Avisos:</strong>
                    {result.warnings.map((warning, index) => (
                      <div key={index}>{warning}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {result.success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importação concluída:</strong> {result.summary.imported} itens importados
                  {result.summary.warnings > 0 && `, ${result.summary.warnings} avisos`}
                  {result.summary.errors > 0 && `, ${result.summary.errors} erros ignorados`}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">Colunas aceitas (sinônimos):</p>
          <ul className="text-xs space-y-1">
            <li>• <strong>Item:</strong> item</li>
            <li>• <strong>Código:</strong> codigo, codigo banco, codigobanco</li>
            <li>• <strong>Descrição:</strong> descricao, descrição</li>
            <li>• <strong>Unidade:</strong> und, unidade</li>
            <li>• <strong>Quantidade:</strong> quant, quantidade, quant.</li>
            <li>• <strong>Valor Unitário:</strong> valor unit com bdi e desc(onto)</li>
            <li>• <strong>Valor Total:</strong> valor total com bdi e desconto</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={processarPlanilha} 
            disabled={!arquivo || carregando}
            className="flex-1"
          >
            {carregando ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ImportarPlanilha