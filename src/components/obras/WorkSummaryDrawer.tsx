import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, MapPin, Menu as MenuIcon, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { PhotoGalleryCollapsible } from '@/components/PhotoGalleryCollapsible';
import { MedicaoProgressBar } from '@/components/MedicaoProgressBar';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useMedicoesFinanceiro } from '@/hooks/useMedicoesFinanceiro';
import { useRdoProgressByObra } from '@/hooks/useRdoProgressByObra';
import { type Obra, type ObraStatus } from '@/data/mockObras';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface WorkSummaryDrawerProps {
  obra: Obra | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusPill: Record<ObraStatus, { label: string; className: string }> = {
  concluida: { label: 'Concluída', className: 'bg-green-50 text-green-700 border-green-200' },
  em_andamento: { label: 'Em Andamento', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  planejada: { label: 'Planejada', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  paralisada: { label: 'Paralisada', className: 'bg-red-50 text-red-700 border-red-200' },
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'Não informado';
  if (dateString.includes('T')) return new Date(dateString).toLocaleDateString('pt-BR');
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
};

const toDMS = (value: number, isLat: boolean) => {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(2);
  const hemi = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  return `${deg}°${min}'${sec}"${hemi}`;
};

function MiniDonut({ value, color, label }: { value: number; color: string; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = 6;
  const size = 56;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="text-home-border"
            stroke="currentColor"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={`${dash} ${circ}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
          {pct.toFixed(0)}%
        </div>
      </div>
      <p className="text-[11px] text-home-muted">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-1.5 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-home-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function Content({ obra, onClose }: { obra: Obra; onClose: () => void }) {
  const navigate = useNavigate();
  const { dados, loading: loadingFin } = useMedicoesFinanceiro(obra.id);
  const { data: rdoProgress = 0 } = useRdoProgressByObra(obra.id);

  const valorInicial = dados.valorTotalOriginal || obra.valor || 0;
  const valorAditivado = dados.totalAditivo || (obra as any).valor_aditivado || 0;
  const valorFinal = dados.totalContrato || valorInicial + valorAditivado;
  const valorExecutado = dados.valorAcumulado || obra.valorExecutado || 0;
  const pctFinanceiro = valorFinal > 0 ? (valorExecutado / valorFinal) * 100 : 0;

  // Prazo
  const inicio = obra.dataInicio ? new Date(obra.dataInicio) : null;
  const prev = obra.previsaoTermino ? new Date(obra.previsaoTermino) : null;
  const today = new Date();
  const totalDias = inicio && prev ? Math.max(1, Math.ceil((prev.getTime() - inicio.getTime()) / 86400000)) : 0;
  const decorridos = inicio ? Math.max(0, Math.ceil((today.getTime() - inicio.getTime()) / 86400000)) : 0;
  const restantes = prev ? Math.ceil((prev.getTime() - today.getTime()) / 86400000) : 0;
  const pctTempo = totalDias > 0 ? Math.min(100, (decorridos / totalDias) * 100) : 0;

  const fotos = obra.fotos || [];
  const documentos = obra.documentos || [];

  const photosWithMetadata = fotos
    .map((photo: any, index: number) => {
      if (!photo) return null;
      if (typeof photo === 'object' && photo.url) {
        return {
          url: photo.url,
          uploadedAt: photo.uploadedAt || new Date().toISOString(),
          fileName: photo.fileName || `foto-${index + 1}.jpg`,
          monthFolder: photo.monthFolder,
          isCover: !!photo.isCover,
        };
      }
      const url = typeof photo === 'string' ? photo : String(photo);
      return {
        url,
        uploadedAt: new Date().toISOString(),
        fileName: url.split('/').pop() || `foto-${index + 1}.jpg`,
        monthFolder: undefined,
        isCover: false,
      };
    })
    .filter((p): p is NonNullable<typeof p> => !!p && !!p.url)
    .sort((a, b) => (a.isCover ? -1 : b.isCover ? 1 : 0));

  const status = statusPill[obra.status];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-home-border px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold leading-tight text-foreground">{obra.nome}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-home-muted">
              <MapPin className="h-3.5 w-3.5" />
              {obra.municipio}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium', status.className)}>
                {status.label}
              </span>
              <span className="inline-flex items-center rounded-full border border-home-border bg-home-bg px-3 py-0.5 text-xs font-medium text-home-muted">
                {obra.tipo}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-home-border text-home-muted hover:bg-home-bg hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1 border-primary/40 text-primary hover:bg-primary/5"
            onClick={() => navigate(`/obras/${obra.id}`)}
          >
            Ver página completa
          </Button>
          <Button variant="outline" size="icon" aria-label="Mais ações">
            <MenuIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Mini métricas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-xl border border-home-border bg-card p-3">
            <MiniDonut value={rdoProgress} color="hsl(217, 91%, 60%)" label="Avanço Físico" />
          </div>
          <div className="flex flex-col items-center rounded-xl border border-home-border bg-card p-3">
            <MiniDonut value={pctFinanceiro} color="hsl(142, 71%, 45%)" label="Avanço Financeiro" />
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-home-border bg-card p-3">
            <p className="text-xl font-bold leading-none">{restantes >= 0 ? restantes : 0}</p>
            <p className="text-[11px] text-home-muted">dias restantes</p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-home-border">
              <div className="h-full bg-orange-400" style={{ width: `${pctTempo}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-home-muted">Prazo</p>
          </div>
        </div>

        {/* Seções */}
        <Accordion type="multiple" defaultValue={['gerais', 'prazos']} className="mt-6 space-y-2">
          <AccordionItem value="gerais" className="rounded-lg border border-home-border">
            <AccordionTrigger className="px-4 hover:no-underline">
              <span className="font-semibold">Informações Gerais</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3">
              <InfoRow label="Contrato" value={(obra as any).n_contrato || 'Não informado'} />
              <InfoRow label="Objeto" value={obra.nome} />
              <InfoRow label="Situação" value={status.label} />
              <InfoRow label="Procedimento SEI" value={(obra as any).sei_numero || 'Não informado'} />
              <InfoRow label="Empresa" value={obra.empresaResponsavel || 'Não informado'} />
              <InfoRow label="Fiscal" value={obra.secretariaResponsavel || 'Não informado'} />
              <InfoRow label="Gestor" value={obra.responsavelProjeto || '—'} />
              {obra.coordenadas && obra.coordenadas[0] != null && obra.coordenadas[1] != null && (
                <InfoRow
                  label="Endereço"
                  value={
                    <span className="text-xs">
                      {obra.coordenadas[0].toFixed(6)}, {obra.coordenadas[1].toFixed(6)}
                      <br />
                      <span className="text-home-muted">
                        {toDMS(obra.coordenadas[0], true)} {toDMS(obra.coordenadas[1], false)}
                      </span>
                    </span>
                  }
                />
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="prazos" className="rounded-lg border border-home-border">
            <AccordionTrigger className="px-4 hover:no-underline">
              <span className="font-semibold">Prazos de Execução</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3">
              <InfoRow label="Início" value={formatDate(obra.dataInicio)} />
              <InfoRow label="Término Previsto" value={formatDate(obra.previsaoTermino)} />
              {obra.status === 'concluida' && obra.data_termino_real && (
                <InfoRow label="Término Real" value={<span className="text-green-700">{formatDate(obra.data_termino_real)}</span>} />
              )}
              {(obra.tempo_obra || obra.aditivo_prazo) && (
                <InfoRow
                  label="Prazo"
                  value={
                    <>
                      {obra.tempo_obra || 0} dias
                      {obra.aditivo_prazo && obra.aditivo_prazo > 0 ? (
                        <> | Aditivo: +{obra.aditivo_prazo} dias | Prazo final: {(obra.tempo_obra || 0) + obra.aditivo_prazo} dias</>
                      ) : null}
                    </>
                  }
                />
              )}
              {totalDias > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold uppercase tracking-wider text-home-muted">Progresso do Tempo</span>
                    <span className={cn('font-medium', restantes >= 0 ? 'text-green-700' : 'text-red-600')}>
                      {restantes >= 0 ? 'Dentro do prazo' : 'Prazo excedido'}
                    </span>
                  </div>
                  <Progress value={pctTempo} className="h-1.5" />
                  <div className="flex items-center justify-between text-[11px] text-home-muted">
                    <span>{decorridos} dias transcorridos</span>
                    <span>{Math.max(0, restantes)} dias restantes</span>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="financeiro" className="rounded-lg border border-home-border">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex w-full items-center justify-between pr-2">
                <span className="font-semibold">Informações Financeiras</span>
                <span className="text-sm font-semibold text-green-700">{formatCurrency(valorFinal)}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3">
              {loadingFin ? (
                <p className="flex items-center gap-2 text-sm text-home-muted"><Loader2 className="h-3 w-3 animate-spin" /> Carregando…</p>
              ) : (
                <>
                  <InfoRow label="Valor Inicial" value={formatCurrency(valorInicial)} />
                  <InfoRow label="Valor Aditivado" value={formatCurrency(valorAditivado)} />
                  <InfoRow label="Valor Final" value={<span className="font-semibold text-primary">{formatCurrency(valorFinal)}</span>} />
                  <InfoRow label="Executado" value={formatCurrency(valorExecutado)} />
                  <InfoRow label="Saldo" value={formatCurrency(Math.max(0, valorFinal - valorExecutado))} />
                  {rdoProgress > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-home-muted">Andamento (RDO)</span>
                        <span className="font-semibold text-blue-600">{rdoProgress.toFixed(2)}%</span>
                      </div>
                      <Progress value={Math.min(rdoProgress, 100)} className="h-1.5" color="blue" />
                    </div>
                  )}
                  {dados.marcos.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-home-muted">Medições</span>
                        <span className="font-semibold text-green-600">{Math.min(dados.percentualExecutado, 100).toFixed(2)}%</span>
                      </div>
                      <MedicaoProgressBar marcos={dados.marcos} totalContrato={dados.totalContrato} height={6} color="green" />
                    </div>
                  )}
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fotos" className="rounded-lg border border-home-border">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex w-full items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span className="font-semibold">Álbum de Fotos ({photosWithMetadata.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3">
              {photosWithMetadata.length > 0 ? (
                <PhotoGalleryCollapsible photos={photosWithMetadata} />
              ) : (
                <p className="py-3 text-center text-sm text-home-muted">Nenhuma foto cadastrada</p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="documentos" className="rounded-lg border border-home-border">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex w-full items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="font-semibold">Documentos ({documentos.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3">
              {documentos.length > 0 ? (
                <ul className="space-y-2">
                  {documentos.map((d, i) => (
                    <li key={i} className="flex items-center justify-between rounded-md border border-home-border px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-red-500" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{d.nome}</p>
                          <p className="text-xs text-home-muted">{d.tipo}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-home-muted" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-center text-sm text-home-muted">Nenhum documento anexado</p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Footer */}
      <div className="shrink-0 space-y-2 border-t border-home-border bg-card px-6 py-4">
        <Button className="w-full" onClick={() => navigate(`/obras/${obra.id}`)}>
          Ver Detalhes Completos
        </Button>
        <PermissionGuard requiresEdit showMessage={false}>
          <Button variant="outline" className="w-full" onClick={() => navigate(`/admin/obras/editar/${obra.id}`)}>
            Editar Obra
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );
}

export function WorkSummaryDrawer({ obra, isOpen, onClose }: WorkSummaryDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full p-0 sm:max-w-[460px] lg:max-w-[500px]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Detalhes da obra</SheetTitle>
        </SheetHeader>
        {obra && <Content obra={obra} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}
