import { NavLink } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, ChevronRight, ArrowLeft, MoreVertical, FileText, RotateCcw, Trash2, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  obraId: string;
  obraNome?: string;
  obraMunicipio?: string;
  numeroSeq?: number;
  dataFormatada: string;
  statusLabel: string;
  statusTone: 'draft' | 'progress' | 'done' | 'warn';
  onOpenMobileMenu: () => void;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  // Kebab actions (all optional based on permissions)
  onGeneratePdf?: () => void;
  onReopen?: () => void;
  onDelete?: () => void;
  isGeneratingPdf?: boolean;
}

const TONE: Record<Props['statusTone'], string> = {
  draft: 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  progress: 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
  done: 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  warn: 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
};

export function RdoFormHeader({
  obraId,
  obraNome,
  obraMunicipio,
  numeroSeq,
  dataFormatada,
  statusLabel,
  statusTone,
  onOpenMobileMenu,
  onBack,
  onPrev,
  onNext,
  onGeneratePdf,
  onReopen,
  onDelete,
  isGeneratingPdf,
}: Props) {
  const hasKebab = !!(onGeneratePdf || onReopen || onDelete);

  return (
    <header className="sticky top-0 z-20 border-b bg-card">
      <div className="px-4 md:px-8 py-3 md:py-4">
        {/* Linha 1: menu mobile + breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden -ml-2"
            onClick={onOpenMobileMenu}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <NavLink to="/" className="hover:text-foreground transition-colors">Dashboard</NavLink>
          <span>/</span>
          <NavLink to="/obras" className="hover:text-foreground transition-colors">Obras</NavLink>
          <span>/</span>
          <NavLink to={`/obras/${obraId}`} className="hover:text-foreground transition-colors truncate max-w-[180px]">
            {obraNome ?? '...'}
          </NavLink>
          <span>/</span>
          <NavLink to={`/obras/${obraId}/rdo/resumo`} className="hover:text-foreground transition-colors">RDO</NavLink>
          <span>/</span>
          <span className="text-primary font-medium">{dataFormatada}</span>
        </div>

        {/* Linha 2: título + status + info + ações */}
        <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              RDO {numeroSeq ? `Nº ${numeroSeq}` : ''}
            </h1>
            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', TONE[statusTone])}>
              {statusLabel}
            </span>
            {(obraNome || obraMunicipio) && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-4 w-px bg-border" />
                {obraNome && <span className="font-medium text-foreground/80">{obraNome}</span>}
                {obraMunicipio && (
                  <>
                    <span className="text-muted-foreground/60">•</span>
                    <span>{obraMunicipio}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex">
              <Button
                variant="outline"
                size="icon"
                onClick={onPrev}
                aria-label="RDO anterior"
                className="rounded-r-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onNext}
                aria-label="Próximo RDO"
                className="rounded-l-none -ml-px"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {hasKebab && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Mais ações">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {onGeneratePdf && (
                    <DropdownMenuItem onClick={onGeneratePdf} disabled={isGeneratingPdf}>
                      <FileText className="h-4 w-4 mr-2" />
                      {isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF'}
                    </DropdownMenuItem>
                  )}
                  {onReopen && (
                    <DropdownMenuItem onClick={onReopen}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reabrir RDO
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      {(onGeneratePdf || onReopen) && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={onDelete}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir RDO
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
