import { useEffect, useMemo, useState } from 'react';
import { Loader2, ListChecks, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  obraId: string;
  onChanged?: () => void;
}

interface CatalogoRow {
  id: string;
  nome: string;
  texto_documento: string;
  ordem: number;
  ativo: boolean;
}

/**
 * Seleção dos sistemas/serviços executados na obra.
 * Alimenta o texto de "Descrição do imóvel" no ACT.
 */
export function SistemasServicosSelector({ obraId, onChanged }: Props) {
  const [catalogo, setCatalogo] = useState<CatalogoRow[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: cat }, { data: obra }] = await Promise.all([
        supabase
          .from('catalogo_sistemas_servicos')
          .select('id, nome, texto_documento, ordem, ativo')
          .eq('ativo', true)
          .order('ordem', { ascending: true })
          .order('nome', { ascending: true }),
        (supabase as any)
          .from('obras')
          .select('sistemas_servicos_ids')
          .eq('id', obraId)
          .maybeSingle(),
      ]);
      setCatalogo((cat as any) || []);
      setSelecionados(new Set(((obra as any)?.sistemas_servicos_ids || []) as string[]));
      setLoading(false);
    })();
  }, [obraId]);

  const toggle = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const previewTexto = useMemo(() => {
    const textos = catalogo
      .filter((c) => selecionados.has(c.id))
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .map((c) => c.texto_documento.trim())
      .filter(Boolean);
    if (textos.length === 0) return '';
    if (textos.length === 1) return textos[0];
    if (textos.length === 2) return `${textos[0]} e ${textos[1]}`;
    return `${textos.slice(0, -1).join(', ')} e ${textos[textos.length - 1]}`;
  }, [catalogo, selecionados]);

  const salvar = async () => {
    setSaving(true);
    try {
      const ids = Array.from(selecionados);
      const { error } = await (supabase as any)
        .from('obras')
        .update({ sistemas_servicos_ids: ids })
        .eq('id', obraId);
      if (error) throw error;
      toast.success('Serviços executados atualizados.');
      onChanged?.();
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" /> Serviços executados na obra
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Selecione os sistemas/serviços que foram executados. O texto de "Descrição do imóvel" no ACT será montado
          automaticamente a partir dessa seleção. O catálogo é gerenciado no painel administrativo.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando catálogo…
          </div>
        ) : catalogo.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum item ativo no catálogo. Cadastre em <span className="font-medium">Admin → Encerramento</span>.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {catalogo.map((c) => (
              <label
                key={c.id}
                className="flex items-start gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={selecionados.has(c.id)}
                  onCheckedChange={() => toggle(c.id)}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.texto_documento}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {previewTexto && (
          <div className="rounded-md border bg-muted/30 p-3">
            <Label className="text-xs text-muted-foreground">Prévia da descrição:</Label>
            <p className="text-sm mt-1">
              Os serviços foram realizados no Núcleo … edificação térrea composta de sistema de materiais mistos,{' '}
              <span className="font-medium">com {previewTexto}</span>.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={salvar} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar seleção
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
