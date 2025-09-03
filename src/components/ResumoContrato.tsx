import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

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
  ehItemPrimeiroNivel 
}: ResumoContratoProps) {
  
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

        if (item.origem === 'extracontratual') {
          // Extracontratuais (valor pode ser >= 0, negativos não esperados)
          extracontratuais += aditivoData.total;
        } else {
          // Itens contratuais (origem = 'base' ou undefined)
          if (aditivoData.total > 0) {
            acrescidos += aditivoData.total;
          } else if (aditivoData.total < 0) {
            decrescidos += Math.abs(aditivoData.total);
          }
        }
      });

      // TOTAL GERAL DO ADITIVO = ACRESCIDOS - DECRESCIDOS + EXTRACONTRATUAIS
      const totalGeral = acrescidos - decrescidos + extracontratuais;
      acumulado += totalGeral;

      linhas.push({
        aditivo,
        totalGeral,
        acrescidos,
        decrescidos,
        extracontratuais,
        acrescMaisExtra: acrescidos + extracontratuais,
        percAditivo: valorTotalOriginal ? (totalGeral / valorTotalOriginal) : 0,
        percAcumulado: valorTotalOriginal ? (acumulado / valorTotalOriginal) : 0,
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
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold text-gray-800">
            RESUMO DO CONTRATO
          </CardTitle>
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
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-full bg-white">
            
            {/* Valor Inicial do Contrato */}
            <div className="grid grid-cols-4 border-b-2 border-gray-300">
              <div className="col-span-1 p-3 bg-gray-100 font-semibold text-gray-700 border-r border-gray-300">
                VALOR INICIAL DO CONTRATO
              </div>
              <div className="col-span-1 p-3 font-bold text-right border-r border-gray-300">
                {formatCurrency(valorTotalOriginal)}
              </div>
              <div className="col-span-1 p-3 text-center font-semibold border-r border-gray-300">
                100%
              </div>
              <div className="col-span-1 p-3 text-center font-semibold">
                100%
              </div>
            </div>

            {linhas.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Nenhum aditivo publicado encontrado.
              </div>
            ) : (
              linhas.map((linha, index) => (
                <div key={linha.aditivo.id} className="border-b border-gray-200">
                  
                  {/* Cabeçalho do Aditivo */}
                  <div className="grid grid-cols-4 bg-orange-50 border-b border-orange-200">
                    <div className="col-span-1 p-3 font-bold text-gray-800">
                      {linha.aditivo.nome}
                    </div>
                    <div className="col-span-1 p-3 text-center font-semibold text-orange-600">
                      PERCENTUAL DO ADITIVO
                    </div>
                    <div className="col-span-1 p-3 text-center font-semibold text-orange-600">
                      PERCENTUAL ACUMULADO
                    </div>
                    <div className="col-span-1 p-3"></div>
                  </div>

                  {/* TOTAL GERAL DO ADITIVO */}
                  <div className="grid grid-cols-4 border-b border-gray-200 bg-orange-50">
                    <div className="col-span-1 p-3 font-semibold text-orange-600">
                      TOTAL GERAL DO ADITIVO
                    </div>
                    <div className="col-span-1 p-3 font-bold text-right text-orange-600">
                      {formatCurrency(linha.totalGeral)}
                    </div>
                    <div className="col-span-1 p-3 text-center font-semibold text-orange-600">
                      {(linha.percAditivo * 100).toFixed(2)}%
                    </div>
                    <div className="col-span-1 p-3 text-center font-semibold text-orange-600">
                      {(linha.percAcumulado * 100).toFixed(2)}%
                    </div>
                  </div>

                  {/* TOTAL DE SERVIÇOS ACRESCIDOS */}
                  <div className="grid grid-cols-4 border-b border-gray-200">
                    <div className="col-span-1 p-3 font-semibold text-blue-800">
                      TOTAL DE SERVIÇOS ACRESCIDOS
                    </div>
                    <div className="col-span-1 p-3 font-bold text-right text-blue-800">
                      {formatCurrency(linha.acrescidos)}
                    </div>
                    <div className="col-span-1 p-3 text-center text-blue-600">
                      {valorTotalOriginal ? ((linha.acrescidos / valorTotalOriginal) * 100).toFixed(2) : '0.00'}%
                    </div>
                    <div className="col-span-1 p-3"></div>
                  </div>

                  {/* TOTAL DE SERVIÇOS DECRESCIDOS */}
                  <div className="grid grid-cols-4 border-b border-gray-200">
                    <div className="col-span-1 p-3 font-semibold text-red-600">
                      TOTAL DE SERVIÇOS DECRESCIDOS
                    </div>
                    <div className="col-span-1 p-3 font-bold text-right text-red-600">
                      {formatCurrency(linha.decrescidos)}
                    </div>
                    <div className="col-span-1 p-3 text-center text-red-500">
                      {valorTotalOriginal ? ((linha.decrescidos / valorTotalOriginal) * 100).toFixed(2) : '0.00'}%
                    </div>
                    <div className="col-span-1 p-3"></div>
                  </div>

                  {/* TOTAL DOS SERVIÇOS EXTRACONTRATUAIS */}
                  <div className="grid grid-cols-4 border-b border-gray-200">
                    <div className="col-span-1 p-3 font-semibold text-green-600">
                      TOTAL DOS SERVIÇOS EXTRACONTRATUAIS
                    </div>
                    <div className="col-span-1 p-3 font-bold text-right text-green-600">
                      {formatCurrency(linha.extracontratuais)}
                    </div>
                    <div className="col-span-1 p-3 text-center text-green-500">
                      {valorTotalOriginal ? ((linha.extracontratuais / valorTotalOriginal) * 100).toFixed(2) : '0.00'}%
                    </div>
                    <div className="col-span-1 p-3"></div>
                  </div>

                  {/* TOTAL DOS SERVIÇOS ACRESCIDOS + EXTRACONTRATUAIS */}
                  <div className="grid grid-cols-4 border-b border-gray-200">
                    <div className="col-span-1 p-3 font-semibold text-indigo-600">
                      TOTAL DOS SERVIÇOS ACRESCIDOS + EXTRACONTRATUAIS
                    </div>
                    <div className="col-span-1 p-3 font-bold text-right text-indigo-600">
                      {formatCurrency(linha.acrescMaisExtra)}
                    </div>
                    <div className="col-span-1 p-3 text-center text-indigo-500">
                      {valorTotalOriginal ? ((linha.acrescMaisExtra / valorTotalOriginal) * 100).toFixed(2) : '0.00'}%
                    </div>
                    <div className="col-span-1 p-3"></div>
                  </div>

                  {/* VALOR CONTRATO PÓS ADITIVO */}
                  <div className="grid grid-cols-4 border-b-2 border-green-300 bg-green-50">
                    <div className="col-span-1 p-3 font-bold text-green-700">
                      VALOR CONTRATO PÓS ADITIVO
                    </div>
                    <div className="col-span-1 p-3 font-bold text-right text-green-700 text-lg">
                      {formatCurrency(linha.valorPosAditivo)}
                    </div>
                    <div className="col-span-1 p-3"></div>
                    <div className="col-span-1 p-3"></div>
                  </div>

                </div>
              ))
            )}

          </div>
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
    </Card>
  );
}