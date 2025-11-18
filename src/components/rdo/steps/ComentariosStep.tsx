import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  texto: string;
  created_by?: string;
  created_at: string;
  profiles?: {
    display_name?: string;
    email?: string;
    role?: 'admin' | 'editor' | 'contratada';
  };
}

interface ComentariosStepProps {
  reportId?: string;
  obraId: string;
}

export function ComentariosStep({ reportId, obraId }: ComentariosStepProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['rdo-comments', reportId],
    queryFn: async () => {
      if (!reportId) return [];
      
      // Buscar comentários
      const { data: commentsData, error: commentsError } = await supabase
        .from('rdo_comments')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });
      
      if (commentsError) throw commentsError;
      if (!commentsData || commentsData.length === 0) return [];
      
      // Buscar perfis dos criadores
      const creatorIds = [...new Set(commentsData.map(c => c.created_by).filter(Boolean))];
      if (creatorIds.length === 0) return commentsData as Comment[];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, role')
        .in('user_id', creatorIds);
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }
      
      // Mapear profiles por user_id
      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );
      
      // Combinar dados
      return commentsData.map(comment => ({
        ...comment,
        profiles: comment.created_by ? profilesMap.get(comment.created_by) : undefined
      })) as Comment[];
    },
    enabled: !!reportId,
  });

  const addMutation = useMutation({
    mutationFn: async (texto: string) => {
      if (!reportId) {
        toast.error('Salve o RDO antes de adicionar comentários');
        return;
      }

      const { error } = await supabase.from('rdo_comments').insert({
        obra_id: obraId,
        report_id: reportId,
        texto,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-comments', reportId] });
      setNewComment('');
      toast.success('Comentário adicionado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rdo_comments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdo-comments', reportId] });
      toast.success('Comentário removido');
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast.error('Digite um comentário');
      return;
    }
    addMutation.mutate(newComment);
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Comentários</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Comentários</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de comentários */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum comentário. Seja o primeiro a comentar!
            </div>
          ) : (
            comments.map((comment) => {
              // Determinar role e estilo do badge baseado no perfil do autor do comentário
              const isContratada = comment.profiles?.role === 'contratada';
              const roleLabel = isContratada ? 'Contratada' : 'Fiscal';
              const roleColor = isContratada
                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
                : 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
              
              return (
                <div key={comment.id} className="flex gap-3 p-3 border rounded-lg">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback>
                      {comment.profiles?.display_name?.[0]?.toUpperCase() || 
                       comment.profiles?.email?.[0]?.toUpperCase() || 
                       '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {comment.profiles?.display_name || comment.profiles?.email || 'Usuário'}
                          </p>
                          <Badge variant="outline" className={`text-xs ${roleColor}`}>
                            {roleLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {comment.created_by === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteMutation.mutate(comment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.texto}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Campo de novo comentário */}
        <div className="space-y-2 pt-4 border-t">
          <Textarea
            placeholder="Escreva um comentário..."
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleAddComment();
              }
            }}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Pressione Ctrl+Enter para enviar
            </p>
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || addMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Adicionar Comentário
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
