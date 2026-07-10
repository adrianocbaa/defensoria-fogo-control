import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeleteNucleusDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nucleoId: string;
  nucleoName: string;
  onDeleted?: () => void;
}

export function DeleteNucleusDialog({ open, onOpenChange, nucleoId, nucleoName, onDeleted }: DeleteNucleusDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Remover dependências primeiro (extintores, hidrantes, documentos e registro em nuclei)
      await Promise.all([
        supabase.from('fire_extinguishers').delete().eq('nucleus_id', nucleoId),
        supabase.from('hydrants').delete().eq('nucleus_id', nucleoId),
        supabase.from('documents').delete().eq('nucleus_id', nucleoId),
      ]);
      await supabase.from('nuclei').delete().eq('id', nucleoId);

      const { error } = await supabase.from('nucleos_central').delete().eq('id', nucleoId);
      if (error) throw error;

      toast({ title: 'Núcleo excluído', description: `"${nucleoName}" foi removido com sucesso.` });
      onOpenChange(false);
      onDeleted?.();
    } catch (err: any) {
      console.error('Erro ao excluir núcleo:', err);
      toast({
        title: 'Erro ao excluir núcleo',
        description: err?.message || 'Não foi possível concluir a exclusão.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir núcleo</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a excluir o núcleo <strong>{nucleoName}</strong>. Todos os extintores, hidrantes e
            documentos vinculados também serão removidos. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Excluindo...' : 'Excluir núcleo'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
