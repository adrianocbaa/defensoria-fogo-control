import { useEffect, useState } from 'react';
import { Save, Copy, Trash2, FolderOpen, Sparkles, Plus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  ProjetoCalhas, listarProjetos, salvarProjeto, removerProjeto,
  duplicarProjeto, projetoExemplo,
} from '@/lib/projetoCalhasStorage';

interface Props {
  projetoAtual: Omit<ProjetoCalhas, 'atualizadoEm'>;
  onAbrir: (p: ProjetoCalhas) => void;
  onNovo: () => void;
}

export function ProjetosManager({ projetoAtual, onAbrir, onNovo }: Props) {
  const [open, setOpen] = useState(false);
  const [projetos, setProjetos] = useState<ProjetoCalhas[]>([]);
  const [nome, setNome] = useState(projetoAtual.nome);

  useEffect(() => {
    if (open) setProjetos(listarProjetos());
  }, [open]);
  useEffect(() => setNome(projetoAtual.nome), [projetoAtual.nome]);

  const handleSalvar = () => {
    if (!nome.trim()) {
      toast({ title: 'Informe um nome', variant: 'destructive' });
      return;
    }
    salvarProjeto({ ...projetoAtual, nome: nome.trim() });
    setProjetos(listarProjetos());
    toast({ title: 'Projeto salvo' });
  };

  const handleDuplicar = (id: string) => {
    const novo = duplicarProjeto(id);
    if (novo) {
      setProjetos(listarProjetos());
      toast({ title: 'Projeto duplicado' });
    }
  };

  const handleRemover = (id: string) => {
    removerProjeto(id);
    setProjetos(listarProjetos());
    toast({ title: 'Projeto removido' });
  };

  const handleExemplo = () => {
    onAbrir(projetoExemplo());
    setOpen(false);
    toast({ title: 'Projeto exemplo carregado' });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do projeto"
          className="h-9"
        />
        <Button type="button" size="sm" onClick={handleSalvar} className="gap-1.5">
          <Save className="h-4 w-4" /> Salvar
        </Button>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onNovo} className="gap-1.5">
        <Plus className="h-4 w-4" /> Novo
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={handleExemplo} className="gap-1.5">
        <Sparkles className="h-4 w-4" /> Exemplo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline" className="gap-1.5">
            <FolderOpen className="h-4 w-4" /> Projetos
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Projetos salvos</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {!projetos.length && (
              <div className="text-sm text-muted-foreground text-center py-8">
                Nenhum projeto salvo ainda.
              </div>
            )}
            {projetos.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{p.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.cadastro?.cidade ?? '—'}/{p.cadastro?.uf ?? '—'} ·{' '}
                    {p.calhas?.calhas.length ?? 0} calha(s) ·{' '}
                    {new Date(p.atualizadoEm).toLocaleString('pt-BR')}
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {p.panos?.panos.length ?? 0} panos
                </Badge>
                <Button size="sm" variant="outline" onClick={() => { onAbrir(p); setOpen(false); }}>
                  Abrir
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDuplicar(p.id)} title="Duplicar">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleRemover(p.id)} title="Remover">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
