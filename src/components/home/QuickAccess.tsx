import { Link } from 'react-router-dom';
import type { ModuleDef } from './modulesConfig';

interface QuickAccessProps {
  items: ModuleDef[];
}

export function QuickAccess({ items }: QuickAccessProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="quick-access-title">
      <h2
        id="quick-access-title"
        className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-home-muted"
      >
        Acesso rápido
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {items.map(({ id, title, icon: Icon, path }) => (
          <Link
            key={id}
            to={path}
            className="group flex items-center gap-3 rounded-xl border border-home-border bg-home-surface px-4 py-3.5 text-sm font-medium text-foreground transition-all hover:border-home-module-icon-fg/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Icon
              className="h-5 w-5 text-home-module-icon-fg"
              strokeWidth={1.75}
            />
            <span className="truncate">{title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
