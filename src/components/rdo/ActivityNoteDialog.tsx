import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActivityNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  activityId: string;
  orcamentoItemId?: string;
  itemDescricao: string;
  source?: 'manual' | 'planilha' | 'template';
  itemRef?: string;
}

export function ActivityNoteDialog({
  open,
  onOpenChange,
  reportId,
  activityId,
  orcamentoItemId,
  itemDescricao,
  source = 'manual',
  itemRef,
}: ActivityNoteDialogProps) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState('');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['rdo-activity-notes', activityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rdo_activity_notes')
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!activityId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!texto.trim()) {
        toast.error('Digite uma observação');
        return;
      }

      const { error } = await supabase.from('rdo_activity_notes').insert({
        report_id: reportId,
        activity_id: activityId,
        orcamento_item_id: orcamentoItemId,
        texto: texto.trim(),
        source: source,
        item_ref: itemRef,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-activity-notes', activityId] });
      setTexto('');
      toast.success('Observação salva');
    },
    onError: () => {
      toast.error('Erro ao salvar observação');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Observações - {itemDescricao}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulário de nova observação */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nova observação</label>
            <Textarea
              placeholder="Digite sua observação sobre este serviço..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
            />
          </div>

          {/* Histórico de observações */}
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">Carregando...</div>
          ) : notes.length > 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Histórico de observações</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 bg-muted rounded-lg text-sm">
                    <p className="whitespace-pre-wrap">{note.texto}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(note.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !texto.trim()}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Observação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
