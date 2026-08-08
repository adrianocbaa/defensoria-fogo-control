import {
  Camera,
  ClipboardList,
  FileText,
  History,
  LayoutGrid,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type RecebimentoSecao =
  | 'visao'
  | 'checklist'
  | 'pendencias'
  | 'reinspecao'
  | 'fotos'
  | 'historico'
  | 'relatorio';

const ITENS: { key: RecebimentoSecao; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'visao', label: 'Visão Geral', icon: LayoutGrid },
  { key: 'checklist', label: 'Checklist', icon: ClipboardList },
  { key: 'pendencias', label: 'Pendências', icon: ShieldAlert },
  { key: 'reinspecao', label: 'Reinspeção', icon: RefreshCw },
  { key: 'fotos', label: 'Fotos', icon: Camera },
  { key: 'historico', label: 'Histórico', icon: History },
  { key: 'relatorio', label: 'Relatório', icon: FileText },
];

interface Props {
  value: RecebimentoSecao;
  onChange: (s: RecebimentoSecao) => void;
  badges?: Partial<Record<RecebimentoSecao, number>>;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function RecebimentoNav({
  value,
  onChange,
  badges = {},
  orientation = 'horizontal',
  className,
}: Props) {
  const vertical = orientation === 'vertical';
  return (
    <nav
      aria-label="Seções do recebimento"
      className={cn(
        vertical
          ? 'flex w-[190px] shrink-0 flex-col gap-1'
          : 'flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {ITENS.map((item) => {
        const ativo = value === item.key;
        const badge = badges[item.key];
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            aria-current={ativo ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg text-sm font-medium transition-colors',
              vertical ? 'px-3 py-2.5' : 'px-3.5 py-2',
              ativo
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
            {!!badge && (
              <span
                className={cn(
                  'ml-auto rounded-full px-1.5 text-[10px] font-semibold leading-4',
                  ativo ? 'bg-primary-foreground/20' : 'bg-destructive/15 text-destructive',
                )}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
