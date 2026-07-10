import { ModuleCard } from './ModuleCard';
import type { ModuleDef } from './modulesConfig';

interface ModuleGridProps {
  modules: ModuleDef[];
  emptyLabel?: string;
}

export function ModuleGrid({ modules, emptyLabel }: ModuleGridProps) {
  return (
    <section aria-labelledby="modules-title">
      <h2
        id="modules-title"
        className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-home-muted"
      >
        Módulos do sistema
      </h2>

      {modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-home-border bg-home-surface p-10 text-center text-sm text-home-muted">
          {emptyLabel ?? 'Nenhum módulo disponível para seu perfil.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map((m) => (
            <ModuleCard key={m.id} module={m} />
          ))}
        </div>
      )}
    </section>
  );
}
