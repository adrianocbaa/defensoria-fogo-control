import { cn } from '@/lib/utils';

export type RdoView = 'mes' | 'lista';

interface Props {
  value: RdoView;
  onChange: (v: RdoView) => void;
}

const OPTIONS: { key: RdoView; label: string }[] = [
  { key: 'mes', label: 'Mês' },
  { key: 'lista', label: 'Lista' },
];

export function RdoViewToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-home-border bg-home-surface p-1">
      {OPTIONS.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-home-muted hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
