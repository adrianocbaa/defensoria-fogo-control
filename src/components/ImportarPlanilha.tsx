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

    if (!percentualDesconto || parseFloat(percentualDesconto) < 0 || parseFloat(percentualDesconto) > 100) {
      setErro('Por favor, informe um percentual de desconto válido (0-100)')
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
      
      // Encontrar a linha de cabeçalho (procurar por "Item" em qualquer coluna)
      let headerRowIndex = -1
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (row && row.length > 0) {
          // Procurar por "Item" em qualquer coluna da linha
          for (let j = 0; j < row.length; j++) {
            if (row[j] && row[j].toString().toLowerCase().trim() === 'item') {
              headerRowIndex = i
              break
            }
          }
          if (headerRowIndex !== -1) break
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('Não foi possível encontrar a linha de cabeçalho. Certifique-se de que a primeira coluna contenha "Item".')
      }

      // Processar os dados a partir da linha seguinte ao cabeçalho
      const dadosProcessados: Item[] = []
      const desconto = parseFloat(percentualDesconto) / 100
      
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        
        // Pular linhas completamente vazias
        if (!row || row.length === 0) continue
        
        // Verificar se há pelo menos um valor não vazio na linha
        const hasContent = row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '')
        if (!hasContent) continue
        
        // Log para debug
        console.log(`Processando linha ${i}:`, row)
        
        // Nova estrutura com 9 colunas (A-I):
        // A: Item (0)
        // B: Código (1)
        // C: Banco (2)
        // D: Descrição (3)
        // E: Und (4)
        // F: Quant. (5)
        // G: Valor Unit (6)
        // H: Valor Unit com BDI (7)
        // I: Total sem Desconto (8)
        
        const quantidade = parseFloat(row[5]) || 0
        const totalSemDesconto = parseFloat(row[8]) || 0
        
        // Aplicar desconto: TRUNCAR(I - (I * desconto%), 2)
        const valorTotalComDesconto = Math.trunc((totalSemDesconto - (totalSemDesconto * desconto)) * 100) / 100
        
        // Calcular valor unitário com desconto (também truncado para 2 casas decimais)
        const valorUnitarioComDescontoRaw = quantidade > 0 ? valorTotalComDesconto / quantidade : 0
        const valorUnitarioComDesconto = Math.trunc(valorUnitarioComDescontoRaw * 100) / 100
        
        const item: Item = {
          id: Date.now() + i, // ID único
          item: row[0] ? row[0].toString().trim() : '',
          codigo: row[1] ? row[1].toString().trim() : '',
          banco: row[2] ? row[2].toString().trim() : '',
          descricao: row[3] ? row[3].toString().trim() : '',
          und: row[4] ? row[4].toString().trim() : '',
          quantidade: quantidade,
          valorUnitario: valorUnitarioComDesconto,
          valorTotal: valorTotalComDesconto,
          valorTotalSemDesconto: totalSemDesconto, // Valor original da coluna I para cálculos de aditivo
          aditivo: { qnt: 0, percentual: 0, total: 0 },
          totalContrato: valorTotalComDesconto,
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
      onImportar(dadosProcessados, parseFloat(percentualDesconto))
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
            Percentual de Desconto (%)
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
            Informe o percentual de desconto ofertado pela empresa (0-100%)
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
          <p className="font-medium mb-1">Formato esperado:</p>
          <ul className="text-xs space-y-1">
            <li>• Item</li>
            <li>• Código</li>
            <li>• Banco</li>
            <li>• Descrição</li>
            <li>• Und</li>
            <li>• Quant.</li>
            <li>• Valor Unit</li>
            <li>• Valor Unit com BDI</li>
            <li>• Total sem Desconto</li>
          </ul>
          <p className="text-xs mt-2 italic">
            O desconto será aplicado automaticamente sobre o Total sem Desconto
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={processarPlanilha} 
            disabled={!arquivo || !percentualDesconto || carregando}
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