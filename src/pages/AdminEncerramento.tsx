import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Users2, ListChecks, ArrowLeft, Plus, Pencil, Trash2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// -------------------- Types --------------------
interface ConfigInstitucional {
  id: string;
  razao_social: string;
  cnpj: string | null;
  endereco: string | null;
  cidade: string;
}

interface DpgRow {
  id: string;
  nome: string;
  cpf: string | null;
  cargo: string;
  condicao: 'titular' | 'substituta' | 'em_exercicio';
  texto_cargo_documento: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  ativo: boolean;
  observacoes: string | null;
}

interface CatalogoRow {
  id: string;
  nome: string;
  texto_documento: string;
  ordem: number;
  ativo: boolean;
}

// -------------------- Page --------------------
export default function AdminEncerramento() {
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">Carregando…</div>
      </Layout>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
        </Button>
        <PageHeader
          title="Documentos de Encerramento — Configurações"
          subtitle="Cadastros usados na geração de TRP, TRD e ACT"
        />
        <Tabs defaultValue="institucional" className="space-y-4">
          <TabsList>
            <TabsTrigger value="institucional" className="gap-2">
              <Building2 className="h-4 w-4" /> Institucional
            </TabsTrigger>
            <TabsTrigger value="dpg" className="gap-2">
              <Users2 className="h-4 w-4" /> Gestão DPG
            </TabsTrigger>
            <TabsTrigger value="catalogo" className="gap-2">
              <ListChecks className="h-4 w-4" /> Sistemas e Serviços
            </TabsTrigger>
          </TabsList>

          <TabsContent value="institucional">
            <InstitucionalPanel />
          </TabsContent>
          <TabsContent value="dpg">
            <DpgPanel />
          </TabsContent>
          <TabsContent value="catalogo">
            <CatalogoPanel />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// -------------------- Institucional --------------------
function InstitucionalPanel() {
  const [row, setRow] = useState<ConfigInstitucional | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('config_institucional')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (data) setRow(data as ConfigInstitucional);
    })();
  }, []);

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase
      .from('config_institucional')
      .update({
        razao_social: row.razao_social,
        cnpj: row.cnpj,
        endereco: row.endereco,
        cidade: row.cidade,
      })
      .eq('id', row.id);
    setSaving(false);
    if (error) toast.error('Erro ao salvar: ' + error.message);
    else toast.success('Configuração institucional salva.');
  };

  if (!row) {
    return (
      <Card>
        <CardContent className="pt-6">Carregando cadastro…</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados institucionais</CardTitle>
        <CardDescription>
          Aparecem no cabeçalho dos documentos. O CNPJ é o mesmo para todas as unidades da Defensoria; o endereço específico da unidade é registrado por obra.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Razão social</Label>
            <Input
              value={row.razao_social}
              onChange={(e) => setRow({ ...row, razao_social: e.target.value })}
            />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input
              placeholder="00.000.000/0000-00"
              value={row.cnpj ?? ''}
              onChange={(e) => setRow({ ...row, cnpj: e.target.value })}
            />
          </div>
          <div>
            <Label>Cidade sede</Label>
            <Input
              value={row.cidade ?? ''}
              onChange={(e) => setRow({ ...row, cidade: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Endereço institucional (sede)</Label>
            <Textarea
              rows={2}
              value={row.endereco ?? ''}
              onChange={(e) => setRow({ ...row, endereco: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------- DPG --------------------
const DPG_EMPTY: Omit<DpgRow, 'id'> = {
  nome: '',
  cpf: '',
  cargo: 'Defensora Pública-Geral',
  condicao: 'titular',
  texto_cargo_documento: 'Defensora Pública-Geral do Estado de Mato Grosso',
  vigencia_inicio: format(new Date(), 'yyyy-MM-dd'),
  vigencia_fim: null,
  ativo: true,
  observacoes: null,
};

function DpgPanel() {
  const [rows, setRows] = useState<DpgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DpgRow | (Omit<DpgRow, 'id'> & { id?: string })>({ ...DPG_EMPTY });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dpg_gestao')
      .select('*')
      .order('vigencia_inicio', { ascending: false });
    setLoading(false);
    if (error) return toast.error('Erro: ' + error.message);
    setRows((data ?? []) as DpgRow[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setDraft({ ...DPG_EMPTY });
    setOpen(true);
  };
  const openEdit = (r: DpgRow) => {
    setDraft({ ...r });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.nome.trim() || !draft.texto_cargo_documento.trim() || !draft.vigencia_inicio) {
      toast.error('Preencha nome, texto do cargo e vigência inicial.');
      return;
    }
    setSaving(true);
    const payload = {
      nome: draft.nome.trim(),
      cpf: draft.cpf?.trim() || null,
      cargo: draft.cargo.trim(),
      condicao: draft.condicao,
      texto_cargo_documento: draft.texto_cargo_documento.trim(),
      vigencia_inicio: draft.vigencia_inicio,
      vigencia_fim: draft.vigencia_fim || null,
      ativo: draft.ativo,
      observacoes: draft.observacoes?.trim() || null,
    };
    const q = 'id' in draft && draft.id
      ? supabase.from('dpg_gestao').update(payload).eq('id', draft.id)
      : supabase.from('dpg_gestao').insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error('Erro ao salvar: ' + error.message);
    toast.success('Registro salvo.');
    setOpen(false);
    load();
  };

  const remove = async (r: DpgRow) => {
    if (!confirm(`Excluir registro de ${r.nome}?`)) return;
    const { error } = await supabase.from('dpg_gestao').delete().eq('id', r.id);
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Removido.');
    load();
  };

  const condicaoLabel = (c: DpgRow['condicao']) =>
    c === 'titular' ? 'Titular' : c === 'substituta' ? 'Substituta' : 'Em exercício';

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Gestão da Defensoria Pública-Geral</CardTitle>
          <CardDescription>
            Registre as vigências das gestoras. A que estiver ativa na data de emissão será usada nos documentos.
          </CardDescription>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma gestão cadastrada ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell><Badge variant="outline">{condicaoLabel(r.condicao)}</Badge></TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(r.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    {' → '}
                    {r.vigencia_fim
                      ? format(new Date(r.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                      : 'atual'}
                  </TableCell>
                  <TableCell>{r.ativo ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{'id' in draft && draft.id ? 'Editar gestão' : 'Nova gestão'}</DialogTitle>
            <DialogDescription>
              Dados usados no bloco de assinatura da DPG nos documentos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Nome completo</Label>
              <Input value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={draft.cpf ?? ''}
                onChange={(e) => setDraft({ ...draft, cpf: e.target.value })}
              />
            </div>
            <div>
              <Label>Cargo (rótulo curto)</Label>
              <Input value={draft.cargo} onChange={(e) => setDraft({ ...draft, cargo: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Texto do cargo (aparece no documento)</Label>
              <Input
                value={draft.texto_cargo_documento}
                onChange={(e) => setDraft({ ...draft, texto_cargo_documento: e.target.value })}
              />
            </div>
            <div>
              <Label>Condição</Label>
              <Select
                value={draft.condicao}
                onValueChange={(v) => setDraft({ ...draft, condicao: v as DpgRow['condicao'] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="titular">Titular</SelectItem>
                  <SelectItem value="substituta">Substituta</SelectItem>
                  <SelectItem value="em_exercicio">Em exercício</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label>Ativo</Label>
                <div className="h-10 flex items-center">
                  <Switch checked={draft.ativo} onCheckedChange={(v) => setDraft({ ...draft, ativo: v })} />
                </div>
              </div>
            </div>
            <div>
              <Label>Vigência início</Label>
              <Input
                type="date"
                value={draft.vigencia_inicio}
                onChange={(e) => setDraft({ ...draft, vigencia_inicio: e.target.value })}
              />
            </div>
            <div>
              <Label>Vigência fim (vazio = atual)</Label>
              <Input
                type="date"
                value={draft.vigencia_fim ?? ''}
                onChange={(e) => setDraft({ ...draft, vigencia_fim: e.target.value || null })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={draft.observacoes ?? ''}
                onChange={(e) => setDraft({ ...draft, observacoes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// -------------------- Catálogo --------------------
function CatalogoPanel() {
  const [rows, setRows] = useState<CatalogoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CatalogoRow | Omit<CatalogoRow, 'id'> & { id?: string }>({
    nome: '',
    texto_documento: '',
    ordem: 999,
    ativo: true,
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('catalogo_sistemas_servicos')
      .select('*')
      .order('ordem');
    setLoading(false);
    if (error) return toast.error('Erro: ' + error.message);
    setRows((data ?? []) as CatalogoRow[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setDraft({ nome: '', texto_documento: '', ordem: (rows.at(-1)?.ordem ?? 0) + 10, ativo: true });
    setOpen(true);
  };
  const openEdit = (r: CatalogoRow) => { setDraft({ ...r }); setOpen(true); };

  const save = async () => {
    if (!draft.nome.trim() || !draft.texto_documento.trim()) {
      toast.error('Preencha nome e texto para o documento.');
      return;
    }
    setSaving(true);
    const payload = {
      nome: draft.nome.trim(),
      texto_documento: draft.texto_documento.trim(),
      ordem: draft.ordem ?? 999,
      ativo: draft.ativo,
    };
    const q = 'id' in draft && draft.id
      ? supabase.from('catalogo_sistemas_servicos').update(payload).eq('id', draft.id)
      : supabase.from('catalogo_sistemas_servicos').insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error('Erro ao salvar: ' + error.message);
    toast.success('Item salvo.');
    setOpen(false);
    load();
  };

  const remove = async (r: CatalogoRow) => {
    if (!confirm(`Excluir "${r.nome}"?`)) return;
    const { error } = await supabase.from('catalogo_sistemas_servicos').delete().eq('id', r.id);
    if (error) return toast.error('Erro: ' + error.message);
    toast.success('Removido.');
    load();
  };

  const toggleAtivo = async (r: CatalogoRow) => {
    const { error } = await supabase
      .from('catalogo_sistemas_servicos')
      .update({ ativo: !r.ativo })
      .eq('id', r.id);
    if (error) return toast.error('Erro: ' + error.message);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Sistemas e serviços da edificação</CardTitle>
          <CardDescription>
            Itens exibidos no TRP/TRD para descrever o escopo executado. Podem ser selecionados por obra.
          </CardDescription>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo item</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Texto do documento</TableHead>
                <TableHead className="w-24">Ativo</TableHead>
                <TableHead className="text-right w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.ordem}</TableCell>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.texto_documento}</TableCell>
                  <TableCell>
                    <Switch checked={r.ativo} onCheckedChange={() => toggleAtivo(r)} />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{'id' in draft && draft.id ? 'Editar item' : 'Novo item'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Nome (uso interno)</Label>
              <Input value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} />
            </div>
            <div>
              <Label>Texto exibido no documento</Label>
              <Input
                value={draft.texto_documento}
                onChange={(e) => setDraft({ ...draft, texto_documento: e.target.value })}
              />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={draft.ordem ?? 0}
                  onChange={(e) => setDraft({ ...draft, ordem: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col justify-end">
                <Label className="mb-2">Ativo</Label>
                <Switch checked={draft.ativo} onCheckedChange={(v) => setDraft({ ...draft, ativo: v })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
