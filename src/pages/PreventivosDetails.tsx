import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Mail,
  Phone,
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PreventivosLayout } from '@/components/preventivos/PreventivosLayout';
import { PreventivosPageHeader } from '@/components/preventivos/PreventivosPageHeader';
import { StatusBadge } from '@/components/preventivos/StatusBadge';
import { DeleteNucleusDialog } from '@/components/preventivos/DeleteNucleusDialog';
import { calcPinColor, getExtinguisherStatus, getLicenseStatus } from '@/lib/nucleusStatus';
import { cn } from '@/lib/utils';

interface NucleoBasico {
  id: string;
  nome: string;
  cidade: string;
  endereco: string;
  telefones: string | null;
  email: string | null;
}

interface Extinguisher {
  id: string;
  type: string;
  capacity: string | null;
  location: string;
  expiration_date: string;
  hydrostatic_test: string | null;
}

interface DocumentRow {
  id: string;
  name: string;
  type: string;
  url: string;
  uploaded_at: string;
  size: number | null;
}

const extinguisherTypeLabels: Record<string, string> = {
  H2O: 'Água',
  PQS: 'Pó Químico Seco',
  CO2: 'CO₂',
  ABC: 'Multipropósito ABC',
};

const documentTypeLabels: Record<string, string> = {
  project: 'Projeto',
  'fire-license': 'Alvará',
  photos: 'Fotos',
  report: 'Relatório',
};

function fmt(d?: string | null) {
  if (!d) return null;
  try {
    return format(parseISO(d), 'dd/MM/yyyy');
  } catch {
    return null;
  }
}

function humanSize(bytes?: number | null) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function PreventivosDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit, isAdmin } = useUserRole();

  const [globalSearch, setGlobalSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [nucleo, setNucleo] = useState<NucleoBasico | null>(null);
  const [licenseValidUntil, setLicenseValidUntil] = useState<string | null>(null);
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [basic, prev, ext, docs] = await Promise.all([
          supabase.from('nucleos_central').select('id, nome, cidade, endereco, telefones, email').eq('id', id).maybeSingle(),
          supabase.from('nuclei').select('fire_department_license_valid_until').eq('id', id).maybeSingle(),
          supabase.from('fire_extinguishers').select('id, type, capacity, location, expiration_date, hydrostatic_test').eq('nucleus_id', id).order('location'),
          supabase.from('documents').select('id, name, type, url, uploaded_at, size').eq('nucleus_id', id).order('uploaded_at', { ascending: false }),
        ]);
        if (cancelled) return;
        setNucleo((basic.data as NucleoBasico) ?? null);
        setLicenseValidUntil(prev.data?.fire_department_license_valid_until ?? null);
        setExtinguishers((ext.data as Extinguisher[]) || []);
        setDocuments((docs.data as DocumentRow[]) || []);
      } catch (err) {
        console.error(err);
        toast({ title: 'Erro ao carregar dados do núcleo', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  const color = calcPinColor({ licenseValidUntil, extinguishers });
  const licenseStatus = getLicenseStatus(licenseValidUntil);

  const handleView = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
  const handleDownload = (row: DocumentRow) => {
    const a = window.document.createElement('a');
    a.href = row.url;
    a.download = row.name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  return (
    <PreventivosLayout
      header={({ openMenu }) => (
        <PreventivosPageHeader
          onOpenMenu={openMenu}
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
        />
      )}
    >
      <div className="mx-auto w-full max-w-[1440px]">
        {/* Breadcrumb + Voltar */}
        <div className="mb-4">
          <p className="text-[13px] text-home-muted">
            Dashboard / Preventivos {nucleo ? `/ ${nucleo.nome}` : ''}
          </p>
          <button
            type="button"
            onClick={() => navigate('/preventivos')}
            className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-success hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-12 w-2/3" />
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        ) : !nucleo ? (
          <div className="rounded-xl border border-home-border bg-card p-10 text-center">
            <h2 className="mb-3 text-xl font-bold">Núcleo não encontrado</h2>
            <Button onClick={() => navigate('/preventivos')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Preventivos
            </Button>
          </div>
        ) : (
          <>
            {/* Header do conteúdo */}
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    {nucleo.nome}
                  </h1>
                  <StatusBadge status={color} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {nucleo.cidade}
                  {nucleo.endereco ? ` - ${nucleo.endereco}` : ''}
                </p>
              </div>

              {canEdit && (
                <div className="flex shrink-0 items-center gap-3">
                  <Button
                    variant="outline"
                    className="h-11 border-success/40 text-success hover:bg-success/10 hover:text-success"
                    onClick={() => navigate(`/preventivos/${id}/editar`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="h-11 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Duas colunas */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Coluna esquerda: contato + alvará */}
              <div className="space-y-6">
                <section className="rounded-xl border border-home-border bg-card p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-foreground">Informações de Contato</h2>
                  {nucleo.telefones || nucleo.email ? (
                    <div className="space-y-3">
                      {nucleo.telefones && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{nucleo.telefones}</span>
                        </div>
                      )}
                      {nucleo.email && (
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="break-all text-foreground">{nucleo.email}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Não informado</p>
                  )}
                </section>

                <section className="rounded-xl border border-home-border bg-card p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-foreground">Alvará do Corpo de Bombeiros</h2>
                  {!licenseValidUntil ? (
                    <p className="text-sm text-muted-foreground">Sem alvará cadastrado</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full',
                            licenseStatus === 'expired' && 'bg-destructive/15 text-destructive',
                            licenseStatus === 'expiring-soon' && 'bg-warning/15 text-warning',
                            licenseStatus === 'valid' && 'bg-success/15 text-success',
                          )}
                        >
                          {licenseStatus === 'valid' ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : licenseStatus === 'expiring-soon' ? (
                            <Clock className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                        </span>
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            licenseStatus === 'expired' && 'text-destructive',
                            licenseStatus === 'expiring-soon' && 'text-warning',
                            licenseStatus === 'valid' && 'text-success',
                          )}
                        >
                          {licenseStatus === 'valid'
                            ? 'Alvará válido'
                            : licenseStatus === 'expiring-soon'
                              ? 'Alvará vencendo'
                              : 'Alvará vencido'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 pl-9 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Válido até: <strong className="text-foreground">{fmt(licenseValidUntil)}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* Coluna direita: extintores */}
              <section className="rounded-xl border border-home-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">Extintores de Incêndio</h2>
                  <span className="inline-flex min-w-[28px] items-center justify-center rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                    {extinguishers.length}
                  </span>
                </div>

                {extinguishers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-home-border p-6 text-center text-sm text-muted-foreground">
                    Nenhum extintor cadastrado
                    {canEdit && (
                      <div className="mt-3">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/preventivos/${id}/editar`)}>
                          Adicionar extintor
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-home-border">
                    {extinguishers.map((e) => {
                      const status = getExtinguisherStatus(e.expiration_date);
                      const label = extinguisherTypeLabels[e.type] || e.type;
                      return (
                        <li key={e.id} className="py-4 first:pt-0 last:pb-0">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-base font-bold text-foreground">
                              {label}
                              {e.capacity ? ` ${e.capacity}` : ''}
                            </p>
                            {status !== 'valid' && (
                              <span
                                className={cn(
                                  'text-[11px] font-bold uppercase tracking-wider',
                                  status === 'expired' ? 'text-destructive' : 'text-warning',
                                )}
                              >
                                {status === 'expired' ? 'Vencido' : 'Vencendo'}
                              </span>
                            )}
                          </div>
                          <p className="mb-2 text-sm text-muted-foreground">{e.location}</p>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              Vencimento: {fmt(e.expiration_date)}
                            </span>
                            {e.hydrostatic_test && (
                              <span className="inline-flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5" />
                                Teste Hidrostático: {fmt(e.hydrostatic_test)}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            {/* Documentos */}
            <section className="mt-6 rounded-xl border border-home-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Documentos</h2>
                <span className="inline-flex min-w-[28px] items-center justify-center rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                  {documents.length}
                </span>
              </div>

              {documents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-home-border p-6 text-center text-sm text-muted-foreground">
                  Nenhum documento cadastrado
                  {canEdit && (
                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/preventivos/${id}/editar`)}>
                        Adicionar documento
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <ul className="space-y-3">
                  {documents.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-col gap-3 rounded-lg border border-home-border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                          <FileText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              {documentTypeLabels[d.type] || d.type}
                            </span>
                            <span>Enviado em: {fmt(d.uploaded_at)}</span>
                            {humanSize(d.size) && <span>• {humanSize(d.size)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleView(d.url)}>
                          <Eye className="mr-1.5 h-4 w-4" />
                          Visualizar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownload(d)}>
                          <Download className="mr-1.5 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {nucleo && (
        <DeleteNucleusDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          nucleoId={nucleo.id}
          nucleoName={nucleo.nome}
          onDeleted={() => navigate('/preventivos')}
        />
      )}
    </PreventivosLayout>
  );
}
