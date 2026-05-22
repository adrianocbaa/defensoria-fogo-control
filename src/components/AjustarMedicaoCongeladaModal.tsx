import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicaoSessionId: string | null;
  obraId: string;
  medicaoNome: string;
  onSaved?: () => void;
}

interface Row {
  id: string;
  item_code: string;
  descricao: string;
  // valores atuais (congelados)
  qtd_atual: number;
  pct_atual: number;
  total_atual: number;
  // valores editados (strings p/ preservar precisão durante digitação)
  qtd_novo: string;
  pct_novo: string;
  total_novo: string;
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const parseNum = (s: string): number => {
  if (!s) return 0;
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

const numToStr = (n: number, decimals = 2): string =>
  Number(n ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export function AjustarMedicaoCongeladaModal({
  open,
  onOpenChange,
  medicaoSessionId,
  obraId,
  medicaoNome,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [motivo, setMotivo] = useState('');
  const [busca, setBusca] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open || !medicaoSessionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [{ data: itens, error: e1 }, { data: orc, error: e2 }] = await Promise.all([
          supabase
            .from('medicao_items')
            .select('id, item_code, qtd, pct, total, qtd_congelado, pct_congelado, total_congelado')
            .eq('medicao_id', medicaoSessionId)
            .limit(10000),
          supabase
            .from('orcamento_items')
            .select('item, descricao')
            .eq('obra_id', obraId)
            .limit(10000),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;

        const descMap = new Map<string, string>();
        (orc || []).forEach((o: any) => {
          if (o.item) descMap.set(String(o.item).trim(), o.descricao || '');
        });

        const mapped: Row[] = (itens || []).map((it: any) => {
          const qtd = it.qtd_congelado ?? it.qtd ?? 0;
          const pct = it.pct_congelado ?? it.pct ?? 0;
          const total = it.total_congelado ?? it.total ?? 0;
          return {
            id: it.id,
            item_code: String(it.item_code || '').trim(),
            descricao: descMap.get(String(it.item_code || '').trim()) || '',
            qtd_atual: Number(qtd),
            pct_atual: Number(pct),
            total_atual: Number(total),
            qtd_novo: numToStr(Number(qtd), 4),
            pct_novo: numToStr(Number(pct), 2),
            total_novo: numToStr(Number(total), 2),
          };
        });

        mapped.sort((a, b) =>
          a.item_code.localeCompare(b.item_code, 'pt-BR', { numeric: true })
        );

        if (!cancelled) setRows(mapped);
      } catch (err: any) {
        toast.error('Erro ao carregar itens: ' + (err.message || err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, medicaoSessionId, obraId]);

  useEffect(() => {
    if (!open) {
      setRows([]);
      setMotivo('');
      setBusca('');
    }
  }, [open]);

  const update = (id: string, field: 'qtd_novo' | 'pct_novo' | 'total_novo', value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const alterados = useMemo(() => {
    return rows.filter((r) => {
      const qn = parseNum(r.qtd_novo);
      const pn = parseNum(r.pct_novo);
      const tn = parseNum(r.total_novo);
      return (
        Math.abs(qn - r.qtd_atual) > 1e-6 ||
        Math.abs(pn - r.pct_atual) > 1e-6 ||
        Math.abs(tn - r.total_atual) > 0.005
      );
    });
  }, [rows]);

  const totalAtual = useMemo(
    () => rows.reduce((s, r) => s + (r.total_atual || 0), 0),
    [rows]
  );
  const totalNovo = useMemo(
    () => rows.reduce((s, r) => s + parseNum(r.total_novo), 0),
    [rows]
  );
  const delta = totalNovo - totalAtual;

  const rowsFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let base = rows;
    if (!mostrarTodos) {
      base = base.filter(
        (r) =>
          Math.abs(r.qtd_atual) > 1e-6 ||
          Math.abs(r.pct_atual) > 1e-6 ||
          Math.abs(r.total_atual) > 0.005,
      );
    }
    if (!q) return base;
    return base.filter(
      (r) =>
        r.item_code.toLowerCase().includes(q) ||
        r.descricao.toLowerCase().includes(q)
    );
  }, [rows, busca, mostrarTodos]);

  const itensComValor = useMemo(
    () =>
      rows.filter(
        (r) =>
          Math.abs(r.qtd_atual) > 1e-6 ||
          Math.abs(r.pct_atual) > 1e-6 ||
          Math.abs(r.total_atual) > 0.005,
      ).length,
    [rows],
  );

  const handleSalvar = async () => {
    if (alterados.length === 0) {
      toast.error('Nenhum item foi alterado.');
      return;
    }
    if (motivo.trim().length < 3) {
      toast.error('Informe um motivo (mínimo 3 caracteres).');
      return;
    }
    setSaving(true);
    try {
      const ajustes = alterados.map((r) => ({
        id: r.id,
        qtd: parseNum(r.qtd_novo),
        pct: parseNum(r.pct_novo),
        total: parseNum(r.total_novo),
      }));

      // Chunk para evitar timeout da conexão em lotes grandes
      const CHUNK = 25;
      let totalAjustados = 0;
      for (let i = 0; i < ajustes.length; i += CHUNK) {
        const lote = ajustes.slice(i, i + CHUNK);
        const { data, error } = await supabase.rpc('ajustar_medicao_congelada_lote', {
          p_ajustes: lote as any,
          p_motivo: motivo.trim(),
        });
        console.log(`[ajustar_medicao] lote ${Math.floor(i / CHUNK) + 1}:`, { count: lote.length, data, error });
        if (error) throw error;
        totalAjustados += Number(data ?? lote.length);
      }

      setConfirmOpen(false);
      onOpenChange(false);
      toast.success(`${totalAjustados} itens ajustados com sucesso.`);
      try {
        onSaved?.();
      } catch (e) {
        console.error('[ajustar_medicao] onSaved falhou:', e);
      }
    } catch (err: any) {
      console.error('[ajustar_medicao_congelada_lote] erro:', err);
      toast.error('Erro ao salvar ajustes: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Ajustar valores congelados — {medicaoNome}
            </DialogTitle>
            <DialogDescription>
              Use somente para igualar os valores do sistema ao PDF impresso/pago.
              Toda alteração é registrada em auditoria.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 py-2 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="mostrar-todos"
                checked={mostrarTodos}
                onCheckedChange={setMostrarTodos}
              />
              <Label htmlFor="mostrar-todos" className="text-xs cursor-pointer">
                Mostrar todos os itens do contrato
              </Label>
            </div>
            <Badge variant="outline" className="text-xs">
              {mostrarTodos
                ? `${rows.length} itens (todos)`
                : `${itensComValor} itens nesta medição`}
            </Badge>
            {alterados.length > 0 && (
              <Badge variant="secondary">
                {alterados.length} alterado(s)
              </Badge>
            )}
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 w-24">Item</th>
                    <th className="text-left p-2">Descrição</th>
                    <th className="text-right p-2 w-28">Qtd atual</th>
                    <th className="text-right p-2 w-28">Qtd nova</th>
                    <th className="text-right p-2 w-24">% atual</th>
                    <th className="text-right p-2 w-24">% novo</th>
                    <th className="text-right p-2 w-32">Total atual</th>
                    <th className="text-right p-2 w-32">Total novo</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsFiltrados.map((r) => {
                    const isAlt = alterados.some((a) => a.id === r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`border-t ${isAlt ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                      >
                        <td className="p-2 font-mono text-xs">{r.item_code}</td>
                        <td className="p-2 text-xs">{r.descricao}</td>
                        <td className="p-2 text-right text-muted-foreground">
                          {numToStr(r.qtd_atual, 4)}
                        </td>
                        <td className="p-1">
                          <Input
                            value={r.qtd_novo}
                            onChange={(e) => update(r.id, 'qtd_novo', e.target.value)}
                            className="h-7 text-right text-xs"
                          />
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          {numToStr(r.pct_atual, 2)}
                        </td>
                        <td className="p-1">
                          <Input
                            value={r.pct_novo}
                            onChange={(e) => update(r.id, 'pct_novo', e.target.value)}
                            className="h-7 text-right text-xs"
                          />
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          {formatCurrency(r.total_atual)}
                        </td>
                        <td className="p-1">
                          <Input
                            value={r.total_novo}
                            onChange={(e) => update(r.id, 'total_novo', e.target.value)}
                            className="h-7 text-right text-xs font-medium"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {rowsFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted-foreground p-6">
                        Nenhum item encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t pt-3 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="text-muted-foreground">Total atual: </span>
                <span className="font-semibold">{formatCurrency(totalAtual)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total novo: </span>
                <span className="font-semibold">{formatCurrency(totalNovo)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Δ: </span>
                <span
                  className={`font-bold ${
                    Math.abs(delta) < 0.005
                      ? ''
                      : delta > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                  }`}
                >
                  {delta >= 0 ? '+' : ''}
                  {formatCurrency(delta)}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="motivo" className="text-xs">
                Motivo do ajuste (obrigatório)
              </Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: Igualar ao PDF impresso e pago em 12/03/2024."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={saving || loading || alterados.length === 0 || motivo.trim().length < 3}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar ajustes ({alterados.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ajustes</AlertDialogTitle>
            <AlertDialogDescription>
              Você está alterando <strong>{alterados.length}</strong> item(ns) desta medição.
              <br />
              Total atual: <strong>{formatCurrency(totalAtual)}</strong>
              <br />
              Total novo: <strong>{formatCurrency(totalNovo)}</strong> (Δ {delta >= 0 ? '+' : ''}
              {formatCurrency(delta)})
              <br />
              <br />
              Esta ação é registrada em auditoria. Confirma?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSalvar} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
