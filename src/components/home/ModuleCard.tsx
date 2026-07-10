import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ModuleDef } from './modulesConfig';

interface ModuleCardProps {
  module: ModuleDef;
}

export function ModuleCard({ module }: ModuleCardProps) {
  const { title, category, icon: Icon, path, inDevelopment } = module;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-home-module-icon-bg">
          <Icon
            className="h-[22px] w-[22px] text-home-module-icon-fg"
            strokeWidth={1.75}
          />
        </div>
        {inDevelopment && (
          <span className="rounded-full bg-home-dev-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-home-dev-fg">
            Em desenvolvimento
          </span>
        )}
      </div>
      <div className="mt-10">
        <h3 className="text-[17px] font-semibold leading-tight text-foreground">
          {title}
        </h3>
        <p className="mt-1.5 text-sm text-home-muted">{category}</p>
      </div>
    </>
  );

  const baseClasses = cn(
    'flex h-full min-h-[176px] flex-col rounded-2xl border border-home-border bg-home-surface p-6 text-left transition-all',

    inDevelopment
      ? 'cursor-not-allowed opacity-70'
      : 'hover:-translate-y-0.5 hover:border-home-module-icon-fg/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
  );

  if (inDevelopment) {
    return (
      <div className={baseClasses} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link to={path} className={baseClasses} aria-label={`${title} — ${category}`}>
      {content}
    </Link>
  );
}
