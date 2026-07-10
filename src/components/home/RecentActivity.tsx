export function RecentActivity() {
  // Sem fonte de dados real ainda — exibe estado vazio, sem inventar registros.
  return (
    <div className="rounded-2xl border border-home-border bg-home-surface p-6">
      <h3 className="text-base font-semibold text-foreground">
        Atividade recente
      </h3>
      <div className="mt-4 flex min-h-[140px] items-center justify-center rounded-xl bg-home-bg text-sm text-home-muted">
        Nenhuma atividade recente
      </div>
    </div>
  );
}
