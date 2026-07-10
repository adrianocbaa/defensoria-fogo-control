import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from './StatusBadge';
import {
  calcPinColor,
  getLicenseStatus,
  getExtinguisherStatus,
  getNextAction,
  nextActionColorClass,
} from '@/lib/nucleusStatus';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Droplets, Flame, ShieldCheck, Phone, Mail } from 'lucide-react';

interface NucleusDetailsDrawerProps {
  nucleoId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface DrawerData {
  nome: string;
  cidade: string;
  endereco: string | null;
  telefones: string | null;
  email: string | null;
  licenseValidUntil: string | null;
  lastInspection: string | null;
  hydrantsCount: number;
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
        const [basicRes, nucleiRes, extRes, hydRes] = await Promise.all([
          supabase
            .from('nucleos_central')
            .select('nome, cidade, endereco, telefones, email')
            .eq('id', nucleoId)
            .maybeSingle(),
          supabase
            .from('nuclei')
            .select('fire_department_license_valid_until')
            .eq('id', nucleoId)
            .maybeSingle(),
          supabase
            .from('fire_extinguishers')
            .select('expiration_date, hydrostatic_test, last_inspection')
            .eq('nucleus_id', nucleoId),
          supabase
            .from('hydrants')
            .select('id', { count: 'exact', head: true })
            .eq('nucleus_id', nucleoId),
        ]);
        if (cancelled) return;

        const ext = (extRes.data || []) as Array<{
          expiration_date: string | null;
          hydrostatic_test: string | null;
          last_inspection: string | null;
        }>;

        const insp = ext.map((e) => e.last_inspection).filter(Boolean) as string[];
        const hydro = ext.map((e) => e.hydrostatic_test).filter(Boolean) as string[];
        const source = insp.length ? insp : hydro;
        const lastInspection = source.length ? source.sort().reverse()[0] : null;

        setData({
          nome: basicRes.data?.nome || 'Núcleo',
          cidade: basicRes.data?.cidade || '',
          endereco: basicRes.data?.endereco ?? null,
          telefones: basicRes.data?.telefones ?? null,
          email: basicRes.data?.email ?? null,
          licenseValidUntil: nucleiRes.data?.fire_department_license_valid_until ?? null,
          lastInspection,
          hydrantsCount: hydRes.count ?? 0,
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

  // Preventivo status pills
  const hasHydrants = (data?.hydrantsCount ?? 0) > 0;
  const extCount = data?.extinguishers.length ?? 0;
  const licenseStatus = getLicenseStatus(data?.licenseValidUntil);
  const expiredExt = (data?.extinguishers ?? []).filter(
    (e) => getExtinguisherStatus(e.expiration_date) === 'expired',
  ).length;

  const hydrantPill = hasHydrants
    ? { label: `${data!.hydrantsCount} hidrante(s)`, tone: 'ok' as const }
    : { label: 'Sem hidrante', tone: 'bad' as const };

  const extPill =
    extCount === 0
      ? { label: '0 extintor(es)', tone: 'bad' as const }
      : expiredExt > 0
        ? { label: `${extCount} extintor(es) — ${expiredExt} vencido(s)`, tone: 'bad' as const }
        : { label: `${extCount} extintor(es)`, tone: 'ok' as const };

  const licensePill =
    licenseStatus === null
      ? { label: 'Sem Alvará', tone: 'bad' as const }
      : licenseStatus === 'expired'
        ? { label: 'Alvará vencido', tone: 'bad' as const }
        : licenseStatus === 'expiring-soon'
          ? { label: 'Alvará vencendo', tone: 'warn' as const }
          : { label: 'Alvará válido', tone: 'ok' as const };

  const toneClass = (t: 'ok' | 'warn' | 'bad') =>
    t === 'ok'
      ? 'text-success'
      : t === 'warn'
        ? 'text-warning'
        : 'text-destructive';

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

              <div className="mt-6 space-y-5">
                {data.endereco && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> Endereço
                    </p>
                    <p className="mt-1 text-sm text-foreground whitespace-pre-line">
                      {data.endereco}
                    </p>
                  </div>
                )}

                <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className={`flex items-center gap-2 text-sm font-medium ${toneClass(hydrantPill.tone)}`}>
                    <Droplets className="h-4 w-4" />
                    <span>{hydrantPill.label}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-sm font-medium ${toneClass(extPill.tone)}`}>
                    <Flame className="h-4 w-4" />
                    <span>{extPill.label}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-sm font-medium ${toneClass(licensePill.tone)}`}>
                    <ShieldCheck className="h-4 w-4" />
                    <span>{licensePill.label}</span>
                  </div>
                </div>

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

                {(data.telefones || data.email) && (
                  <div className="space-y-3 border-t border-border/60 pt-4">
                    {data.telefones && (
                      <div className="flex items-start gap-2 text-sm">
                        <Phone className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Telefones
                          </p>
                          <p className="text-foreground whitespace-pre-line">{data.telefones}</p>
                        </div>
                      </div>
                    )}
                    {data.email && (
                      <div className="flex items-start gap-2 text-sm">
                        <Mail className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            E-mail
                          </p>
                          <a
                            href={`mailto:${data.email}`}
                            className="text-foreground underline-offset-2 hover:underline break-all"
                          >
                            {data.email}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
