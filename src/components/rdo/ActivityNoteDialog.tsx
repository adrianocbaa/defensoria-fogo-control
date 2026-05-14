import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, Pencil, Trash2, X, Check } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  const [texto, setTexto] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

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

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['rdo-activity-notes', activityId] });

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
        source,
        item_ref: itemRef,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setTexto('');
      toast.success('Observação salva');
    },
    onError: () => toast.error('Erro ao salvar observação'),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, novoTexto, originalAtual }: { id: string; novoTexto: string; originalAtual: string | null }) => {
      if (!novoTexto.trim()) {
        toast.error('Digite uma observação');
        return;
      }
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      const { error } = await supabase
        .from('rdo_activity_notes')
        .update({
          texto: novoTexto.trim(),
          edited_at: new Date().toISOString(),
          edited_by: user?.id ?? null,
          original_texto: originalAtual ?? note.texto,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      setEditingText('');
      toast.success('Observação editada');
    },
    onError: () => toast.error('Erro ao editar observação'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rdo_activity_notes')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id ?? null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Observação excluída');
    },
    onError: () => toast.error('Erro ao excluir observação'),
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Nova observação</label>
            <Textarea
              placeholder="Digite sua observação sobre este serviço..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
            />
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">Carregando...</div>
          ) : notes.length > 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Histórico de observações</label>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notes.map((note: any) => {
                  const isDeleted = !!note.deleted_at;
                  const isEdited = !!note.edited_at;
                  const isEditing = editingId === note.id;
                  const isOwner = user?.id && note.created_by === user.id;
                  return (
                    <div
                      key={note.id}
                      className={`p-3 rounded-lg text-sm border ${
                        isDeleted ? 'bg-muted/40 border-dashed border-muted-foreground/30' : 'bg-muted'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setEditingText('');
                              }}
                            >
                              <X className="h-4 w-4 mr-1" /> Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                editMutation.mutate({
                                  id: note.id,
                                  novoTexto: editingText,
                                  originalAtual: note.original_texto,
                                })
                              }
                              disabled={editMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" /> Salvar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p
                            className={`whitespace-pre-wrap ${
                              isDeleted ? 'line-through text-muted-foreground italic' : ''
                            }`}
                          >
                            {note.texto}
                          </p>
                          {isDeleted && (
                            <p className="text-xs text-destructive mt-1 italic">
                              Observação excluída — não é mais pertinente
                            </p>
                          )}
                          {isEdited && note.original_texto && (
                            <div className="mt-2 pt-2 border-t border-border/60">
                              <p className="text-xs text-muted-foreground mb-1">Texto original (antes da edição):</p>
                              <p className="text-xs whitespace-pre-wrap text-muted-foreground italic">
                                {note.original_texto}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                            <p className="text-xs text-muted-foreground">
                              {new Date(note.created_at).toLocaleString('pt-BR')}
                              {isEdited && (
                                <span className="ml-2">
                                  · editado em {new Date(note.edited_at).toLocaleString('pt-BR')}
                                </span>
                              )}
                              {isDeleted && (
                                <span className="ml-2">
                                  · excluído em {new Date(note.deleted_at).toLocaleString('pt-BR')}
                                </span>
                              )}
                            </p>
                            {!isDeleted && isOwner && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  onClick={() => {
                                    setEditingId(note.id);
                                    setEditingText(note.texto);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm('Excluir esta observação? Ela ficará registrada no histórico como excluída.')) {
                                      deleteMutation.mutate(note.id);
                                    }
                                  }}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
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
