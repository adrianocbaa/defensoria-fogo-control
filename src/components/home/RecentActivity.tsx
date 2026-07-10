export function RecentActivity() {
  // Sem fonte de dados real ainda — exibe estado vazio, sem inventar registros.
  return (
    <div className="rounded-2xl border border-home-border bg-home-surface p-7">
      <h3 className="text-lg font-semibold text-foreground">
        Atividade recente
      </h3>
      <div className="mt-5 flex min-h-[160px] items-center justify-center rounded-xl bg-home-bg text-sm text-home-muted">
        Nenhuma atividade recente
      </div>
    </div>
  );
}

