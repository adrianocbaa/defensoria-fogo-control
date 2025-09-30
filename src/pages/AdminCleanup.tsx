import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';

export default function AdminCleanup() {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canEdit } = useUserRole();

  useEffect(() => {
    document.title = 'Limpeza de Dados | Admin';
  }, []);

  if (!canEdit) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-6 lg:px-8 py-12">
          <Card className="max-w-2xl mx-auto border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" /> Acesso negado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Você não possui permissão para executar esta ação.
              </p>
            </CardContent>
          </Card>
        </div>
      </SimpleHeader>
    );
  }

  const deleteAllRows = async (table: string) => {
    const fromAny = (supabase.from as any).bind(supabase);
    const { error } = await fromAny(table).delete().not('id', 'is', null);
    if (error) throw new Error(`${table}: ${error.message}`);
  };

  const handleCleanup = async () => {
    if (confirmText !== 'APAGAR') {
      toast({
        title: 'Confirmação necessária',
        description: 'Digite APAGAR para confirmar a exclusão definitiva.',
        variant: 'destructive',
      });
      return;
    }

    if (!window.confirm('Esta ação é irreversível. Deseja realmente excluir TODOS os dados selecionados?')) {
      return;
    }

    setLoading(true);
    try {
      // Apagar dados dependentes primeiro (em paralelo)
      await Promise.all([
        deleteAllRows('nucleo_teletrabalho'),
        deleteAllRows('fire_extinguishers'),
        deleteAllRows('hydrants'),
        deleteAllRows('documents'),
        deleteAllRows('nucleo_module_visibility'),
      ]);

      // Tabelas principais
      await deleteAllRows('nuclei');
      await deleteAllRows('nucleos_central');

      toast({
        title: 'Limpeza concluída',
        description: 'Todos os núcleos e dados relacionados foram removidos com sucesso.',
      });

      setConfirmText('');
      navigate('/preventivos');
    } catch (err: any) {
      toast({
        title: 'Erro ao limpar dados',
        description: err?.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SimpleHeader>
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 lg:px-8 py-4 lg:py-6">
          <PageHeader
            title="Limpeza de Dados (Admin)"
            subtitle="Exclui todos os núcleos e informações relacionadas dos módulos Preventivos, Teletrabalho e Núcleos Central"
          />
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-8 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Ação Irreversível
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>Remove todos os registros de Núcleos Central (nucleos_central)</li>
              <li>Remove visibilidade por módulo (nucleo_module_visibility)</li>
              <li>Remove todos os núcleos legados do Preventivos (nuclei)</li>
              <li>Remove dados de Teletrabalho (nucleo_teletrabalho)</li>
              <li>Remove Extintores e Hidrantes (fire_extinguishers, hydrants)</li>
              <li>Remove Documentos associados (documents)</li>
            </ul>

            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm text-foreground">
                Para confirmar, digite <span className="font-semibold">APAGAR</span>
              </label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="APAGAR"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleCleanup}
                disabled={loading || confirmText !== 'APAGAR'}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {loading ? 'Apagando...' : 'Apagar tudo agora'}
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleHeader>
  );
}
