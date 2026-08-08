import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ABERTAS, formatarData } from '@/lib/entrega/constants';
import { ImpactoBadge, SituacaoBadge } from './EntregaBadges';
import { FotoPicker } from './FotoPicker';
import type { EntregaPendencia } from '@/hooks/useEntregaInstitucional';
import type {
  EntregaFoto,
  EntregaReinspecao,
  EntregaReinspecaoItem,
} from '@/hooks/useEntregaPendencias';

interface Props {
  pendencias: EntregaPendencia[];
  fotos: EntregaFoto[];
  reinspecoes: EntregaReinspecao[];
  reinspecaoItens: EntregaReinspecaoItem[];
  nomeAmbiente: (id: string | null) => string;
  somenteLeitura: boolean;
  onCriarReinspecao: () => Promise<string | null>;
  onAvaliar: (args: {
    reinspecaoId: string;
    pendencia: EntregaPendencia;
    sanada: boolean;
    observacao: string;
    fotos: File[];
  }) => Promise<void>;
  onConcluirReinspecao: (reinspecaoId: string) => Promise<void>;
}

export function EntregaReinspecaoView({
  pendencias,
  fotos,
  reinspecoes,
  reinspecaoItens,
  nomeAmbiente,
  somenteLeitura,
  onCriarReinspecao,
  onAvaliar,
  onConcluirReinspecao,
}: Props) {
  const ativa =
    reinspecoes.find((r) => r.status === 'em_andamento') ??
    reinspecoes[reinspecoes.length - 1] ??
    null;

  const itens = ativa ? reinspecaoItens.filter((i) => i.reinspecao_id === ativa.id) : [];
  const porId = new Map(pendencias.map((p) => [p.id, p] as const));
  const lista = itens
    .map((i) => ({ item: i, pendencia: porId.get(i.pendencia_id) }))
    .filter((x): x is { item: EntregaReinspecaoItem; pendencia: EntregaPendencia } => !!x.pendencia);

  const pendentesAvaliacao = lista.filter((x) => !x.item.resultado);
  const avaliados = lista.length - pendentesAvaliacao.length;

  const [selId, setSelId] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!pendentesAvaliacao.some((x) => x.pendencia.id === selId)) {
      setSelId(pendentesAvaliacao[0]?.pendencia.id ?? null);
      setObservacao('');
      setArquivos([]);
    }
  }, [pendentesAvaliacao, selId]);

  const abertasSemSessao = pendencias.filter((p) => ABERTAS.includes(p.situacao));

  if (!ativa) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <RotateCcw className="h-8 w-8 text-primary" />
        </div>
        <p className="text-lg font-bold">Nenhuma reinspeção aberta</p>
        <p className="max-w-md text-sm text-muted-foreground">
          A reinspeção reavalia as pendências registradas na entrega. As pendências continuam sendo
          as mesmas — a sessão apenas registra formalmente o que foi sanado e o que permanece.
        </p>
        {!somenteLeitura && (
          <Button
            className="mt-2 h-12"
            disabled={abertasSemSessao.length === 0}
            onClick={() => onCriarReinspecao()}
          >
            Iniciar reinspeção ({abertasSemSessao.length} pendência(s) aberta(s))
          </Button>
        )}
      </Card>
    );
  }

  const selecionada = pendentesAvaliacao.find((x) => x.pendencia.id === selId) ?? null;

  const avaliar = async (sanada: boolean) => {
    if (!selecionada) return;
    setSalvando(true);
    await onAvaliar({
      reinspecaoId: ativa.id,
      pendencia: selecionada.pendencia,
      sanada,
      observacao: observacao.trim(),
      fotos: arquivos,
    });
    setSalvando(false);
    setObservacao('');
    setArquivos([]);
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-base font-bold">
            Reinspeção nº {String(ativa.sequencia).padStart(2, '0')}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatarData(ativa.data)}
            {ativa.responsavel_nome ? ` · ${ativa.responsavel_nome}` : ''} ·{' '}
            {ativa.status === 'concluida' ? 'Concluída' : 'Em andamento'}
          </p>
        </div>
        <div className="min-w-[200px] flex-1">
          <Progress value={lista.length ? (avaliados / lista.length) * 100 : 0} className="h-2" />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {avaliados} de {lista.length} avaliadas
          </p>
        </div>
        {!somenteLeitura && ativa.status === 'em_andamento' && (
          <Button
            variant="outline"
            className="h-11"
            disabled={pendentesAvaliacao.length > 0}
            onClick={() => onConcluirReinspecao(ativa.id)}
          >
            Concluir reinspeção
          </Button>
        )}
        {!somenteLeitura && ativa.status === 'concluida' && abertasSemSessao.length > 0 && (
          <Button className="h-11" onClick={() => onCriarReinspecao()}>
            Nova reinspeção
          </Button>
        )}
      </Card>

      {pendentesAvaliacao.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-bold">Todas as pendências desta sessão foram avaliadas</p>
          <p className="text-xs text-muted-foreground">
            Consulte o resultado atualizado na aba Resultado &amp; Formalização.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <div className="space-y-2">
            {pendentesAvaliacao.map(({ pendencia: p }) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelId(p.id)}
                className={cn(
                  'w-full rounded-xl border bg-card p-3 text-left transition-colors',
                  p.id === selId
                    ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                    : 'hover:bg-muted/40',
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 text-sm font-bold">{p.titulo}</span>
                  <ImpactoBadge impacto={p.impacto} />
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {nomeAmbiente(p.ambiente_id)}
                </p>
                <SituacaoBadge situacao={p.situacao} className="mt-2" />
              </button>
            ))}
          </div>

          <Card className="space-y-4 p-5">
            {selecionada && (
              <>
                <div>
                  <h2 className="text-lg font-bold">{selecionada.pendencia.titulo}</h2>
                  <p className="text-sm text-muted-foreground">
                    {nomeAmbiente(selecionada.pendencia.ambiente_id)}
                  </p>
                </div>

                {selecionada.pendencia.descricao && (
                  <p className="text-sm">{selecionada.pendencia.descricao}</p>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {(['ocorrencia', 'correcao'] as const).map((tipo) => {
                    const arr = fotos.filter(
                      (f) => f.pendencia_id === selecionada.pendencia.id && f.tipo === tipo,
                    );
                    const capa = arr[arr.length - 1];
                    return (
                      <div key={tipo}>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          {tipo === 'ocorrencia' ? 'Antes' : 'Depois'}
                        </p>
                        {capa?.url ? (
                          <img
                            src={capa.url}
                            alt={tipo === 'ocorrencia' ? 'Foto antes' : 'Foto depois'}
                            loading="lazy"
                            className="h-40 w-full rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                            Sem registro
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!somenteLeitura && ativa.status === 'em_andamento' && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="rein-obs">Parecer da reinspeção</Label>
                      <Textarea
                        id="rein-obs"
                        rows={3}
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        placeholder="Descreva o que foi verificado nesta reinspeção"
                      />
                    </div>
                    <FotoPicker
                      arquivos={arquivos}
                      onChange={setArquivos}
                      label="Foto da reinspeção"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        className="h-12 bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={salvando}
                        onClick={() => avaliar(true)}
                      >
                        <ThumbsUp className="mr-2 h-4 w-4" /> Sanada
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 border-destructive/50 text-destructive hover:text-destructive"
                        disabled={salvando}
                        onClick={() => avaliar(false)}
                      >
                        <ThumbsDown className="mr-2 h-4 w-4" /> Continua pendente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
