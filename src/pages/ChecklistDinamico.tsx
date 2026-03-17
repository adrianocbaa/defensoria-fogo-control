import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { exportChecklistPdf } from '@/components/checklist/ChecklistPdfExport';
import { toast } from 'sonner';
import { PdfCanvas, type DrawMode } from '@/components/checklist/PdfCanvas';
import type { ShapeData } from '@/components/checklist/PdfCanvas';
import { AmbienteDialog } from '@/components/checklist/AmbienteDialog';
import { ServicosPanel } from '@/components/checklist/ServicosPanel';
import { useChecklistDinamico, type ChecklistServico } from '@/hooks/useChecklistDinamico';
import { cn } from '@/lib/utils';

type PendingShape = {
  type: DrawMode;
  rect?: { x: number; y: number; w: number; h: number };
  shapeData?: ShapeData;
};

export function ChecklistDinamico() {
  const { obraId } = useParams<{ obraId: string }>();
  const navigate = useNavigate();

  const {
    pdf,
    ambientes,
    loading,
    uploading,
    stats,
    uploadPdf,
    updateTotalPages,
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

  // Pin mode: when user clicks "marcar no PDF" from a service
  const [isPinMode, setIsPinMode] = useState(false);
  const [pendingPinServico, setPendingPinServico] = useState<{ id: string; descricao: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAmbiente = ambientes.find(a => a.id === selectedAmbienteId) ?? null;
  const totalPages = pdf?.total_paginas ?? 1;

  const handleExportPdf = async () => {
    if (!obraId || !pdf) return;
    setExportingPdf(true);
    try {
      // Buscar dados da obra
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

      const empresa =
        (obra?.empresas as any)?.razao_social || obra?.empresa_responsavel || '';

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
    if (ambiente) setSelectedAmbienteId(ambiente.id);
    setPendingShape(null);
    setDialogOpen(false);
  };

  const handleAmbienteClick = (id: string) => {
    setSelectedAmbienteId(id);
  };

  const handlePinRequest = (servicoId: string, descricao: string) => {
    setIsPinMode(true);
    setPendingPinServico({ id: servicoId, descricao });
    setIsDrawingMode(false);
  };

  const handlePinPlaced = (servicoId: string, pin: { x: number; y: number }) => {
    updateServico(servicoId, { location_pin: pin });
    setIsPinMode(false);
    setPendingPinServico(null);
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

  return (
    <SimpleHeader>
      <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
        {/* Top toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-background shrink-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="font-semibold text-sm truncate">Checklist Dinâmico</h1>

          {pdf && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {stats.aprovados}
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3.5 w-3.5" /> {stats.reprovados}
                </span>
                <span className="flex items-center gap-1 text-yellow-600">
                  <Clock className="h-3.5 w-3.5" /> {stats.pendentes}
                </span>
              </div>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            {pdf && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Substituir PDF
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs"
                  onClick={handleExportPdf}
                  disabled={exportingPdf || ambientes.length === 0}
                  title={ambientes.length === 0 ? 'Crie ambientes antes de exportar' : 'Gerar relatório técnico PDF'}
                >
                  {exportingPdf
                    ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Gerando...</>
                    : <><Download className="h-3.5 w-3.5 mr-1" />Exportar Relatório</>
                  }
                </Button>
              </>
            )}
          </div>
        </div>

        {!pdf ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Nenhum projeto carregado</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Faça o upload do projeto em PDF para começar a demarcar os ambientes e registrar os serviços a verificar.
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="lg"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Enviando...' : 'Carregar Projeto PDF'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT: PDF Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden border-r min-w-0">
              {/* PDF toolbar */}
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 shrink-0 flex-wrap">
                {/* Mode: select / draw */}
                <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md">
                  <Button
                    size="sm"
                    variant={!isDrawingMode && !isPinMode ? 'default' : 'ghost'}
                    className="h-7 text-xs px-2"
                    onClick={() => { setIsDrawingMode(false); handleCancelPin(); }}
                  >
                    <MousePointer className="h-3.5 w-3.5 mr-1" />
                    Selecionar
                  </Button>
                  <Button
                    size="sm"
                    variant={isDrawingMode ? 'default' : 'ghost'}
                    className="h-7 text-xs px-2"
                    onClick={() => { setIsDrawingMode(v => !v); handleCancelPin(); }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Novo Ambiente
                  </Button>
                </div>

                {/* Shape type selector - only visible in drawing mode */}
                {isDrawingMode && (
                  <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md">
                    {drawModeOptions.map(opt => (
                      <Button
                        key={opt.mode}
                        size="sm"
                        variant={drawMode === opt.mode ? 'default' : 'ghost'}
                        className="h-7 text-xs px-2"
                        onClick={() => setDrawMode(opt.mode)}
                        title={opt.label}
                      >
                        <opt.icon className="h-3.5 w-3.5 mr-1" />
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                )}

                {isPinMode && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive font-medium animate-pulse">
                      📍 Clique no PDF para marcar a localização
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancelPin}>
                      Cancelar
                    </Button>
                  </div>
                )}

                {isDrawingMode && !isPinMode && (
                  <span className="text-xs text-primary animate-pulse font-medium">
                    {drawMode === 'polyline'
                      ? 'Clique para pontos · Duplo-clique para finalizar'
                      : drawMode === 'circle'
                      ? 'Clique e arraste para desenhar o círculo'
                      : 'Arraste para marcar o ambiente'}
                  </span>
                )}

                {/* Page navigation */}
                <div className="ml-auto flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium min-w-[60px] text-center">
                    {currentPage} / {totalPages}
                  </span>
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* PDF Canvas */}
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
                <div className="max-h-48 overflow-y-auto">
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
                            'w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition-colors border-b last:border-b-0',
                            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50',
                            !isCurrentPage && 'opacity-50'
                          )}
                          onClick={() => {
                            if (!isCurrentPage) setCurrentPage(amb.pagina);
                            setSelectedAmbienteId(amb.id);
                          }}
                        >
                          <span className="text-base opacity-60 shrink-0">{shapeIcon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{amb.nome}</p>
                            <p className="text-[10px] text-muted-foreground">Pág. {amb.pagina} · {total} serviços</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {aprovados > 0 && <span className="text-[10px] text-green-600 font-medium">{aprovados}✓</span>}
                            {reprovados > 0 && <span className="text-[10px] text-destructive font-medium">{reprovados}✗</span>}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
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
    </SimpleHeader>
  );
}
