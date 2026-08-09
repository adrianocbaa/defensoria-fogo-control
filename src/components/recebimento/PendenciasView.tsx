import { useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ABERTAS, type PendenciaSituacao } from '@/lib/recebimento/constants';
import type { Foto, Pendencia, PendenciaHistorico } from '@/hooks/useRecebimentoPendencias';
import { PendenciaCard } from './PendenciaCard';
import { PendenciaDetail } from './PendenciaDetail';

interface Props {
  pendencias: Pendencia[];
  fotos: Foto[];
  historico: PendenciaHistorico[];
  nomeAmbiente: (id: string | null) => string;
  somenteLeitura: boolean;
  onRegistrarCorrecao: (p: Pendencia, observacao: string, fotos: File[]) => Promise<void>;
  onAvaliar: (p: Pendencia, aceita: boolean, observacao: string, fotos: File[]) => Promise<void>;
  onCancelar: (p: Pendencia, motivo: string) => Promise<void>;
}

const FILTROS: { key: string; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'correcao_registrada', label: 'Correção registrada' },
  { key: 'reprovada', label: 'Reprovadas' },
  { key: 'sanada', label: 'Sanadas' },
];

export function PendenciasView({
  pendencias,
  fotos,
  historico,
  nomeAmbiente,
  somenteLeitura,
  onRegistrarCorrecao,
  onAvaliar,
  onCancelar,
}: Props) {
  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [sheetAberta, setSheetAberta] = useState(false);
  const isMobile = useIsMobile();

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pendencias.filter((p) => {
      if (filtro !== 'todas' && p.situacao !== (filtro as PendenciaSituacao)) return false;
      if (termo) {
        const alvo = `${p.titulo} ${p.descricao ?? ''} ${nomeAmbiente(p.ambiente_id)}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [pendencias, filtro, busca, nomeAmbiente]);

  const selecionada = lista.find((p) => p.id === selecionadaId) ?? null;
  const abertas = pendencias.filter((p) => ABERTAS.includes(p.situacao)).length;

  const abrir = (p: Pendencia) => {
    setSelecionadaId(p.id);
    setSheetAberta(true);
  };

  const detalheProps = (p: Pendencia) => ({
    pendencia: p,
    fotos,
    historico,
    nomeAmbiente,
    somenteLeitura,
    onRegistrarCorrecao,
    onAvaliar,
    onCancelar,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">Pendências</h2>
        <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-bold text-destructive">
          {abertas} em aberto
        </span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-9"
          placeholder="Buscar pendência..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFiltro(f.key)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-medium',
              filtro === f.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-muted',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <div className="space-y-2">
          {lista.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma pendência encontrada.
            </Card>
          )}
          {lista.map((p) => (
            <PendenciaCard
              key={p.id}
              pendencia={p}
              ambienteNome={nomeAmbiente(p.ambiente_id)}
              fotos={fotos}
              ativa={p.id === selecionadaId}
              onClick={() => abrir(p)}
            />
          ))}
        </div>

        {/* Detalhe inline (tablet/desktop) */}
        <div className="hidden lg:block">
          {selecionada ? (
            <PendenciaDetail {...detalheProps(selecionada)} />
          ) : (
            <Card className="flex h-full min-h-[240px] items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Selecione uma pendência para ver os detalhes e registrar a correção.
            </Card>
          )}
        </div>
      </div>

      {/* Detalhe em bottom sheet (mobile/tablet estreito) */}
      <Sheet
        open={sheetAberta && !!selecionada}
        onOpenChange={(o) => {
          setSheetAberta(o);
        }}
      >
        <SheetContent
          side="bottom"
          className="flex h-[94vh] flex-col p-0 sm:mx-auto sm:max-w-2xl lg:hidden"
        >
          {selecionada && (
            <>
              <SheetHeader className="border-b px-4 py-3 text-left">
                <SheetTitle className="text-base">Detalhe da pendência</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <PendenciaDetail
                  {...detalheProps(selecionada)}
                  onConcluido={() => setSheetAberta(false)}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
