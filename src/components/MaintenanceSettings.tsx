import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MaintenanceType {
  id: string;
  nome: string;
  icone: string;
  ordem: number;
  ativo: boolean;
}

const ICON_OPTIONS: { value: string; label: string }[] = [
  { value: 'Wrench', label: 'Chave inglesa' },
  { value: 'Droplets', label: 'Gotas' },
  { value: 'Zap', label: 'Raio' },
  { value: 'Wind', label: 'Vento' },
  { value: 'Shield', label: 'Escudo' },
  { value: 'PaintRoller', label: 'Rolo de pintura' },
  { value: 'Hammer', label: 'Martelo' },
  { value: 'Cog', label: 'Engrenagem' },
  { value: 'Package', label: 'Caixa' },
  { value: 'AlertCircle', label: 'Alerta' },
  { value: 'Flame', label: 'Chama' },
  { value: 'Lightbulb', label: 'Lâmpada' },
];

const ICON_LABEL: Record<string, string> = Object.fromEntries(
  ICON_OPTIONS.map((i) => [i.value, i.label])
);

function TiposManutencao() {
  const [types, setTypes] = useState<MaintenanceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceType | null>(null);

  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState('Wrench');
  const [ordem, setOrdem] = useState(0);
  const [ativo, setAtivo] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('maintenance_types' as any)
      .select('*')
      .order('ordem', { ascending: true });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setTypes((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setNome('');
    setIcone('Wrench');
    setOrdem((types[types.length - 1]?.ordem ?? 0) + 1);
    setAtivo(true);
    setDialogOpen(true);
  };

  const openEdit = (t: MaintenanceType) => {
    setEditing(t);
    setNome(t.nome);
    setIcone(t.icone);
    setOrdem(t.ordem);
    setAtivo(t.ativo);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!nome.trim()) {
      toast({ title: 'Informe o nome', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = { nome: nome.trim(), icone, ordem, ativo };
    const { error } = editing
      ? await supabase.from('maintenance_types' as any).update(payload).eq('id', editing.id)
      : await supabase.from('maintenance_types' as any).insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Tipo atualizado' : 'Tipo cadastrado' });
    setDialogOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('maintenance_types' as any)
      .delete()
      .eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Tipo excluído' });
      load();
    }
    setDeleteTarget(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Tipos de Chamado</CardTitle>
          <CardDescription>
            Cadastre os tipos disponíveis para classificar os chamados de manutenção.
          </CardDescription>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Tipo
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : types.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum tipo cadastrado.
          </p>
        ) : (
          <div className="divide-y border rounded-md">
            {types.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-6 text-right">{t.ordem}</span>
                  <span className="font-medium">{t.nome}</span>
                  <Badge variant="outline" className="text-xs">{ICON_LABEL[t.icone] ?? t.icone}</Badge>
                  {!t.ativo && <Badge variant="secondary">Inativo</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(t)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Tipo' : 'Novo Tipo'}</DialogTitle>
            <DialogDescription>
              Defina o nome, ícone e ordem de exibição do tipo de chamado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Hidráulica"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icone">Ícone</Label>
              <select
                id="icone"
                value={icone}
                onChange={(e) => setIcone(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {ICON_OPTIONS.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ordem">Ordem</Label>
              <Input
                id="ordem"
                type="number"
                value={ordem}
                onChange={(e) => setOrdem(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
              <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tipo?</AlertDialogTitle>
            <AlertDialogDescription>
              O tipo "{deleteTarget?.nome}" será removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function GerentesManutencao() {
  const { managers, loading, refetch } = useMaintenanceManagers(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gerentes de Manutenção</CardTitle>
            <CardDescription>
              Lista automática dos usuários com perfil "Manutenção" no sistema. Para adicionar
              ou remover, altere o perfil do usuário em Configurações de Usuários.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={refetch}>Atualizar</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : managers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum usuário com perfil "Manutenção" cadastrado.
          </p>
        ) : (
          <div className="divide-y border rounded-md">
            {managers.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3">
                <div className="flex flex-col">
                  <span className="font-medium">{m.nome}</span>
                  {m.email && (
                    <span className="text-xs text-muted-foreground">{m.email}</span>
                  )}
                </div>
                <Badge variant="secondary">Manutenção</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MaintenanceSettings() {
  const [section, setSection] = useState<string>('chamados');
  const [subsection, setSubsection] = useState<string>('tipos');

  const menu = [
    {
      id: 'chamados',
      label: 'Chamados',
      items: [
        { id: 'tipos', label: 'Tipos', render: () => <TiposManutencao /> },
        { id: 'gerentes', label: 'Gerente de Manutenção', render: () => <GerentesManutencao /> },
      ],
    },
  ];

  const currentGroup = menu.find((m) => m.id === section) ?? menu[0];
  const currentItem =
    currentGroup.items.find((i) => i.id === subsection) ?? currentGroup.items[0];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie os cadastros auxiliares do módulo de Manutenção.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <nav className="space-y-4">
          {menu.map((group) => (
            <div key={group.id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-2">
                {group.label}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = section === group.id && subsection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSection(group.id);
                        setSubsection(item.id);
                      }}
                      className={
                        'text-left px-3 py-2 rounded-md text-sm transition-colors ' +
                        (active
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground')
                      }
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div>{currentItem.render()}</div>
      </div>
    </div>
  );
}
