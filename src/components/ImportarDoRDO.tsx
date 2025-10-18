import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface ImportarDoRDOProps {
  obraId: string;
  onImportar: (dados: { [itemCode: string]: number }) => void;
  onFechar: () => void;
}

export function ImportarDoRDO({ obraId, onImportar, onFechar }: ImportarDoRDOProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleImportar = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      setErro('Por favor, selecione um período válido');
      return;
    }

    try {
      setCarregando(true);
      setErro('');

      const dataInicio = format(dateRange.from, 'yyyy-MM-dd');
      const dataFim = format(dateRange.to, 'yyyy-MM-dd');

      // Buscar todos os RDOs aprovados no período selecionado
      const { data: rdoReports, error: rdoError } = await supabase
        .from('rdo_reports')
        .select('id')
        .eq('obra_id', obraId)
        .eq('status', 'aprovado')
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (rdoError) throw rdoError;

      if (!rdoReports || rdoReports.length === 0) {
        setErro('Nenhum RDO aprovado encontrado no período selecionado');
        return;
      }

      const reportIds = rdoReports.map(r => r.id);

      // Buscar todas as atividades do tipo 'planilha' desses RDOs
      const { data: activities, error: activitiesError } = await supabase
        .from('rdo_activities')
        .select('item_code, executado_dia, orcamento_item_id')
        .eq('obra_id', obraId)
        .eq('tipo', 'planilha')
        .in('report_id', reportIds)
        .not('orcamento_item_id', 'is', null);

      if (activitiesError) throw activitiesError;

      if (!activities || activities.length === 0) {
        setErro('Nenhuma atividade encontrada nos RDOs do período selecionado');
        return;
      }

      // Agregar executado_dia por item_code
      const agregado = new Map<string, number>();
      
      activities.forEach((activity) => {
        const itemCode = activity.item_code?.trim();
        const executado = Number(activity.executado_dia || 0);
        
        if (itemCode && executado > 0) {
          const atual = agregado.get(itemCode) || 0;
          agregado.set(itemCode, atual + executado);
        }
      });

      if (agregado.size === 0) {
        setErro('Nenhum valor executado encontrado no período selecionado');
        return;
      }

      // Converter para objeto
      const dadosImportados: { [itemCode: string]: number } = {};
      agregado.forEach((valor, codigo) => {
        dadosImportados[codigo] = valor;
      });

      toast.success(
        `${agregado.size} itens importados do RDO (${rdoReports.length} relatórios no período)`
      );
      
      onImportar(dadosImportados);
      onFechar();
    } catch (error) {
      console.error('Erro ao importar do RDO:', error);
      setErro('Erro ao importar dados do RDO. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Importar Dados do RDO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {erro && (
          <Alert variant="destructive">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Selecione o período dos RDOs
          </label>
          <DatePickerWithRange
            date={dateRange}
            setDate={setDateRange}
          />
          <p className="text-xs text-muted-foreground">
            O sistema irá somar os valores executados de todos os RDOs aprovados no período selecionado.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onFechar}
            disabled={carregando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={carregando || !dateRange?.from || !dateRange?.to}
          >
            {carregando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              'Importar do RDO'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
