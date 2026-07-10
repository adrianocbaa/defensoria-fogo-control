import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from './StatusBadge';
import { calcPinColor, getNextAction, nextActionColorClass } from '@/lib/nucleusStatus';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';

interface NucleusDetailsDrawerProps {
  nucleoId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface DrawerData {
  nome: string;
  cidade: string;
  licenseValidUntil: string | null;
  lastInspection: string | null;
  extinguishers: Array<{ expiration_date: string | null; hydrostatic_test?: string | null }>;
}

function formatDate(d?: string | null) {
  if (!d) return null;
  try {
    return format(parseISO(d), 'dd/MM/yyyy');
  } catch {
    return null;
  }
}

export function NucleusDetailsDrawer({ nucleoId, open, onOpenChange }: NucleusDetailsDrawerProps) {
  const navigate = useNavigate();
  const { canEdit } = useUserRole();
  const [data, setData] = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!nucleoId || !open) {
      setData(null);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const [basicRes, nucleiRes, extRes] = await Promise.all([
          supabase.from('nucleos_central').select('nome, cidade').eq('id', nucleoId).maybeSingle(),
          supabase
            .from('nuclei')
            .select('fire_department_license_valid_until')
            .eq('id', nucleoId)
            .maybeSingle(),
          supabase
            .from('fire_extinguishers')
            .select('expiration_date, hydrostatic_test, last_inspection')
            .eq('nucleus_id', nucleoId),
        ]);
        if (cancelled) return;

        const ext = (extRes.data || []) as Array<{
          expiration_date: string | null;
          hydrostatic_test: string | null;
          last_inspection: string | null;
        }>;

        // Última inspeção = maior last_inspection; fallback: maior hydrostatic_test
        const insp = ext.map((e) => e.last_inspection).filter(Boolean) as string[];
        const hydro = ext.map((e) => e.hydrostatic_test).filter(Boolean) as string[];
        const source = insp.length ? insp : hydro;
        const lastInspection = source.length ? source.sort().reverse()[0] : null;

        setData({
          nome: basicRes.data?.nome || 'Núcleo',
          cidade: basicRes.data?.cidade || '',
          licenseValidUntil: nucleiRes.data?.fire_department_license_valid_until ?? null,
          lastInspection,
          extinguishers: ext,
        });
      } catch (err) {
        console.error('Erro ao carregar núcleo:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nucleoId, open]);

  const statusInputs = data
    ? { licenseValidUntil: data.licenseValidUntil, extinguishers: data.extinguishers }
    : { extinguishers: [] };
  const color = calcPinColor(statusInputs);
  const nextAction = getNextAction(statusInputs);
  const nextClass = nextActionColorClass(statusInputs);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full p-0 sm:max-w-[440px]"
        aria-describedby={undefined}
      >
        <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
          {loading || !data ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="pt-4 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <StatusBadge status={color} />
              </div>
              <h2 className="text-2xl font-bold leading-tight text-foreground">{data.nome}</h2>
              {data.cidade && <p className="mt-1 text-sm text-muted-foreground">{data.cidade}</p>}

              <div className="mt-8 space-y-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Validade do certificado
                  </p>
                  <p className="mt-1 text-base font-medium text-foreground">
                    {formatDate(data.licenseValidUntil) || 'Não informada'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Última inspeção
                  </p>
                  <p className="mt-1 text-base font-medium text-foreground">
                    {formatDate(data.lastInspection) || 'Não informada'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Próxima ação
                  </p>
                  <p className={`mt-1 text-base font-medium ${nextClass}`}>{nextAction}</p>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3 pt-8">
                <Button
                  className="h-12 w-full bg-home-sidebar-bg text-home-sidebar-active-fg hover:bg-home-sidebar-bg/90"
                  onClick={() => {
                    onOpenChange(false);
                    if (nucleoId) navigate(`/preventivos/${nucleoId}`);
                  }}
                >
                  Ver detalhes
                </Button>
                {canEdit && (
                  <Button
                    variant="outline"
                    className="h-12 w-full"
                    onClick={() => {
                      onOpenChange(false);
                      if (nucleoId) navigate(`/preventivos/${nucleoId}/editar`);
                    }}
                  >
                    Atualizar situação
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
