import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Library, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';

import {
  bibliotecaCalhaSchema,
  type CalhaBiblioteca,
} from './bibliotecaCalhaSchema';
import { MATERIAIS_CALHA, TIPOS_CALHA } from './calhaSchema';
import {
  listarBiblioteca,
  removerItemBiblioteca,
  restaurarBibliotecaPadrao,
  salvarItemBiblioteca,
} from '@/lib/bibliotecaCalhasStorage';

interface Props {
  trigger?: React.ReactNode;
}

const NOVO: CalhaBiblioteca = {
  id: '',
  nome: '',
  tipo: 'semicircular',
  material: 'PVC',
  manning_n: 0.011,
  diametro_m: 0.1,
  observacoes: '',
};

export function BibliotecaCalhasManager({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [itens, setItens] = useState<CalhaBiblioteca[]>([]);
  const [editing, setEditing] = useState<CalhaBiblioteca | null>(null);

  const form = useForm<CalhaBiblioteca>({
    resolver: zodResolver(bibliotecaCalhaSchema),
    defaultValues: NOVO,
  });

  const tipo = form.watch('tipo');

  useEffect(() => {
    if (open) setItens(listarBiblioteca());
  }, [open]);

  const novo = () => {
    setEditing(null);
    form.reset({ ...NOVO, id: crypto.randomUUID() });
  };

  const editar = (it: CalhaBiblioteca) => {
    setEditing(it);
    form.reset(it);
  };

  const submit = (values: CalhaBiblioteca) => {
    salvarItemBiblioteca(values);
    setItens(listarBiblioteca());
    toast({ title: editing ? 'Item atualizado' : 'Item adicionado' });
    novo();
  };

  const excluir = (id: string) => {
    if (!confirm('Excluir este item da biblioteca?')) return;
    removerItemBiblioteca(id);
    setItens(listarBiblioteca());
  };

  const restaurar = () => {
    if (!confirm('Restaurar a biblioteca padrão? Itens personalizados serão removidos.')) return;
    setItens(restaurarBibliotecaPadrao());
    toast({ title: 'Biblioteca restaurada' });
  };

  const dim = (c: CalhaBiblioteca) => {
    if (c.tipo === 'semicircular' && c.diametro_m) return `Ø ${(c.diametro_m * 1000).toFixed(0)} mm`;
    if (c.tipo === 'retangular' && c.largura_m && c.altura_m)
      return `${(c.largura_m * 1000).toFixed(0)} × ${(c.altura_m * 1000).toFixed(0)} mm`;
    if (c.tipo === 'trapezoidal')
      return `${((c.base_menor_m ?? 0) * 1000).toFixed(0)}/${((c.base_maior_m ?? 0) * 1000).toFixed(0)} × ${((c.altura_m ?? 0) * 1000).toFixed(0)} mm`;
    return '—';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Library className="h-4 w-4" />
            Biblioteca de calhas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            Biblioteca de calhas comerciais
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Lista */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Itens cadastrados ({itens.length})</div>
              <Button variant="outline" size="sm" className="gap-1" onClick={restaurar}>
                <RotateCcw className="h-3.5 w-3.5" />
                Padrão
              </Button>
            </div>
            <div className="rounded border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Dimensão</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((it) => (
                    <TableRow
                      key={it.id}
                      className={editing?.id === it.id ? 'bg-accent' : ''}
                    >
                      <TableCell className="text-xs">{it.nome}</TableCell>
                      <TableCell className="text-xs">{it.tipo}</TableCell>
                      <TableCell className="text-xs">{dim(it)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => editar(it)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => excluir(it.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {itens.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">
                        Nenhum item cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {editing ? 'Editar item' : 'Novo item'}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={novo} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Novo
                </Button>
              </div>

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Semicircular PVC Ø150" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPOS_CALHA.filter((t) => t !== 'personalizada').map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="material"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          const m = MATERIAIS_CALHA.find((x) => x.nome === v);
                          if (m) form.setValue('manning_n', m.n);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MATERIAIS_CALHA.map((m) => (
                            <SelectItem key={m.nome} value={m.nome}>{m.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="manning_n"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coeficiente de Manning (n)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {tipo === 'semicircular' && (
                <FormField
                  control={form.control}
                  name="diametro_m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diâmetro (m)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {tipo === 'retangular' && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="largura_m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Largura (m)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="altura_m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Altura (m)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {tipo === 'trapezoidal' && (
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="base_menor_m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base menor (m)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="base_maior_m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base maior (m)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="altura_m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Altura (m)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" className="w-full">
                  {editing ? 'Salvar alterações' : 'Adicionar à biblioteca'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
