import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, FileBadge } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ART_TIPO_LABEL } from '@/lib/encerramento/types';

interface Props {
  obraId: string;
  onChanged?: () => void;
}

interface ArtRow {
  id: string;
  numero_art: string;
  tipo: string;
  aditivo_session_id: string | null;
  ordem: number;
}

interface AditivoOpt {
  id: string;
  sequencia: number;
  tipo_aditivo: string | null;
  status: string;
}

const TIPOS_CONTRATO = ['execucao', 'projeto', 'complementar', 'fiscalizacao'];
const TIPOS_ADITIVO = ['prazo', 'valor', 'prazo_valor', 'supressao', 'complementar'];

export function ObraArtsManager({ obraId, onChanged }: Props) {
  const [arts, setArts] = useState<ArtRow[]>([]);
  const [aditivos, setAditivos] = useState<AditivoOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formulário para nova ART
  const [novoNumero, setNovoNumero] = useState('');
  const [novoTipo, setNovoTipo] = useState<string>('execucao');
  const [novoVinculo, setNovoVinculo] = useState<string>('contrato'); // 'contrato' | aditivo_session_id

  const carregar = async () => {
    setLoading(true);
    const [{ data: artsData }, { data: aditData }] = await Promise.all([
      (supabase as any)
        .from('obra_arts')
        .select('id, numero_art, tipo, aditivo_session_id, ordem, created_at')
        .eq('obra_id', obraId)
        .order('aditivo_session_id', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('aditivo_sessions')
        .select('id, sequencia, tipo_aditivo, status')
        .eq('obra_id', obraId)
        .order('sequencia', { ascending: true }),
    ]);
    setArts((artsData as any) || []);
    setAditivos((aditData as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (obraId) carregar();
     
  }, [obraId]);

  const adicionar = async () => {
    const numero = novoNumero.trim();
    if (!numero) {
      toast.error('Informe o número da ART/RRT.');
      return;
    }
    setSaving(true);
    try {
      const aditivo_session_id = novoVinculo === 'contrato' ? null : novoVinculo;
      const { error } = await (supabase as any).from('obra_arts').insert({
        obra_id: obraId,
        aditivo_session_id,
        numero_art: numero,
        tipo: novoTipo,
      });
      if (error) throw error;
      setNovoNumero('');
      toast.success('ART cadastrada.');
      await carregar();
      onChanged?.();
    } catch (e: any) {
      toast.error(`Erro ao cadastrar ART: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const remover = async (id: string) => {
    if (!confirm('Remover esta ART?')) return;
    try {
      const { error } = await (supabase as any).from('obra_arts').delete().eq('id', id);
      if (error) throw error;
      toast.success('ART removida.');
      await carregar();
      onChanged?.();
    } catch (e: any) {
      toast.error(`Erro ao remover: ${e?.message || e}`);
    }
  };

  const atualizarCampo = async (id: string, campo: 'numero_art' | 'tipo', valor: string) => {
    try {
      const { error } = await (supabase as any)
        .from('obra_arts')
        .update({ [campo]: valor })
        .eq('id', id);
      if (error) throw error;
      onChanged?.();
    } catch (e: any) {
      toast.error(`Erro ao atualizar: ${e?.message || e}`);
    }
  };

  const rotuloVinculo = (aditivoId: string | null): string => {
    if (!aditivoId) return 'Contrato inicial';
    const a = aditivos.find((x) => x.id === aditivoId);
    if (!a) return 'Aditivo';
    return `${a.sequencia}º Aditivo${a.tipo_aditivo ? ` (${a.tipo_aditivo})` : ''}`;
  };

  const tiposParaVinculo = novoVinculo === 'contrato' ? TIPOS_CONTRATO : TIPOS_ADITIVO;

  // Ajusta tipo padrão quando muda o vínculo
  useEffect(() => {
    const lista = novoVinculo === 'contrato' ? TIPOS_CONTRATO : TIPOS_ADITIVO;
    if (!lista.includes(novoTipo)) setNovoTipo(lista[0]);
     
  }, [novoVinculo]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileBadge className="h-4 w-4 text-primary" /> ARTs / RRTs da Obra
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cadastre todas as ARTs vinculadas ao contrato inicial e a cada aditivo. Elas serão listadas
          no Atestado de Capacidade Técnica (ACT).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista atual */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : arts.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">Nenhuma ART cadastrada ainda.</div>
        ) : (
          <div className="space-y-2">
            {arts.map((a) => (
              <div
                key={a.id}
                className="flex flex-col md:flex-row md:items-center gap-2 rounded-md border p-3 bg-muted/30"
              >
                <Badge variant="outline" className="w-fit">
                  {rotuloVinculo(a.aditivo_session_id)}
                </Badge>
                <Input
                  defaultValue={a.numero_art}
                  className="md:max-w-xs"
                  placeholder="Nº ART/RRT"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== a.numero_art) atualizarCampo(a.id, 'numero_art', v);
                  }}
                />
                <Select
                  defaultValue={a.tipo}
                  onValueChange={(v) => atualizarCampo(a.id, 'tipo', v)}
                >
                  <SelectTrigger className="md:max-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(a.aditivo_session_id ? TIPOS_ADITIVO : TIPOS_CONTRATO).map((t) => (
                      <SelectItem key={t} value={t}>
                        {ART_TIPO_LABEL[t] || t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive md:ml-auto"
                  onClick={() => remover(a.id)}
                  title="Remover ART"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Formulário nova */}
        <div className="border-t pt-4">
          <p className="text-xs font-semibold mb-2">Adicionar nova ART/RRT</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">Vínculo</Label>
              <Select value={novoVinculo} onValueChange={setNovoVinculo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contrato">Contrato inicial</SelectItem>
                  {aditivos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.sequencia}º Aditivo{a.tipo_aditivo ? ` (${a.tipo_aditivo})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={novoTipo} onValueChange={setNovoTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposParaVinculo.map((t) => (
                    <SelectItem key={t} value={t}>{ART_TIPO_LABEL[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label className="text-xs">Nº ART/RRT</Label>
              <Input
                value={novoNumero}
                onChange={(e) => setNovoNumero(e.target.value)}
                placeholder="Ex.: MT20250012345"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={adicionar} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
