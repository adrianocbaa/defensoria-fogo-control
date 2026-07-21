import { cn } from '@/lib/utils';

export type RdoFilterKey =
  | 'todos'
  | 'com_ocorrencia'
  | 'com_fotos'
  | 'com_comentarios'
  | 'sem_expediente'
  | 'pendentes'
  | 'aprovados';

const CHIPS: { key: RdoFilterKey; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'com_ocorrencia', label: 'Com ocorrência' },
  { key: 'com_fotos', label: 'Com fotos' },
  { key: 'com_comentarios', label: 'Com comentários' },
  { key: 'sem_expediente', label: 'Sem expediente' },
  { key: 'pendentes', label: 'Pendentes' },
  { key: 'aprovados', label: 'Aprovados' },
];

interface Props {
  value: RdoFilterKey;
  onChange: (v: RdoFilterKey) => void;
}

export function RdoFilterChips({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map((c) => {
        const active = value === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-home-border bg-home-surface text-foreground hover:bg-accent',
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
