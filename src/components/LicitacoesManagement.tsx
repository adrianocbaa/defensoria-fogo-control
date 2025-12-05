import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, ChevronDown, FileText, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEmpresas } from '@/hooks/useEmpresas';

interface Ata {
  id: string;
  numero_ata: string;
  pregao_eletronico: string | null;
  protocolo: string | null;
  created_at: string;
  polos?: AtaPolo[];
}

interface AtaPolo {
  id: string;
  ata_id: string;
  empresa_id: string | null;
  polo: string;
  regiao: string | null;
  valor: number;
  desconto: number;
  empresa?: { razao_social: string } | null;
}

interface ContratoLicitacao {
  id: string;
  numero_contrato: string;
  pregao_eletronico: string | null;
  protocolo: string | null;
  empresa_id: string | null;
  valor: number;
  desconto: number;
  created_at: string;
  empresa?: { razao_social: string } | null;
}

export function LicitacoesManagement() {
  const { toast } = useToast();
  const { empresas } = useEmpresas();
  const [atas, setAtas] = useState<Ata[]>([]);
  const [contratos, setContratos] = useState<ContratoLicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedAtas, setExpandedAtas] = useState<Set<string>>(new Set());
  
  // ATA Dialog State
  const [ataDialog, setAtaDialog] = useState(false);
  const [editingAta, setEditingAta] = useState<Ata | null>(null);
  const [ataForm, setAtaForm] = useState({
    numero_ata: '',
    pregao_eletronico: '',
    protocolo: '',
  });
  
  // Polo Dialog State
  const [poloDialog, setPoloDialog] = useState(false);
  const [editingPolo, setEditingPolo] = useState<AtaPolo | null>(null);
  const [currentAtaId, setCurrentAtaId] = useState<string | null>(null);
  const [poloForm, setPoloForm] = useState({
    polo: '',
    regiao: '',
    empresa_id: '',
    valor: '',
    desconto: '',
  });
  
  // CL Dialog State
  const [clDialog, setClDialog] = useState(false);
  const [editingCl, setEditingCl] = useState<ContratoLicitacao | null>(null);
  const [clForm, setClForm] = useState({
    numero_contrato: '',
    pregao_eletronico: '',
    protocolo: '',
    empresa_id: '',
    valor: '',
    desconto: '',
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load ATAs with polos
      const { data: atasData, error: atasError } = await supabase
        .from('atas')
        .select('*')
        .order('created_at', { ascending: false });

      if (atasError) throw atasError;

      // Load polos for each ATA
      const atasWithPolos = await Promise.all(
        (atasData || []).map(async (ata) => {
          const { data: polos } = await supabase
            .from('ata_polos')
            .select('*, empresa:empresas(razao_social)')
            .eq('ata_id', ata.id)
            .order('polo');
          return { ...ata, polos: polos || [] };
        })
      );

      setAtas(atasWithPolos);

      // Load Contratos
      const { data: contratosData, error: contratosError } = await supabase
        .from('contratos_licitacao')
        .select('*, empresa:empresas(razao_social)')
        .order('created_at', { ascending: false });

      if (contratosError) throw contratosError;
      setContratos(contratosData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ATA Functions
  const openAtaDialog = (ata?: Ata) => {
    if (ata) {
      setEditingAta(ata);
      setAtaForm({
        numero_ata: ata.numero_ata,
        pregao_eletronico: ata.pregao_eletronico || '',
        protocolo: ata.protocolo || '',
      });
    } else {
      setEditingAta(null);
      setAtaForm({ numero_ata: '', pregao_eletronico: '', protocolo: '' });
    }
    setAtaDialog(true);
  };

  const saveAta = async () => {
    if (!ataForm.numero_ata.trim()) {
      toast({ title: 'Erro', description: 'Número da ATA é obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editingAta) {
        const { error } = await supabase
          .from('atas')
          .update({
            numero_ata: ataForm.numero_ata,
            pregao_eletronico: ataForm.pregao_eletronico || null,
            protocolo: ataForm.protocolo || null,
          })
          .eq('id', editingAta.id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'ATA atualizada' });
      } else {
        const { error } = await supabase.from('atas').insert({
          numero_ata: ataForm.numero_ata,
          pregao_eletronico: ataForm.pregao_eletronico || null,
          protocolo: ataForm.protocolo || null,
        });
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'ATA criada' });
      }
      setAtaDialog(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteAta = async (id: string) => {
    try {
      const { error } = await supabase.from('atas').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'ATA excluída' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  // Polo Functions
  const openPoloDialog = (ataId: string, polo?: AtaPolo) => {
    setCurrentAtaId(ataId);
    if (polo) {
      setEditingPolo(polo);
      setPoloForm({
        polo: polo.polo,
        regiao: polo.regiao || '',
        empresa_id: polo.empresa_id || '',
        valor: polo.valor.toString(),
        desconto: polo.desconto.toString(),
      });
    } else {
      setEditingPolo(null);
      setPoloForm({ polo: '', regiao: '', empresa_id: '', valor: '', desconto: '0' });
    }
    setPoloDialog(true);
  };

  const savePolo = async () => {
    if (!poloForm.polo.trim() || !currentAtaId) {
      toast({ title: 'Erro', description: 'Região é obrigatória', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const poloData = {
        ata_id: currentAtaId,
        polo: poloForm.polo,
        regiao: poloForm.regiao || null,
        empresa_id: poloForm.empresa_id || null,
        valor: parseFloat(poloForm.valor) || 0,
        desconto: parseFloat(poloForm.desconto) || 0,
      };

      if (editingPolo) {
        const { error } = await supabase
          .from('ata_polos')
          .update(poloData)
          .eq('id', editingPolo.id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Região atualizada' });
      } else {
        const { error } = await supabase.from('ata_polos').insert(poloData);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Região adicionada' });
      }
      setPoloDialog(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deletePolo = async (id: string) => {
    try {
      const { error } = await supabase.from('ata_polos').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Região excluída' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  // CL Functions
  const openClDialog = (cl?: ContratoLicitacao) => {
    if (cl) {
      setEditingCl(cl);
      setClForm({
        numero_contrato: cl.numero_contrato,
        pregao_eletronico: cl.pregao_eletronico || '',
        protocolo: cl.protocolo || '',
        empresa_id: cl.empresa_id || '',
        valor: cl.valor.toString(),
        desconto: cl.desconto.toString(),
      });
    } else {
      setEditingCl(null);
      setClForm({ numero_contrato: '', pregao_eletronico: '', protocolo: '', empresa_id: '', valor: '', desconto: '0' });
    }
    setClDialog(true);
  };

  const saveCl = async () => {
    if (!clForm.numero_contrato.trim()) {
      toast({ title: 'Erro', description: 'Número do contrato é obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const clData = {
        numero_contrato: clForm.numero_contrato,
        pregao_eletronico: clForm.pregao_eletronico || null,
        protocolo: clForm.protocolo || null,
        empresa_id: clForm.empresa_id || null,
        valor: parseFloat(clForm.valor) || 0,
        desconto: parseFloat(clForm.desconto) || 0,
      };

      if (editingCl) {
        const { error } = await supabase
          .from('contratos_licitacao')
          .update(clData)
          .eq('id', editingCl.id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Contrato atualizado' });
      } else {
        const { error } = await supabase.from('contratos_licitacao').insert(clData);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Contrato criado' });
      }
      setClDialog(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCl = async (id: string) => {
    try {
      const { error } = await supabase.from('contratos_licitacao').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Contrato excluído' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const toggleAtaExpanded = (ataId: string) => {
    setExpandedAtas(prev => {
      const next = new Set(prev);
      if (next.has(ataId)) next.delete(ataId);
      else next.add(ataId);
      return next;
    });
  };

  const filteredAtas = atas.filter(a => 
    a.numero_ata.toLowerCase().includes(search.toLowerCase()) ||
    a.pregao_eletronico?.toLowerCase().includes(search.toLowerCase()) ||
    a.protocolo?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredContratos = contratos.filter(c => 
    c.numero_contrato.toLowerCase().includes(search.toLowerCase()) ||
    c.pregao_eletronico?.toLowerCase().includes(search.toLowerCase()) ||
    c.protocolo?.toLowerCase().includes(search.toLowerCase()) ||
    c.empresa?.razao_social?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>ATAs e Contratos de Licitação</CardTitle>
        <CardDescription>
          Gerencie Atas de Registro de Preços e Contratos de Licitação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs defaultValue="atas">
          <TabsList>
            <TabsTrigger value="atas" className="gap-2">
              <FileText className="h-4 w-4" />
              ATAs ({atas.length})
            </TabsTrigger>
            <TabsTrigger value="contratos" className="gap-2">
              <Building2 className="h-4 w-4" />
              Contratos ({contratos.length})
            </TabsTrigger>
          </TabsList>

          {/* ATAs Tab */}
          <TabsContent value="atas" className="space-y-4">
            <Button onClick={() => openAtaDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova ATA
            </Button>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredAtas.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma ATA cadastrada</p>
            ) : (
              <div className="space-y-2">
                {filteredAtas.map((ata) => (
                  <Collapsible
                    key={ata.id}
                    open={expandedAtas.has(ata.id)}
                    onOpenChange={() => toggleAtaExpanded(ata.id)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedAtas.has(ata.id) ? 'rotate-180' : ''}`} />
                            <div className="text-left">
                              <p className="font-medium">ATA Nº {ata.numero_ata}</p>
                              <p className="text-sm text-muted-foreground">
                                {ata.pregao_eletronico && `Pregão: ${ata.pregao_eletronico}`}
                                {ata.pregao_eletronico && ata.protocolo && ' | '}
                                {ata.protocolo && `Protocolo: ${ata.protocolo}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{ata.polos?.length || 0} região(ões)</Badge>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Regiões</h4>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openPoloDialog(ata.id)} className="gap-1">
                                <Plus className="h-3 w-3" />
                                Adicionar Região
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openAtaDialog(ata)} className="gap-1">
                                <Pencil className="h-3 w-3" />
                                Editar ATA
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive" className="gap-1">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir ATA?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação excluirá a ATA e todas as suas regiões. Não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteAta(ata.id)}>Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          {ata.polos && ata.polos.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[60px]">Seq.</TableHead>
                                  <TableHead>Região</TableHead>
                                  <TableHead>Fornecedor</TableHead>
                                  <TableHead className="text-right">Valor</TableHead>
                                  <TableHead className="text-right">Desconto</TableHead>
                                  <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {ata.polos.map((polo, index) => (
                                  <TableRow key={polo.id}>
                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell className="font-medium">{polo.polo}</TableCell>
                                    <TableCell>{polo.empresa?.razao_social || '-'}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(polo.valor)}</TableCell>
                                    <TableCell className="text-right">{polo.desconto}%</TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => openPoloDialog(ata.id, polo)}>
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button size="icon" variant="ghost">
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Excluir região?</AlertDialogTitle>
                                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => deletePolo(polo.id)}>Excluir</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-muted-foreground text-sm">Nenhuma região cadastrada</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Contratos Tab */}
          <TabsContent value="contratos" className="space-y-4">
            <Button onClick={() => openClDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Contrato
            </Button>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredContratos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum contrato cadastrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato Nº</TableHead>
                    <TableHead>Pregão</TableHead>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContratos.map((cl) => (
                    <TableRow key={cl.id}>
                      <TableCell className="font-medium">{cl.numero_contrato}</TableCell>
                      <TableCell>{cl.pregao_eletronico || '-'}</TableCell>
                      <TableCell>{cl.protocolo || '-'}</TableCell>
                      <TableCell>{cl.empresa?.razao_social || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cl.valor)}</TableCell>
                      <TableCell className="text-right">{cl.desconto}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openClDialog(cl)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteCl(cl.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>

        {/* ATA Dialog */}
        <Dialog open={ataDialog} onOpenChange={setAtaDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAta ? 'Editar ATA' : 'Nova ATA'}</DialogTitle>
              <DialogDescription>Ata de Registro de Preços</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ATA de Registro de Preços Nº *</Label>
                <Input
                  value={ataForm.numero_ata}
                  onChange={(e) => setAtaForm({ ...ataForm, numero_ata: e.target.value })}
                  placeholder="Ex: 001/2024"
                />
              </div>
              <div className="space-y-2">
                <Label>Pregão Eletrônico Nº</Label>
                <Input
                  value={ataForm.pregao_eletronico}
                  onChange={(e) => setAtaForm({ ...ataForm, pregao_eletronico: e.target.value })}
                  placeholder="Ex: 002/2024"
                />
              </div>
              <div className="space-y-2">
                <Label>Protocolo Nº</Label>
                <Input
                  value={ataForm.protocolo}
                  onChange={(e) => setAtaForm({ ...ataForm, protocolo: e.target.value })}
                  placeholder="Ex: 123456/2024"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAtaDialog(false)}>Cancelar</Button>
              <Button onClick={saveAta} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Região Dialog */}
        <Dialog open={poloDialog} onOpenChange={setPoloDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPolo ? 'Editar Região' : 'Adicionar Região'}</DialogTitle>
              <DialogDescription>Região/Lote da ATA</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Região *</Label>
                <Input
                  value={poloForm.polo}
                  onChange={(e) => setPoloForm({ ...poloForm, polo: e.target.value })}
                  placeholder="Ex: Norte, Sul, Centro"
                />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select value={poloForm.empresa_id} onValueChange={(v) => setPoloForm({ ...poloForm, empresa_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    value={poloForm.valor}
                    onChange={(e) => setPoloForm({ ...poloForm, valor: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <Input
                    type="number"
                    value={poloForm.desconto}
                    onChange={(e) => setPoloForm({ ...poloForm, desconto: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPoloDialog(false)}>Cancelar</Button>
              <Button onClick={savePolo} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CL Dialog */}
        <Dialog open={clDialog} onOpenChange={setClDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCl ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
              <DialogDescription>Contrato de Licitação</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Contrato Nº *</Label>
                <Input
                  value={clForm.numero_contrato}
                  onChange={(e) => setClForm({ ...clForm, numero_contrato: e.target.value })}
                  placeholder="Ex: 001/2024"
                />
              </div>
              <div className="space-y-2">
                <Label>Pregão Eletrônico Nº</Label>
                <Input
                  value={clForm.pregao_eletronico}
                  onChange={(e) => setClForm({ ...clForm, pregao_eletronico: e.target.value })}
                  placeholder="Ex: 002/2024"
                />
              </div>
              <div className="space-y-2">
                <Label>Protocolo Nº</Label>
                <Input
                  value={clForm.protocolo}
                  onChange={(e) => setClForm({ ...clForm, protocolo: e.target.value })}
                  placeholder="Ex: 123456/2024"
                />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select value={clForm.empresa_id} onValueChange={(v) => setClForm({ ...clForm, empresa_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    value={clForm.valor}
                    onChange={(e) => setClForm({ ...clForm, valor: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <Input
                    type="number"
                    value={clForm.desconto}
                    onChange={(e) => setClForm({ ...clForm, desconto: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setClDialog(false)}>Cancelar</Button>
              <Button onClick={saveCl} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
