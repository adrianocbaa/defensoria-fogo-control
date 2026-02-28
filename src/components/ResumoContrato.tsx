import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { MedicaoProgressBar, MedicaoMarcoBar } from '@/components/MedicaoProgressBar';

interface Item {
  id: number;
  item: string;
  codigo: string;
  valorTotal: number;
  origem?: string;
}

interface Aditivo {
  id: number;
  nome: string;
  dados: { [itemId: number]: { qnt: number; percentual: number; total: number } };
  sequencia?: number;
  bloqueada?: boolean;
}

interface ResumoContratoProps {
  valorTotalOriginal: number;
  aditivos: Aditivo[];
  items: Item[];
  ehItemPrimeiroNivel: (itemCode: string) => boolean;
  medicaoAtual?: number;
  canEdit?: boolean;
  marcos?: MedicaoMarcoBar[];
  totalContrato?: number;
}

interface ResumoAditivoData {
  aditivo: Aditivo;
  totalGeral: number;
  acrescidos: number;
  decrescidos: number;
  extracontratuais: number;
  acrescMaisExtra: number;
  percAditivo: number;
  percAcumulado: number;
  valorPosAditivo: number;
}

export function ResumoContrato({ 
  valorTotalOriginal, 
  aditivos, 
  items, 
  ehItemPrimeiroNivel,
  medicaoAtual,
  canEdit = true,
  marcos = [],
  totalContrato,
}: ResumoContratoProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calcular dados do resumo conforme especificação
  const calcularResumo = (): { linhas: ResumoAditivoData[]; valorFinalContrato: number } => {
    // Filtrar apenas aditivos publicados/bloqueados e ordenar por sequência
    const aditivosPublicados = aditivos
      .filter(a => a.bloqueada)
      .sort((a, b) => (a.sequencia || 0) - (b.sequencia || 0));

    const linhas: ResumoAditivoData[] = [];
    let acumulado = 0;

    for (const aditivo of aditivosPublicados) {
      // Calcular totais para este aditivo
      let acrescidos = 0;
      let decrescidos = 0;
      let extracontratuais = 0;

      items.forEach(item => {
        const aditivoData = aditivo.dados[item.id];
        if (!aditivoData || aditivoData.total === 0) return;

        const totalItem = aditivoData.total;
        if (totalItem < 0) {
          // Parte 2: Somar valores negativos (decrescidos)
          decrescidos += Math.abs(totalItem);
        } else if (item.origem === 'extracontratual') {
          // Parte 3: Somar apenas positivos dos itens extracontratuais (planilha do aditivo)
          extracontratuais += totalItem;
        } else if (totalItem > 0) {
          // Parte 1: Somar valores positivos em itens existentes do contrato
          acrescidos += totalItem;
        }
      });

      // TOTAL GERAL DO ADITIVO = ACRESCIDOS - DECRESCIDOS + EXTRACONTRATUAIS
      const totalGeral = acrescidos - decrescidos + extracontratuais;
      
      // Todos os aditivos bloqueados (publicados) contribuem para o valor acumulado
      acumulado += totalGeral;

      linhas.push({
        aditivo,
        totalGeral,
        acrescidos,
        decrescidos,
        extracontratuais,
        acrescMaisExtra: acrescidos + extracontratuais,
        percAditivo: valorTotalOriginal ? (totalGeral / valorTotalOriginal) * 100 : 0,
        percAcumulado: valorTotalOriginal ? (acumulado / valorTotalOriginal) * 100 : 0,
        valorPosAditivo: valorTotalOriginal + acumulado
      });
    }

    return { 
      linhas, 
      valorFinalContrato: valorTotalOriginal + acumulado 
    };
  };

  const { linhas, valorFinalContrato } = calcularResumo();

  const exportarPDF = () => {
    // TODO: Implementar exportação PDF
    console.log('Exportar PDF do resumo');
  };

  const exportarExcel = () => {
    // TODO: Implementar exportação Excel
    console.log('Exportar Excel do resumo');
  };

  return (
    <Card className="mb-6">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer hover:text-gray-600 transition-colors">
                <CardTitle className="text-lg font-bold text-gray-800">
                  RESUMO DO CONTRATO
                </CardTitle>
                {isExpanded ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </div>
            </CollapsibleTrigger>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportarPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportarExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>


        <CollapsibleContent>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {linhas.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Nenhum aditivo publicado encontrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-gray-300 bg-white hover:bg-white">
                      <TableHead className="font-bold text-gray-700 bg-gray-100">
                        RESUMO DO CONTRATO
                      </TableHead>
                      <TableHead className="text-center font-bold text-gray-700">
                        VALOR INICIAL DO CONTRATO
                      </TableHead>
                      {linhas.map((linha) => (
                        <TableHead 
                          key={linha.aditivo.id} 
                          colSpan={2}
                          className="text-center font-bold text-gray-700 border-l border-gray-300"
                        >
                          {linha.aditivo.nome}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow className="border-b border-gray-300 bg-white hover:bg-white">
                      <TableHead className="bg-gray-100"></TableHead>
                      <TableHead className="text-center font-semibold">
                        {formatCurrency(valorTotalOriginal)}
                      </TableHead>
                      {linhas.map((linha) => (
                        <React.Fragment key={`header-${linha.aditivo.id}`}>
                          <TableHead className="text-center font-semibold text-orange-600 bg-orange-50 border-l border-gray-300">
                            PERCENTUAL DO ADITIVO
                          </TableHead>
                          <TableHead className="text-center font-semibold text-orange-600 bg-orange-50">
                            PERCENTUAL ACUMULADO
                          </TableHead>
                        </React.Fragment>
                      ))}
                    </TableRow>
                    <TableRow className="border-b border-gray-300 bg-white hover:bg-white">
                      <TableHead className="bg-gray-100"></TableHead>
                      <TableHead className="text-center font-semibold">100%</TableHead>
                      {linhas.map((linha) => (
                        <React.Fragment key={`perc-${linha.aditivo.id}`}>
                          <TableHead className="text-center bg-orange-50 border-l border-gray-300"></TableHead>
                          <TableHead className="text-center bg-orange-50"></TableHead>
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* TOTAL GERAL DO ADITIVO */}
                    <TableRow className="bg-orange-50 hover:bg-orange-50">
                      <TableCell className="font-semibold text-orange-600">
                        TOTAL GERAL DO ADITIVO
                      </TableCell>
                      <TableCell></TableCell>
                      {linhas.map((linha) => (
                        <React.Fragment key={`total-${linha.aditivo.id}`}>
                          <TableCell className="text-center font-bold text-orange-600 border-l border-orange-200">
                            {formatCurrency(linha.totalGeral)}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-orange-600">
                            {linha.percAcumulado.toFixed(2)}%
                          </TableCell>
                        </React.Fragment>
                      ))}
                    </TableRow>

                    {/* TOTAL DE SERVIÇOS ACRESCIDOS */}
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-semibold text-blue-800">
                        TOTAL DE SERVIÇOS ACRESCIDOS
                      </TableCell>
                      <TableCell></TableCell>
                      {linhas.map((linha) => (
                        <React.Fragment key={`acresc-${linha.aditivo.id}`}>
                          <TableCell className="text-center font-bold text-blue-800 border-l border-gray-200">
                            {formatCurrency(linha.acrescidos)}
                          </TableCell>
                          <TableCell className="text-center text-blue-600">
                            {valorTotalOriginal ? ((linha.acrescidos / valorTotalOriginal) * 100).toFixed(2) : '0.00'}%
                          </TableCell>
                        </React.Fragment>
                      ))}
                    </TableRow>

                    {/* TOTAL DE SERVIÇOS DECRESCIDOS */}
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-semibold text-red-600">
                        TOTAL DE SERVIÇOS DECRESCIDOS
                      </TableCell>
                      <TableCell></TableCell>
                      {linhas.map((linha) => (
                        <React.Fragment key={`decresc-${linha.aditivo.id}`}>
                          <TableCell className="text-center font-bold text-red-600 border-l border-gray-200">
                            {linha.decrescidos > 0 ? `-${formatCurrency(linha.decrescidos)}` : formatCurrency(0)}
                          </TableCell>
                          <TableCell className="text-center text-red-500">
                            {valorTotalOriginal ? `-${((linha.decrescidos / valorTotalOriginal) * 100).toFixed(2)}` : '0.00'}%
                          </TableCell>
                        </React.Fragment>
                      ))}
                    </TableRow>

                    {/* TOTAL DOS SERVIÇOS EXTRACONTRATUAIS */}
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-semibold text-green-600">
                        TOTAL DOS SERVIÇOS EXTRACONTRATUAIS
                      </TableCell>
                      <TableCell></TableCell>
                      {linhas.map((linha) => (
                        <React.Fragment key={`extra-${linha.aditivo.id}`}>
                          <TableCell className="text-center font-bold text-green-600 border-l border-gray-200">
                            {formatCurrency(linha.extracontratuais)}
                          </TableCell>
                          <TableCell className="text-center text-green-500">
                            {valorTotalOriginal ? ((linha.extracontratuais / valorTotalOriginal) * 100).toFixed(2) : '0.00'}%
                          </TableCell>
                        </React.Fragment>
                      ))}
                    </TableRow>

                    {/* TOTAL DOS SERVIÇOS ACRESCIDOS + EXTRACONTRATUAIS */}
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-semibold text-indigo-600">
                        TOTAL DOS SERVIÇOS ACRESCIDOS + EXTRACONTRATUAIS
                      </TableCell>
                      <TableCell></TableCell>
                      {linhas.map((linha) => (
                        <React.Fragment key={`soma-${linha.aditivo.id}`}>
                          <TableCell className="text-center font-bold text-indigo-600 border-l border-gray-200">
                            {formatCurrency(linha.acrescMaisExtra)}
                          </TableCell>
                          <TableCell className="text-center text-indigo-500">
                            {valorTotalOriginal ? ((linha.acrescMaisExtra / valorTotalOriginal) * 100).toFixed(2) : '0.00'}%
                          </TableCell>
                        </React.Fragment>
                      ))}
                    </TableRow>

                    {/* VALOR CONTRATO PÓS ADITIVO */}
                    <TableRow className="bg-green-50 hover:bg-green-50 border-t-2 border-green-300">
                      <TableCell className="font-bold text-green-700">
                        VALOR CONTRATO PÓS ADITIVO
                      </TableCell>
                      <TableCell className="text-center font-bold text-green-700">
                        {formatCurrency(valorTotalOriginal)}
                      </TableCell>
                      {linhas.map((linha) => (
                        <React.Fragment key={`pos-${linha.aditivo.id}`}>
                          <TableCell 
                            colSpan={2}
                            className="text-center font-bold text-green-700 text-lg border-l border-green-300"
                          >
                            {formatCurrency(linha.valorPosAditivo)}
                          </TableCell>
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Mensagens informativas */}
            {linhas.length === 0 && (
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400">
                <p className="text-blue-700">
                  Para visualizar o resumo do contrato, é necessário ter pelo menos um aditivo publicado.
                </p>
              </div>
            )}

            {linhas.some(l => l.totalGeral === 0) && (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <p className="text-yellow-700">
                  Alguns aditivos não possuem itens válidos para compor o resumo.
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}