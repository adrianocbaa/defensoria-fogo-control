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
  aditivo: { qnt: number; percentual: number; total: number };
  totalContrato: number;
  importado: boolean;
  nivel: number;
  ehAdministracaoLocal: boolean;
}

interface ImportarPlanilhaProps {
  onImportar: (dados: Item[]) => void;
  onFechar: () => void;
}

const ImportarPlanilha = ({ onImportar, onFechar }: ImportarPlanilhaProps) => {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

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
      
      // Encontrar a linha de cabeçalho (procurar por "Item" na primeira coluna)
      let headerRowIndex = -1
      for (let i = 0; i < jsonData.length; i++) {
        if (jsonData[i][0] && jsonData[i][0].toString().toLowerCase().includes('item')) {
          headerRowIndex = i
          break
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('Não foi possível encontrar a linha de cabeçalho. Certifique-se de que a primeira coluna contenha "Item".')
      }

      // Processar os dados a partir da linha seguinte ao cabeçalho
      const dadosProcessados: Item[] = []
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        
        // Pular linhas vazias
        if (!row || row.length === 0 || !row[0]) continue
        
        const item: Item = {
          id: Date.now() + i, // ID único
          item: row[0] ? row[0].toString() : '',
          codigo: row[1] ? row[1].toString() : '',
          banco: row[2] ? row[2].toString() : '',
          descricao: row[3] ? row[3].toString() : '',
          und: row[4] ? row[4].toString() : '',
          quantidade: parseFloat(row[5]) || 0,
          valorUnitario: parseFloat(row[6]) || 0,
          valorTotal: parseFloat(row[8]) || parseFloat(row[7]) || 0, // Usar coluna 9 (Total com BDI e Desconto) ou coluna 8 como fallback
          aditivo: { qnt: 0, percentual: 0, total: 0 },
          totalContrato: parseFloat(row[8]) || parseFloat(row[7]) || 0,
          importado: true,
          nivel: 3,
          ehAdministracaoLocal: false
        }
        
        dadosProcessados.push(item)
      }

      if (dadosProcessados.length === 0) {
        throw new Error('Nenhum dado válido foi encontrado na planilha.')
      }

      // Chamar a função de callback para importar os dados
      onImportar(dadosProcessados)
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
            <li>• Valor unit com BDI e Desc.</li>
            <li>• Valor total com BDI</li>
            <li>• Total com BDI e Desconto</li>
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