import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
} from 'lucide-react';
import { PdfCanvas } from '@/components/checklist/PdfCanvas';
import { AmbienteDialog } from '@/components/checklist/AmbienteDialog';
import { ServicosPanel } from '@/components/checklist/ServicosPanel';
import { useChecklistDinamico, type ChecklistServico } from '@/hooks/useChecklistDinamico';
import { cn } from '@/lib/utils';

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
  const [selectedAmbienteId, setSelectedAmbienteId] = useState<string | null>(null);
  const [pendingRect, setPendingRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAmbiente = ambientes.find(a => a.id === selectedAmbienteId) ?? null;
  const totalPages = pdf?.total_paginas ?? 1;

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

  const handleDrawComplete = (rect: { x: number; y: number; w: number; h: number }) => {
    setPendingRect(rect);
    setDialogOpen(true);
    setIsDrawingMode(false);
  };

  const handleAmbienteCreate = async (
    nome: string,
    servicos: { descricao: string; is_padrao: boolean }[]
  ) => {
    if (!pendingRect) return;
    const ambiente = await createAmbiente(nome, currentPage, pendingRect, servicos);
    if (ambiente) setSelectedAmbienteId(ambiente.id);
    setPendingRect(null);
    setDialogOpen(false);
  };

  const handleAmbienteClick = (id: string) => {
    setSelectedAmbienteId(id);
  };

  const pageAmbientes = ambientes.filter(a => a.pagina === currentPage);

  if (loading) {
    return (
      <SimpleHeader>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </SimpleHeader>
    );
  }

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
              {/* Stats resumidas */}
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
            )}
          </div>
        </div>

        {/* Main content */}
        {!pdf ? (
          /* Upload area */
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
          /* Split layout: PDF viewer | Services panel */
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT: PDF Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden border-r min-w-0">
              {/* PDF toolbar */}
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 shrink-0">
                {/* Mode toggle */}
                <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md">
                  <Button
                    size="sm"
                    variant={!isDrawingMode ? 'default' : 'ghost'}
                    className="h-7 text-xs px-2"
                    onClick={() => setIsDrawingMode(false)}
                  >
                    <MousePointer className="h-3.5 w-3.5 mr-1" />
                    Selecionar
                  </Button>
                  <Button
                    size="sm"
                    variant={isDrawingMode ? 'default' : 'ghost'}
                    className="h-7 text-xs px-2"
                    onClick={() => setIsDrawingMode(!isDrawingMode)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Novo Ambiente
                  </Button>
                </div>

                {isDrawingMode && (
                  <span className="text-xs text-primary animate-pulse font-medium">
                    Arraste para marcar um ambiente no PDF
                  </span>
                )}

                {/* Page navigation */}
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium min-w-[60px] text-center">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
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
                  selectedAmbienteId={selectedAmbienteId}
                  onPageCount={handlePageCount}
                  onDrawComplete={handleDrawComplete}
                  onAmbienteClick={handleAmbienteClick}
                />
              </div>
            </div>

            {/* RIGHT: Environments list + services */}
            <div className="w-80 xl:w-96 flex flex-col overflow-hidden shrink-0">
              {/* Environments list */}
              <div className="border-b">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Ambientes</span>
                    <Badge variant="secondary" className="h-4 text-[10px]">{ambientes.length}</Badge>
                  </div>
                  {/* Page filter */}
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
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{amb.nome}</p>
                            <p className="text-[10px] text-muted-foreground">Pág. {amb.pagina} · {total} serviços</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {aprovados > 0 && (
                              <span className="text-[10px] text-green-600 font-medium">{aprovados}✓</span>
                            )}
                            {reprovados > 0 && (
                              <span className="text-[10px] text-destructive font-medium">{reprovados}✗</span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Services for selected ambiente */}
              <div className="flex-1 overflow-hidden">
                <ServicosPanel
                  ambiente={selectedAmbiente}
                  onUpdateServico={(id, updates) => updateServico(id, updates as Parameters<typeof updateServico>[1])}
                  onDeleteServico={deleteServico}
                  onAddServico={addServico}
                  onDeleteAmbiente={deleteAmbiente}
                  onUploadFoto={uploadFoto}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Ambiente creation dialog */}
      <AmbienteDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setPendingRect(null); }}
        onConfirm={handleAmbienteCreate}
      />
    </SimpleHeader>
  );
}
