import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Building2, Save } from 'lucide-react';

interface UserObraAccessManagerProps {
  userId: string;
  userName: string;
  isContratada: boolean;
}

interface Obra {
  id: string;
  nome: string;
  municipio: string;
}

interface ObraAccess {
  obra_id: string;
}

export function UserObraAccessManager({ userId, userName, isContratada }: UserObraAccessManagerProps) {
  const [obras, setObras] = useState<Obra[]>([]);
  const [accessedObras, setAccessedObras] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isContratada) {
      fetchData();
    }
  }, [userId, isContratada]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch only obras "Em andamento"
      const { data: obrasData, error: obrasError } = await supabase
        .from('obras')
        .select('id, nome, municipio, status')
        .eq('status', 'Em andamento')
        .order('nome');

      if (obrasError) throw obrasError;
      setObras(obrasData || []);

      // Fetch user's current obra access
      const { data: accessData, error: accessError } = await supabase
        .from('user_obra_access')
        .select('obra_id')
        .eq('user_id', userId);

      if (accessError) throw accessError;
      
      const currentAccess = new Set((accessData || []).map(a => a.obra_id));
      setAccessedObras(currentAccess);
      setPendingChanges(new Set(currentAccess));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados de acesso',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleObraAccess = (obraId: string) => {
    setPendingChanges(prev => {
      const newChanges = new Set(prev);
      if (newChanges.has(obraId)) {
        newChanges.delete(obraId);
      } else {
        newChanges.add(obraId);
      }
      return newChanges;
    });
  };

  const saveChanges = async () => {
    try {
      setSaving(true);

      // Find obras to add and remove
      const obrasToAdd = Array.from(pendingChanges).filter(id => !accessedObras.has(id));
      const obrasToRemove = Array.from(accessedObras).filter(id => !pendingChanges.has(id));

      // Remove access
      if (obrasToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_obra_access')
          .delete()
          .eq('user_id', userId)
          .in('obra_id', obrasToRemove);

        if (deleteError) throw deleteError;
      }

      // Add access
      if (obrasToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('user_obra_access')
          .insert(obrasToAdd.map(obra_id => ({ user_id: userId, obra_id })));

        if (insertError) throw insertError;
      }

      setAccessedObras(new Set(pendingChanges));
      
      toast({
        title: 'Sucesso',
        description: 'Acessos atualizados com sucesso',
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar alterações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isContratada) {
    return null;
  }

  const hasChanges = 
    pendingChanges.size !== accessedObras.size ||
    Array.from(pendingChanges).some(id => !accessedObras.has(id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Controle de Acesso a Obras
        </CardTitle>
        <CardDescription>
          Selecione as obras que {userName} poderá visualizar e editar diários
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-muted-foreground">Carregando obras...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 max-h-96 overflow-y-auto p-2 border rounded-md">
              {obras.map((obra) => (
                <div key={obra.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md">
                  <Checkbox
                    id={`obra-${obra.id}`}
                    checked={pendingChanges.has(obra.id)}
                    onCheckedChange={() => toggleObraAccess(obra.id)}
                  />
                  <Label 
                    htmlFor={`obra-${obra.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{obra.nome}</div>
                    <div className="text-sm text-muted-foreground">{obra.municipio}</div>
                  </Label>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <Badge variant="outline">
                {pendingChanges.size} {pendingChanges.size === 1 ? 'obra selecionada' : 'obras selecionadas'}
              </Badge>
              
              {hasChanges && (
                <Button onClick={saveChanges} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
