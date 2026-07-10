import { useMemo, useState } from 'react';
import { AppSidebar } from '@/components/home/AppSidebar';
import { DashboardHeader } from '@/components/home/DashboardHeader';
import { QuickAccess } from '@/components/home/QuickAccess';
import { ModuleGrid } from '@/components/home/ModuleGrid';
import { RecentActivity } from '@/components/home/RecentActivity';
import { PendingItems } from '@/components/home/PendingItems';
import { MODULES, QUICK_ACCESS_ORDER } from '@/components/home/modulesConfig';
import { useUserSectors } from '@/hooks/useUserSectors';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export default function MainDashboard() {
  const { sectors, loading: sectorsLoading } = useUserSectors();
  const { profile } = useProfile();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const allowedModules = useMemo(
    () => MODULES.filter((m) => sectors.includes(m.id)),
    [sectors]
  );

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allowedModules;
    return allowedModules.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [search, allowedModules]);

  const quickItems = useMemo(
    () =>
      QUICK_ACCESS_ORDER
        .map((id) => allowedModules.find((m) => m.id === id && !m.inDevelopment))
        .filter((m): m is NonNullable<typeof m> => !!m),
    [allowedModules]
  );

  const firstName = (profile?.display_name || user?.email?.split('@')[0] || 'Usuário')
    .split(' ')[0];

  if (sectorsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-home-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-home-bg">
      {/* Sidebar desktop */}
      <div className="sticky top-0 hidden h-screen w-64 shrink-0 md:block">
        <AppSidebar />
      </div>

      {/* Sidebar mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 border-0 bg-home-sidebar-bg p-0 text-home-sidebar-fg"
        >
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          searchValue={search}
          onSearchChange={setSearch}
          onOpenMenu={() => setMobileOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 py-10 md:px-12 md:py-14">
          {/* Greeting */}
          <section className="mb-12">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-foreground sm:text-3xl md:text-[36px] lg:text-[40px]">
              Olá, {firstName}. O que você deseja acessar hoje?
            </h1>
          </section>

          <div className="space-y-12">
            <QuickAccess items={quickItems} />

            <ModuleGrid
              modules={filteredModules}
              emptyLabel={
                search
                  ? `Nenhum módulo encontrado para "${search}".`
                  : 'Nenhum módulo disponível para seu perfil.'
              }
            />

            <section className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RecentActivity />
              </div>
              <PendingItems />
            </section>
          </div>
        </main>

      </div>
    </div>
  );
}
