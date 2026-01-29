import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

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
  valorTotalSemDesconto: number; // Valor original da planilha (coluna I - Total sem Desconto)
  aditivo: { qnt: number; percentual: number; total: number };
  totalContrato: number;
  importado: boolean;
  nivel: number;
  ehAdministracaoLocal: boolean;
  ordem: number;
}

interface ImportarPlanilhaProps {
  onImportar: (dados: Item[], percentualDesconto: number) => void;
  onFechar: () => void;
}

const ImportarPlanilha = ({ onImportar, onFechar }: ImportarPlanilhaProps) => {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [percentualDesconto, setPercentualDesconto] = useState<string>('')

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.name.endsWith('.xlsx')) {
        setArquivo(file)
        setErro('')
      } else {
        setErro('Por favor, selecione um arquivo Excel (.xlsx)')
        setArquivo(null)
      }
    }
  }

  const processarPlanilha = async () => {
    if (!arquivo) {
      setErro('Por favor, selecione um arquivo')
      return
    }

    // Percentual de desconto é opcional - usado apenas para cálculos futuros de aditivos
    const descontoValue = percentualDesconto ? parseFloat(percentualDesconto) : 0
    if (percentualDesconto && (descontoValue < 0 || descontoValue > 100)) {
      setErro('Percentual de desconto deve ser entre 0 e 100')
      return
    }

    setCarregando(true)
    setErro('')
    setSucesso('')

    try {
      const data = await arquivo.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      
      // Pegar a primeira planilha
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Converter para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
      
      // Encontrar a linha de cabeçalho e mapear colunas dinamicamente
      let headerRowIndex = -1
      let columnMap: Record<string, number> = {}
      
      // Campos esperados (normalizados)
      const expectedFields = ['item', 'codigo', 'banco', 'descricao', 'und', 'quant', 'valor unit', 'total']
      
      const normalizeHeader = (header: string): string => {
        if (!header) return ''
        return header.toString().trim().toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/\./g, '') // Remove pontos
      }
      
      for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
        const row = jsonData[i]
        if (!row || row.length === 0) continue
        
        // Procurar por "Item" na primeira coluna para identificar cabeçalho
        const firstCell = row[0] ? normalizeHeader(row[0].toString()) : ''
        if (firstCell === 'item') {
          headerRowIndex = i
          
          // Mapear cada coluna
          row.forEach((cell, colIndex) => {
            const normalized = normalizeHeader(cell?.toString() || '')
            
            if (normalized === 'item') columnMap['item'] = colIndex
            else if (normalized.includes('codigo') && !normalized.includes('banco')) columnMap['codigo'] = colIndex
            else if (normalized.includes('banco') || normalized === 'codigo banco') {
              // Se "código banco" está junto, é a coluna de código
              if (normalized.includes('codigo')) columnMap['codigo'] = colIndex
              columnMap['banco'] = colIndex
            }
            else if (normalized.includes('descricao')) columnMap['descricao'] = colIndex
            else if (normalized === 'und' || normalized === 'unidade') columnMap['und'] = colIndex
            else if (normalized.includes('quant')) columnMap['quantidade'] = colIndex
            else if (normalized.includes('valor unit') && !normalized.includes('bdi')) columnMap['valorUnit'] = colIndex
            else if (normalized.includes('valor unit') && normalized.includes('bdi')) columnMap['valorUnitBdi'] = colIndex
            else if (normalized === 'total' || normalized.includes('total sem desconto') || 
                    (normalized.includes('total') && !normalized.includes('contrato'))) {
              // Priorizar "Total sem Desconto" ou simplesmente "Total"
              if (!columnMap['total'] || normalized.includes('sem desconto')) {
                columnMap['total'] = colIndex
              }
            }
          })
          break
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('Não foi possível encontrar a linha de cabeçalho. Certifique-se de que a primeira coluna contenha "Item".')
      }
      
      console.log('Mapeamento de colunas detectado:', columnMap)

      // Processar os dados a partir da linha seguinte ao cabeçalho
      const dadosProcessados: Item[] = []
      
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        
        // Pular linhas completamente vazias
        if (!row || row.length === 0) continue
        
        // Verificar se há pelo menos um valor não vazio na linha
        const hasContent = row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '')
        if (!hasContent) continue
        
        // Log para debug
        console.log(`Processando linha ${i}:`, row)
        
        // Extrair dados usando o mapeamento de colunas
        const itemCol = columnMap['item'] ?? 0
        const codigoCol = columnMap['codigo'] ?? 1
        const bancoCol = columnMap['banco'] ?? columnMap['codigo'] ?? 1 // Fallback para código
        const descricaoCol = columnMap['descricao'] ?? 2
        const undCol = columnMap['und'] ?? 3
        const quantidadeCol = columnMap['quantidade'] ?? 4
        const valorUnitCol = columnMap['valorUnitBdi'] ?? columnMap['valorUnit'] ?? 5
        const totalCol = columnMap['total'] ?? 6
        
        // Função para parsear valores numéricos - detecta formato automaticamente
        const parseNumeric = (value: any): number => {
          if (value === null || value === undefined || value === '') return 0
          if (typeof value === 'number') return value
          
          let cleaned = value.toString().replace(/\s/g, '').replace(/[R$]/g, '')
          
          // Detectar formato: verificar qual separador vem por último
          const lastComma = cleaned.lastIndexOf(',')
          const lastDot = cleaned.lastIndexOf('.')
          
          if (lastComma > lastDot) {
            // Formato brasileiro: 1.234,56 (vírgula é decimal)
            cleaned = cleaned.replace(/\./g, '').replace(',', '.')
          } else if (lastDot > lastComma) {
            // Formato americano: 1,234.56 (ponto é decimal)
            cleaned = cleaned.replace(/,/g, '')
          }
          // Se só tem um tipo de separador, parseFloat lida corretamente
          
          return parseFloat(cleaned) || 0
        }
        
        const quantidade = parseNumeric(row[quantidadeCol])
        const valorUnitarioOriginal = parseNumeric(row[valorUnitCol])
        const totalOriginal = parseNumeric(row[totalCol])
        
        // MANTER OS VALORES FIÉIS DA PLANILHA - não recalcular
        // Os valores da planilha já vêm com BDI e desconto aplicados pelo responsável
        // Apenas armazenar exatamente como estão nas células
        
        const item: Item = {
          id: Date.now() + i, // ID único
          item: row[itemCol] ? row[itemCol].toString().trim() : '',
          codigo: row[codigoCol] ? row[codigoCol].toString().trim() : '',
          banco: row[bancoCol] ? row[bancoCol].toString().trim() : '',
          descricao: row[descricaoCol] ? row[descricaoCol].toString().trim() : '',
          und: row[undCol] ? row[undCol].toString().trim() : '',
          quantidade: quantidade,
          valorUnitario: valorUnitarioOriginal, // Valor exato da célula "Valor Unit"
          valorTotal: totalOriginal, // Valor exato da célula "Total"
          valorTotalSemDesconto: totalOriginal, // Guardamos o mesmo para referência futura
          aditivo: { qnt: 0, percentual: 0, total: 0 },
          totalContrato: totalOriginal, // Valor exato da planilha
          importado: true,
          nivel: 3,
          ehAdministracaoLocal: false,
          ordem: dadosProcessados.length + 1 // Sequencial baseado nos itens processados
        }
        
        // Só adicionar se tiver pelo menos o número do item
        if (item.item) {
          dadosProcessados.push(item)
          console.log(`Item adicionado:`, item)
        }
      }

      if (dadosProcessados.length === 0) {
        throw new Error('Nenhum dado válido foi encontrado na planilha.')
      }

      // Chamar a função de callback para importar os dados e percentual de desconto
      const descontoFinal = percentualDesconto ? parseFloat(percentualDesconto) : 0
      onImportar(dadosProcessados, descontoFinal)
      setSucesso(`${dadosProcessados.length} itens importados com sucesso!`)
      
      // Fechar o modal após 2 segundos
      setTimeout(() => {
        onFechar()
      }, 2000)

    } catch (error) {
      console.error('Erro ao processar planilha:', error)
      setErro(`Erro ao processar planilha: ${(error as Error).message}`)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Planilha Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Selecione o arquivo Excel (.xlsx)
          </label>
          <Input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Percentual de Desconto (%) <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={percentualDesconto}
            onChange={(e) => setPercentualDesconto(e.target.value)}
            placeholder="Ex: 5.50"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Usado apenas para cálculos futuros de aditivos. Os valores importados serão mantidos exatamente como estão na planilha.
          </p>
        </div>

        {erro && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {sucesso && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{sucesso}</AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">Colunas obrigatórias:</p>
          <ul className="text-xs space-y-1">
            <li>• Item</li>
            <li>• Código (ou Código Banco)</li>
            <li>• Descrição</li>
            <li>• Und</li>
            <li>• Quant.</li>
            <li>• Valor Unit</li>
            <li>• Total</li>
          </ul>
          <p className="text-xs mt-2 italic text-green-600 dark:text-green-400">
            ✓ Os valores serão importados exatamente como estão nas células da planilha (Valor Unit e Total).
          </p>
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