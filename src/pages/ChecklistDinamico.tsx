import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
import {
  ArrowLeft,
  Upload,
  FileText,
  ChevronLeft,
  ChevronRight,
  Pencil,
  MousePointer,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Square,
  Circle,
  Spline,
  Download,
  Loader2,
  Map,
  ListChecks,
  Trash2,
  Plus,
  FilePlus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { exportChecklistPdf } from '@/components/checklist/ChecklistPdfExport';
import { toast } from 'sonner';
import { PdfCanvas, type DrawMode } from '@/components/checklist/PdfCanvas';
import type { ShapeData } from '@/components/checklist/PdfCanvas';
import { AmbienteDialog } from '@/components/checklist/AmbienteDialog';
import { ServicosPanel } from '@/components/checklist/ServicosPanel';
import { useChecklistDinamico, type ChecklistServico, type ChecklistPdf } from '@/hooks/useChecklistDinamico';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

type PendingShape = {
  type: DrawMode;
  rect?: { x: number; y: number; w: number; h: number };
  shapeData?: ShapeData;
};

export function ChecklistDinamico() {
  const { obraId } = useParams<{ obraId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const {
    pdf,
    pdfs,
    selectedPdfId,
    setSelectedPdfId,
    ambientes,
    loading,
    uploading,
    stats,
    uploadPdf,
    deletePdf,
    updateTotalPages,
    updatePrazoCorrecao,
    createAmbiente,
    updateServico,
    addServico,
    deleteAmbiente,
    deleteServico,
    uploadFoto,
  } = useChecklistDinamico(obraId!);

  const [currentPage, setCurrentPage] = useState(1);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode>('rect');
  const [selectedAmbienteId, setSelectedAmbienteId] = useState<string | null>(null);
  const [pendingShape, setPendingShape] = useState<PendingShape | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [prazoRelatorio, setPrazoRelatorio] = useState<string>(
    pdf?.prazo_correcao != null ? String(pdf.prazo_correcao) : ''
  );
  const [mobileTab, setMobileTab] = useState<'pdf' | 'ambientes'>('pdf');
  const [servicosSheetOpen, setServicosSheetOpen] = useState(false);
  const [deletePdfId, setDeletePdfId] = useState<string | null>(null);

  // Pin mode
  const [isPinMode, setIsPinMode] = useState(false);
  const [pendingPinServico, setPendingPinServico] = useState<{ id: string; descricao: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAmbiente = ambientes.find(a => a.id === selectedAmbienteId) ?? null;
  const totalPages = pdf?.total_paginas ?? 1;

  // Reset page when changing PDF
  const handleSelectPdf = (pdfId: string) => {
    setSelectedPdfId(pdfId);
    setCurrentPage(1);
    setSelectedAmbienteId(null);
    setIsDrawingMode(false);
    setIsPinMode(false);
  };

  const handleExportPdf = async () => {
    if (!obraId || !pdf) return;
    setExportingPdf(true);
    try {
      const { data: obra } = await supabase
        .from('obras')
        .select('nome, municipio, empresa_responsavel, n_contrato, fiscal_id, empresas(razao_social)')
        .eq('id', obraId)
        .maybeSingle();

      let fiscalName = '';
      if (obra?.fiscal_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', obra.fiscal_id)
          .maybeSingle();
        fiscalName = profile?.display_name ?? '';
      }

      const empresa = (obra?.empresas as any)?.razao_social || obra?.empresa_responsavel || '';

      await exportChecklistPdf(
        {
          obraId: obraId!,
          nomeObra: obra?.nome ?? 'Obra',
          municipio: obra?.municipio ?? '',
          empresa,
          nContrato: obra?.n_contrato,
          fiscal: fiscalName,
          dataRelatorio: new Date().toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric',
          }),
          pdfNomeArquivo: pdf.nome_arquivo,
          pdfUrl: pdf.pdf_url,
          totalPaginasPdf: pdf.total_paginas ?? 1,
          prazoCorrecao: pdf.prazo_correcao ?? null,
        },
        ambientes,
      );
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar relatório PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    await uploadPdf(file);
    e.target.value = '';
    setCurrentPage(1);
  };

  const handlePageCount = (count: number) => {
    if (pdf && count !== pdf.total_paginas) {
      updateTotalPages(pdf.id, count);
    }
  };

  const handleDrawComplete = (shape: { type: DrawMode; rect?: { x: number; y: number; w: number; h: number }; shapeData?: ShapeData }) => {
    setPendingShape(shape);
    setDialogOpen(true);
    setIsDrawingMode(false);
  };

  const handleAmbienteCreate = async (
    nome: string,
    servicos: { descricao: string; is_padrao: boolean }[]
  ) => {
    if (!pendingShape) return;
    const pos = pendingShape.rect ?? { x: 0, y: 0, w: 0, h: 0 };
    const ambiente = await createAmbiente(nome, currentPage, pos, servicos, pendingShape.type, pendingShape.shapeData);
    if (ambiente) {
      setSelectedAmbienteId(ambiente.id);
      if (isMobile) setServicosSheetOpen(true);
    }
    setPendingShape(null);
    setDialogOpen(false);
  };

  const handleAmbienteClick = (id: string) => {
    setSelectedAmbienteId(id);
    if (isMobile) setServicosSheetOpen(true);
  };

  const handlePinRequest = (servicoId: string, descricao: string) => {
    setIsPinMode(true);
    setPendingPinServico({ id: servicoId, descricao });
    setIsDrawingMode(false);
    if (isMobile) setServicosSheetOpen(false);
  };

  const handlePinPlaced = (servicoId: string, pin: { x: number; y: number }) => {
    updateServico(servicoId, { location_pin: pin });
    setIsPinMode(false);
    setPendingPinServico(null);
    if (isMobile && selectedAmbienteId) setServicosSheetOpen(true);
  };

  const handleCancelPin = () => {
    setIsPinMode(false);
    setPendingPinServico(null);
  };

  if (loading) {
    return (
      <SimpleHeader>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </SimpleHeader>
    );
  }

  const drawModeOptions: { mode: DrawMode; label: string; icon: React.ElementType }[] = [
    { mode: 'rect', label: 'Retângulo', icon: Square },
    { mode: 'circle', label: 'Círculo', icon: Circle },
    { mode: 'polyline', label: 'Polilinha', icon: Spline },
  ];

  // ── PDF Selector bar ─────────────────────────────────────────────────────
  const PdfSelectorBar = () => (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/20 shrink-0 overflow-x-auto">
      {pdfs.map((p) => (
        <div key={p.id} className="flex items-center shrink-0">
          <button
            onClick={() => handleSelectPdf(p.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors max-w-[180px]',
              selectedPdfId === p.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background border hover:bg-muted text-foreground'
            )}
          >
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate">{p.nome_arquivo.replace(/\.pdf$/i, '')}</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeletePdfId(p.id); }}
            className={cn(
              'ml-0.5 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors',
              selectedPdfId === p.id ? 'text-primary-foreground/60 hover:text-primary-foreground' : 'text-muted-foreground'
            )}
            title="Excluir projeto"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs shrink-0 gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title="Adicionar novo projeto PDF"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{uploading ? 'Enviando...' : 'Adicionar Projeto'}</span>
      </Button>
    </div>
  );

  // ── Shared PDF toolbar ───────────────────────────────────────────────────
  const PdfToolbar = () => (
    <div className="flex items-center gap-1.5 px-2 py-2 border-b bg-muted/30 shrink-0 flex-wrap">
      {/* Mode buttons */}
      <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-md">
        <Button
          size="sm"
          variant={!isDrawingMode && !isPinMode ? 'default' : 'ghost'}
          className="h-8 text-xs px-2"
          onClick={() => { setIsDrawingMode(false); handleCancelPin(); }}
        >
          <MousePointer className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Selecionar</span>
        </Button>
        <Button
          size="sm"
          variant={isDrawingMode ? 'default' : 'ghost'}
          className="h-8 text-xs px-2"
          onClick={() => { setIsDrawingMode(v => !v); handleCancelPin(); }}
        >
          <Pencil className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Novo Ambiente</span>
        </Button>
      </div>

      {/* Shape selectors */}
      {isDrawingMode && (
        <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-md">
          {drawModeOptions.map(opt => (
            <Button
              key={opt.mode}
              size="sm"
              variant={drawMode === opt.mode ? 'default' : 'ghost'}
              className="h-8 text-xs px-2"
              onClick={() => setDrawMode(opt.mode)}
              title={opt.label}
            >
              <opt.icon className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">{opt.label}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Pin mode indicator */}
      {isPinMode && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-destructive font-medium animate-pulse hidden sm:inline">
            📍 Clique no PDF para marcar
          </span>
          <span className="text-xs text-destructive font-medium animate-pulse sm:hidden">📍 Marcar pin</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancelPin}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Draw hint */}
      {isDrawingMode && !isPinMode && (
        <span className="text-xs text-primary animate-pulse font-medium hidden md:inline">
          {drawMode === 'polyline'
            ? 'Clique para pontos · Duplo-clique para finalizar'
            : drawMode === 'circle'
            ? 'Clique e arraste para desenhar o círculo'
            : 'Arraste para marcar o ambiente'}
        </span>
      )}

      {/* Page navigation */}
      <div className="ml-auto flex items-center gap-0.5">
        <Button size="icon" variant="ghost" className="h-8 w-8"
          disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium min-w-[48px] text-center">{currentPage}/{totalPages}</span>
        <Button size="icon" variant="ghost" className="h-8 w-8"
          disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // ── Ambientes list ─────────────────────────────────────────────────────────
  const AmbientesList = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn('overflow-y-auto', compact ? 'max-h-full' : 'max-h-48')}>
      {ambientes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4 px-3">
          Nenhum ambiente marcado. Use "Novo Ambiente" para marcar.
        </p>
      ) : (
        ambientes.map(amb => {
          const total = amb.servicos.length;
          const aprovados = amb.servicos.filter(s => s.status === 'aprovado').length;
          const reprovados = amb.servicos.filter(s => s.status === 'reprovado').length;
          const isSelected = selectedAmbienteId === amb.id;
          const isCurrentPage = amb.pagina === currentPage;
          const shapeIcon = amb.shape_type === 'circle' ? '⬤' : amb.shape_type === 'polyline' ? '⬡' : '▭';
          return (
            <button
              key={amb.id}
              className={cn(
                'w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm transition-colors border-b last:border-b-0',
                isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 active:bg-muted',
                !isCurrentPage && 'opacity-50'
              )}
              onClick={() => {
                if (!isCurrentPage) setCurrentPage(amb.pagina);
                setSelectedAmbienteId(amb.id);
                if (isMobile) setServicosSheetOpen(true);
              }}
            >
              <span className="text-base opacity-60 shrink-0">{shapeIcon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{amb.nome}</p>
                <p className="text-[10px] text-muted-foreground">Pág. {amb.pagina} · {total} serviços</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {aprovados > 0 && <span className="text-xs text-green-600 font-semibold">{aprovados}✓</span>}
                {reprovados > 0 && <span className="text-xs text-destructive font-semibold">{reprovados}✗</span>}
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  const pdfToDelete = pdfs.find(p => p.id === deletePdfId);

  return (
    <SimpleHeader>
      <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-background shrink-0">
          <Button variant="ghost" size="sm" className="px-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <Separator orientation="vertical" className="h-5 hidden sm:block" />
          <h1 className="font-semibold text-sm truncate hidden sm:block">Checklist Dinâmico</h1>

          {pdf && (
            <div className="flex items-center gap-2 text-xs ml-1">
              <span className="flex items-center gap-0.5 text-green-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> {stats.aprovados}
              </span>
              <span className="flex items-center gap-0.5 text-destructive font-medium">
                <XCircle className="h-3.5 w-3.5" /> {stats.reprovados}
              </span>
              <span className="flex items-center gap-0.5 text-yellow-600 font-medium">
                <Clock className="h-3.5 w-3.5" /> {stats.pendentes}
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {pdf && (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 border rounded px-2 h-8 bg-background">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">Prazo geral (dias):</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={prazoRelatorio}
                    onChange={e => setPrazoRelatorio(e.target.value)}
                    onBlur={async () => {
                      const val = prazoRelatorio.trim() === '' ? null : parseInt(prazoRelatorio, 10);
                      await updatePrazoCorrecao(pdf.id, val);
                    }}
                    placeholder="—"
                    className="w-12 text-xs text-center bg-transparent outline-none"
                  />
                </div>
                <Button variant="default" size="sm" className="h-8 px-2 text-xs"
                  onClick={handleExportPdf}
                  disabled={exportingPdf || ambientes.length === 0}
                  title={ambientes.length === 0 ? 'Crie ambientes antes de exportar' : 'Gerar relatório técnico PDF'}>
                  {exportingPdf
                    ? <><Loader2 className="h-3.5 w-3.5 sm:mr-1 animate-spin" /><span className="hidden sm:inline">Gerando...</span></>
                    : <><Download className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Exportar Relatório</span></>}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── No PDF state ────────────────────────────────────────────────── */}
        {pdfs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Nenhum projeto carregado</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Faça o upload de um ou mais projetos em PDF (ex: Pavimento Térreo, Pavimento 01...) para começar a demarcar os ambientes.
              </p>
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} size="lg" className="gap-2">
                <Upload className="h-4 w-4" />
                {uploading ? 'Enviando...' : 'Carregar Projeto PDF'}
              </Button>
            </div>
          </div>

        ) : (
          <>
            {/* ── PDF selector (tabs by project) ─────────────────────────── */}
            <PdfSelectorBar />

            {isMobile ? (
              /* ── MOBILE LAYOUT ──────────────────────────────────────────── */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b shrink-0 bg-background">
                  <button
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors',
                      mobileTab === 'pdf'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground'
                    )}
                    onClick={() => setMobileTab('pdf')}
                  >
                    <Map className="h-4 w-4" />
                    Projeto PDF
                  </button>
                  <button
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors',
                      mobileTab === 'ambientes'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground'
                    )}
                    onClick={() => setMobileTab('ambientes')}
                  >
                    <ListChecks className="h-4 w-4" />
                    Ambientes
                    {ambientes.length > 0 && (
                      <Badge variant="secondary" className="h-4 text-[10px] px-1">{ambientes.length}</Badge>
                    )}
                  </button>
                </div>

                {/* PDF tab */}
                {mobileTab === 'pdf' && pdf && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <PdfToolbar />
                    <div className="flex-1 overflow-auto p-2">
                      <PdfCanvas
                        pdfUrl={pdf.pdf_url}
                        currentPage={currentPage}
                        ambientes={ambientes}
                        isDrawingMode={isDrawingMode}
                        drawMode={drawMode}
                        selectedAmbienteId={selectedAmbienteId}
                        isPinMode={isPinMode}
                        pendingPinServico={pendingPinServico}
                        onPageCount={handlePageCount}
                        onDrawComplete={handleDrawComplete}
                        onAmbienteClick={handleAmbienteClick}
                        onDeselect={() => setSelectedAmbienteId(null)}
                        onPinPlaced={handlePinPlaced}
                      />
                    </div>
                  </div>
                )}

                {/* Ambientes tab */}
                {mobileTab === 'ambientes' && (
                  <div className="flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b sticky top-0 z-10">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">Ambientes</span>
                        <Badge variant="secondary" className="h-5 text-[10px]">{ambientes.length}</Badge>
                      </div>
                    </div>
                    <AmbientesList compact />
                  </div>
                )}

                {/* Services bottom sheet (mobile) */}
                <Sheet open={servicosSheetOpen} onOpenChange={setServicosSheetOpen}>
                  <SheetContent side="bottom" className="h-[75vh] p-0 flex flex-col rounded-t-xl">
                    <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
                      <SheetTitle className="text-base">
                        {selectedAmbiente?.nome ?? 'Serviços'}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-hidden">
                      <ServicosPanel
                        ambiente={selectedAmbiente}
                        obraId={obraId!}
                        onUpdateServico={(id, updates) => updateServico(id, updates as Parameters<typeof updateServico>[1])}
                        onDeleteServico={deleteServico}
                        onAddServico={addServico}
                        onDeleteAmbiente={(id) => { deleteAmbiente(id); setServicosSheetOpen(false); setSelectedAmbienteId(null); }}
                        onUploadFoto={uploadFoto}
                        onPinRequest={handlePinRequest}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

            ) : (
              /* ── DESKTOP LAYOUT ─────────────────────────────────────────── */
              <div className="flex-1 flex overflow-hidden">
                {/* LEFT: PDF Viewer */}
                <div className="flex-1 flex flex-col overflow-hidden border-r min-w-0">
                  {pdf && (
                    <>
                      <PdfToolbar />
                      <div className="flex-1 overflow-auto p-3">
                        <PdfCanvas
                          pdfUrl={pdf.pdf_url}
                          currentPage={currentPage}
                          ambientes={ambientes}
                          isDrawingMode={isDrawingMode}
                          drawMode={drawMode}
                          selectedAmbienteId={selectedAmbienteId}
                          isPinMode={isPinMode}
                          pendingPinServico={pendingPinServico}
                          onPageCount={handlePageCount}
                          onDrawComplete={handleDrawComplete}
                          onAmbienteClick={handleAmbienteClick}
                          onDeselect={() => setSelectedAmbienteId(null)}
                          onPinPlaced={handlePinPlaced}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* RIGHT: Environments list + services */}
                <div className="w-80 xl:w-96 flex flex-col overflow-hidden shrink-0">
                  <div className="border-b">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">Ambientes</span>
                        <Badge variant="secondary" className="h-4 text-[10px]">{ambientes.length}</Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Página {currentPage}</span>
                    </div>
                    <AmbientesList />
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <ServicosPanel
                      ambiente={selectedAmbiente}
                      onUpdateServico={(id, updates) => updateServico(id, updates as Parameters<typeof updateServico>[1])}
                      onDeleteServico={deleteServico}
                      onAddServico={addServico}
                      onDeleteAmbiente={deleteAmbiente}
                      onUploadFoto={uploadFoto}
                      onPinRequest={handlePinRequest}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <AmbienteDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setPendingShape(null); }}
        onConfirm={handleAmbienteCreate}
      />

      {/* Delete PDF confirmation */}
      <AlertDialog open={!!deletePdfId} onOpenChange={(o) => { if (!o) setDeletePdfId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto <strong>"{pdfToDelete?.nome_arquivo.replace(/\.pdf$/i, '')}"</strong> e todos os seus ambientes e serviços serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => { if (deletePdfId) { deletePdf(deletePdfId); setDeletePdfId(null); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SimpleHeader>
  );
}
