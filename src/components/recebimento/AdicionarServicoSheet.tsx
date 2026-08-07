import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface ServicoBiblioteca {
  id: string;
  macro: string;
  servico: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  obraId: string;
  ambienteNome: string;
  maisUsados: { macro: string; servico: string }[];
  onAdicionar: (ids: string[]) => Promise<void> | void;
  onAdicionarPersonalizado: (macro: string, servico: string, verificacoes: string[]) => Promise<void> | void;
}

const RECENTES_KEY = 'recebimento:servicos-recentes';

export function AdicionarServicoSheet({
  open,
  onOpenChange,
  obraId,
  ambienteNome,
  maisUsados,
  onAdicionar,
  onAdicionarPersonalizado,
}: Props) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [busca, setBusca] = useState('');
  const [itens, setItens] = useState<ServicoBiblioteca[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [modoCustom, setModoCustom] = useState(false);
  const [cMacro, setCMacro] = useState('');
  const [cServico, setCServico] = useState('');
  const [cVerifs, setCVerifs] = useState('');
  const [salvarNaBiblioteca, setSalvarNaBiblioteca] = useState(false);

  const [recentes, setRecentes] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENTES_KEY) ?? '[]');
    } catch {
      return [];
    }
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('biblioteca_servicos')
      .select('id, macro, servico')
      .eq('ativo', true)
      .or(`escopo.eq.global,obra_id.eq.${obraId}`)
      .order('ordem')
      .limit(500);

    const termo = busca.trim();
    if (termo) {
      query = query.or(`macro.ilike.%${termo}%,servico.ilike.%${termo}%`);
    }
    const { data, error } = await query;
    if (error) console.error(error);
    setItens((data ?? []) as ServicoBiblioteca[]);
    setLoading(false);
  }, [busca, obraId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [open, carregar]);

  const porMacro = useMemo(() => {
    const map = new Map<string, ServicoBiblioteca[]>();
    for (const i of itens) {
      const list = map.get(i.macro) ?? [];
      list.push(i);
      map.set(i.macro, list);
    }
    return [...map.entries()];
  }, [itens]);

  const sugeridos = useMemo(() => {
    if (busca.trim()) return [];
    const chaveMais = new Set(maisUsados.map((m) => `${m.macro}|${m.servico}`));
    const destaque = itens.filter(
      (i) => chaveMais.has(`${i.macro}|${i.servico}`) || recentes.includes(i.id),
    );
    return destaque.slice(0, 10);
  }, [busca, itens, maisUsados, recentes]);

  const toggle = (id: string) =>
    setSelecionados((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const confirmar = async () => {
    if (!selecionados.length) return;
    setSaving(true);
    await onAdicionar(selecionados);
    const novosRecentes = [...selecionados, ...recentes].slice(0, 12);
    setRecentes(novosRecentes);
    localStorage.setItem(RECENTES_KEY, JSON.stringify(novosRecentes));
    setSelecionados([]);
    setSaving(false);
    onOpenChange(false);
  };

  const confirmarCustom = async () => {
    if (!cMacro.trim() || !cServico.trim()) return;
    const verifs = cVerifs
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean);
    if (!verifs.length) {
      toast.error('Informe ao menos uma verificação');
      return;
    }
    setSaving(true);

    if (salvarNaBiblioteca) {
      const { data, error } = await supabase
        .from('biblioteca_servicos')
        .insert({
          macro: cMacro.trim(),
          servico: cServico.trim(),
          escopo: isAdmin ? 'global' : 'obra',
          obra_id: isAdmin ? null : obraId,
          created_by: user?.id ?? null,
          keywords: [cMacro.trim().toLowerCase(), cServico.trim().toLowerCase()],
        })
        .select()
        .single();
      if (error || !data) {
        toast.error('Erro ao salvar na biblioteca');
      } else {
        await supabase.from('biblioteca_verificacoes').insert(
          verifs.map((d, i) => ({ servico_id: data.id, descricao: d, ordem: i + 1 })),
        );
      }
    }

    await onAdicionarPersonalizado(cMacro.trim(), cServico.trim(), verifs);
    setCMacro('');
    setCServico('');
    setCVerifs('');
    setSalvarNaBiblioteca(false);
    setModoCustom(false);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[92vh] flex-col p-0 sm:max-w-2xl sm:mx-auto">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">Adicionar serviço — {ambienteNome}</SheetTitle>
        </SheetHeader>

        {modoCustom ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div>
              <Label htmlFor="c-macro">Macro *</Label>
              <Input
                id="c-macro"
                className="mt-1 h-11"
                placeholder="Ex.: Esquadrias"
                value={cMacro}
                onChange={(e) => setCMacro(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="c-serv">Serviço / componente *</Label>
              <Input
                id="c-serv"
                className="mt-1 h-11"
                placeholder="Ex.: Porta corta-fogo"
                value={cServico}
                onChange={(e) => setCServico(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="c-verifs">Verificações (uma por linha) *</Label>
              <Textarea
                id="c-verifs"
                className="mt-1 min-h-32"
                placeholder={'Folha\nBatente\nFechadura'}
                value={cVerifs}
                onChange={(e) => setCVerifs(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-2 rounded-md border p-3">
              <Checkbox
                checked={salvarNaBiblioteca}
                onCheckedChange={(c) => setSalvarNaBiblioteca(!!c)}
                className="mt-0.5"
              />
              <span className="text-sm">
                Salvar também na biblioteca
                <span className="block text-xs text-muted-foreground">
                  {isAdmin
                    ? 'Ficará disponível globalmente para futuras obras.'
                    : 'Ficará disponível apenas nesta obra.'}
                </span>
              </span>
            </label>

            <div className="flex gap-2 pb-4">
              <Button variant="outline" className="h-11 flex-1" onClick={() => setModoCustom(false)}>
                Voltar
              </Button>
              <Button className="h-11 flex-1" onClick={confirmarCustom} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-11 pl-9"
                  placeholder="Buscar serviço (ex.: porta, pintura...)"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loading && sugeridos.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> Mais utilizados e recentes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sugeridos.map((s) => (
                      <button
                        key={`sug-${s.id}`}
                        type="button"
                        onClick={() => toggle(s.id)}
                        className={cn(
                          'rounded-full border px-3 py-2 text-xs',
                          selecionados.includes(s.id)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-muted',
                        )}
                      >
                        {s.servico}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!loading &&
                porMacro.map(([macro, lista]) => (
                  <div key={macro} className="mb-4">
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                      {macro}
                    </p>
                    <div className="space-y-1">
                      {lista.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggle(s.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md border p-3 text-left text-sm',
                            selecionados.includes(s.id)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50',
                          )}
                        >
                          <Checkbox checked={selecionados.includes(s.id)} className="pointer-events-none" />
                          <span>{s.servico}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

              {!loading && itens.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum serviço encontrado na biblioteca.
                </p>
              )}
            </div>

            <div className="space-y-2 border-t bg-background px-4 py-3">
              <Button
                variant="outline"
                className="h-11 w-full"
                onClick={() => setModoCustom(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Criar item personalizado
              </Button>
              <Button className="h-12 w-full" onClick={confirmar} disabled={!selecionados.length || saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar {selecionados.length > 0 && <Badge className="ml-2">{selecionados.length}</Badge>}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
