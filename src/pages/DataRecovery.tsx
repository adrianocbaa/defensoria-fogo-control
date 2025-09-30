import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AuditLog {
  id: string;
  table_name: string;
  operation: string;
  old_values: any;
  user_email: string;
  created_at: string;
}

export default function DataRecovery() {
  const [loading, setLoading] = useState(true);
  const [deletedRecords, setDeletedRecords] = useState<AuditLog[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    fetchDeletedRecords();
  }, [dateRange]);

  const fetchDeletedRecords = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('operation', 'DELETE')
        .in('table_name', ['nuclei', 'fire_extinguishers', 'hydrants', 'documents']);

      // Apply date range filter if set
      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setDeletedRecords(data || []);
    } catch (error) {
      console.error('Erro ao buscar registros excluídos:', error);
      toast.error('Erro ao carregar registros excluídos');
    } finally {
      setLoading(false);
    }
  };

  const restoreRecord = async (record: AuditLog) => {
    setRestoring(record.id);
    try {
      let error;
      
      // Type-safe insertion based on table name
      if (record.table_name === 'nuclei') {
        const result = await supabase.from('nuclei').insert(record.old_values);
        error = result.error;
      } else if (record.table_name === 'fire_extinguishers') {
        const result = await supabase.from('fire_extinguishers').insert(record.old_values);
        error = result.error;
      } else if (record.table_name === 'hydrants') {
        const result = await supabase.from('hydrants').insert(record.old_values);
        error = result.error;
      } else if (record.table_name === 'documents') {
        const result = await supabase.from('documents').insert(record.old_values);
        error = result.error;
      }

      if (error) throw error;

      toast.success('Registro restaurado com sucesso!');
      
      // Remove from list after successful restoration
      setDeletedRecords(prev => prev.filter(r => r.id !== record.id));
    } catch (error: any) {
      console.error('Erro ao restaurar registro:', error);
      if (error.code === '23505') {
        toast.error('Este registro já existe no banco de dados');
      } else {
        toast.error('Erro ao restaurar registro: ' + error.message);
      }
    } finally {
      setRestoring(null);
    }
  };

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      nuclei: 'Núcleos',
      fire_extinguishers: 'Extintores',
      hydrants: 'Hidrantes',
      documents: 'Documentos',
    };
    return labels[tableName] || tableName;
  };

  const getRecordDescription = (record: AuditLog) => {
    const values = record.old_values;
    switch (record.table_name) {
      case 'nuclei':
        return `${values.name} - ${values.city}`;
      case 'fire_extinguishers':
        return `${values.type} - ${values.location}`;
      case 'hydrants':
        return values.location;
      case 'documents':
        return values.name;
      default:
        return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Recuperação de Dados"
        subtitle="Restaure dados excluídos do módulo Preventivos"
      />

      <Card>
        <CardHeader>
          <CardTitle>Registros Excluídos</CardTitle>
          <CardDescription>
            Total de {deletedRecords.length} registros disponíveis para recuperação
          </CardDescription>
          <div className="mt-4">
            <DatePickerWithRange 
              date={dateRange} 
              setDate={setDateRange}
              className="w-full max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Excluído por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {getTableLabel(record.table_name)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {getRecordDescription(record)}
                    </TableCell>
                    <TableCell>{record.user_email}</TableCell>
                    <TableCell>
                      {format(new Date(record.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreRecord(record)}
                        disabled={restoring === record.id}
                      >
                        {restoring === record.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Restaurando...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restaurar
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {deletedRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum registro excluído encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
