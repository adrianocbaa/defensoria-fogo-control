import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PreventivosLayout, SidebarMenuButton } from '@/components/preventivos/PreventivosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Copy,
  Bell,
  Search,
  Info,
  Flame,
  Droplets,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { DocumentUpload } from '@/components/DocumentUpload';
import { useUserRole } from '@/hooks/useUserRole';
import { useObraNotifications } from '@/hooks/useObraNotifications';

interface NucleoBasico {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  telefones: string | null;
  email: string | null;
}

interface FireExtinguisher {
  id?: string;
  type: 'H2O' | 'PQS' | 'CO2' | 'ABC';
  location: string;
  capacity: string;
  expiration_date: string;
  hydrostatic_test: string | null;
  support_type: string | null;
  has_vertical_signage: boolean;
}

interface Hydrant {
  id?: string;
  location: string;
  status: 'verified' | 'not_verified';
  hose_expiration_date: string | null;
  has_register: boolean;
  has_hose: boolean;
  has_key: boolean;
  has_coupling: boolean;
  has_adapter: boolean;
  has_nozzle: boolean;
}

interface DocumentItem {
  id?: string;
  name: string;
  type: string;
  url: string;
  uploaded_at?: string;
  size?: number;
}

/* -------------------------------------------------------------------------- */
/*  Small presentational helpers                                              */
/* -------------------------------------------------------------------------- */

function SectionCard({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-home-border bg-home-surface shadow-sm">
      <header className="flex items-center justify-between gap-3 px-5 py-4 md:px-6 md:py-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {typeof count === 'number' && (
            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-home-bg px-2 text-xs font-medium text-home-muted">
              {count}
            </span>
          )}
        </div>
        {action}
      </header>
      <div className="px-5 pb-5 md:px-6 md:pb-6">{children}</div>
    </section>
  );
}

function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-home-border px-4 py-10 text-center">
      <p className="text-sm text-home-muted">{message}</p>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function PreventivosEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit } = useUserRole();
  const { unreadCount, markAllAsRead } = useObraNotifications();
  const [globalSearch, setGlobalSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nucleoBasico, setNucleoBasico] = useState<NucleoBasico | null>(null);

  const [hasAVCB, setHasAVCB] = useState(false);
  const [avcbDate, setAvcbDate] = useState('');
  const [avcbDocumentUrl, setAvcbDocumentUrl] = useState('');

  const [extinguishers, setExtinguishers] = useState<FireExtinguisher[]>([]);
  const [hydrants, setHydrants] = useState<Hydrant[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: basicData, error: basicError } = await supabase
        .from('nucleos_central')
        .select('id, nome, endereco, cidade, telefones, email')
        .eq('id', id)
        .maybeSingle();
      if (basicError) throw basicError;
      setNucleoBasico(basicData);

      const { data: nucleiData } = await supabase
        .from('nuclei')
        .select('fire_department_license_valid_until, fire_department_license_document_url')
        .eq('id', id)
        .maybeSingle();
      if (nucleiData) {
        setHasAVCB(!!nucleiData.fire_department_license_valid_until);
        setAvcbDate(nucleiData.fire_department_license_valid_until || '');
        setAvcbDocumentUrl(nucleiData.fire_department_license_document_url || '');
      }

      const { data: extData } = await supabase
        .from('fire_extinguishers')
        .select('*')
        .eq('nucleus_id', id)
        .order('location');
      setExtinguishers(extData || []);

      const { data: hydData } = await supabase
        .from('hydrants')
        .select('*')
        .eq('nucleus_id', id);
      setHydrants(
        (hydData || []).map((h) => ({
          ...h,
          status: h.status as 'verified' | 'not_verified',
        }))
      );

      const { data: docData } = await supabase
        .from('documents')
        .select('*')
        .eq('nucleus_id', id)
        .order('uploaded_at', { ascending: false });
      setDocuments(docData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      const nucleiRecord = {
        id,
        name: nucleoBasico?.nome,
        city: nucleoBasico?.cidade,
        address: nucleoBasico?.endereco,
        fire_department_license_valid_until: hasAVCB ? avcbDate : null,
        fire_department_license_document_url: hasAVCB ? avcbDocumentUrl : null,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('nuclei')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (existing) {
        await supabase.from('nuclei').update(nucleiRecord).eq('id', id);
      } else {
        await supabase.from('nuclei').insert(nucleiRecord);
      }

      await supabase.from('fire_extinguishers').delete().eq('nucleus_id', id);
      if (extinguishers.length > 0) {
        const extinguishersToInsert = extinguishers.map((ext) => ({
          nucleus_id: id,
          type: ext.type,
          location: ext.location,
          capacity: ext.capacity || null,
          expiration_date: ext.expiration_date,
          hydrostatic_test: ext.hydrostatic_test || null,
          support_type: ext.support_type || null,
          has_vertical_signage: ext.has_vertical_signage || false,
          status: getExtinguisherStatus(ext.expiration_date) as
            | 'valid'
            | 'expiring-soon'
            | 'expired',
        }));
        await supabase.from('fire_extinguishers').insert(extinguishersToInsert);
      }

      await supabase.from('hydrants').delete().eq('nucleus_id', id);
      if (hydrants.length > 0) {
        const hydrantsToInsert = hydrants.map((hyd) => ({
          nucleus_id: id,
          location: hyd.location,
          status: hyd.status,
          hose_expiration_date: hyd.hose_expiration_date,
          has_register: hyd.has_register,
          has_hose: hyd.has_hose,
          has_key: hyd.has_key,
          has_coupling: hyd.has_coupling,
          has_adapter: hyd.has_adapter,
          has_nozzle: hyd.has_nozzle,
        }));
        await supabase.from('hydrants').insert(hydrantsToInsert);
      }

      await supabase.from('documents').delete().eq('nucleus_id', id);
      if (documents.length > 0) {
        const documentsToInsert = documents.map((doc) => ({
          nucleus_id: id,
          name: doc.name,
          type: doc.type as 'project' | 'fire-license' | 'photos' | 'report',
          url: doc.url,
          size: doc.size || null,
        }));
        await supabase.from('documents').insert(documentsToInsert);
      }

      toast({
        title: 'Dados salvos com sucesso',
        description: 'As informações de preventivos foram atualizadas.',
      });

      navigate(`/preventivos/${id}`);
    } catch (error) {
      console.error('Error saving data:', error);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getExtinguisherStatus = (expirationDate: string) => {
    const now = new Date();
    const expDate = new Date(expirationDate);
    const twoMonthsFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    if (expDate < now) return 'expired';
    if (expDate <= twoMonthsFromNow) return 'expiring-soon';
    return 'valid';
  };

  const addExtinguisher = () => {
    setExtinguishers([
      ...extinguishers,
      {
        type: 'ABC',
        location: '',
        capacity: '',
        expiration_date: format(new Date(), 'yyyy-MM-dd'),
        hydrostatic_test: null,
        support_type: null,
        has_vertical_signage: false,
      },
    ]);
  };

  const removeExtinguisher = (index: number) =>
    setExtinguishers(extinguishers.filter((_, i) => i !== index));

  const updateExtinguisher = (
    index: number,
    field: keyof FireExtinguisher,
    value: any
  ) => {
    const updated = [...extinguishers];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'type' && value === 'H2O') updated[index].capacity = '10L';
    setExtinguishers(updated);
  };

  const copyExtinguisher = (index: number) => {
    const extToCopy = extinguishers[index];
    setExtinguishers([
      ...extinguishers,
      {
        type: extToCopy.type,
        location: '',
        capacity: extToCopy.capacity,
        expiration_date: extToCopy.expiration_date,
        hydrostatic_test: extToCopy.hydrostatic_test,
        support_type: extToCopy.support_type,
        has_vertical_signage: extToCopy.has_vertical_signage,
      },
    ]);
  };

  const addHydrant = () =>
    setHydrants([
      ...hydrants,
      {
        location: '',
        status: 'not_verified',
        hose_expiration_date: null,
        has_register: false,
        has_hose: false,
        has_key: false,
        has_coupling: false,
        has_adapter: false,
        has_nozzle: false,
      },
    ]);

  const removeHydrant = (index: number) =>
    setHydrants(hydrants.filter((_, i) => i !== index));

  const updateHydrant = (index: number, field: keyof Hydrant, value: any) => {
    const updated = [...hydrants];
    updated[index] = { ...updated[index], [field]: value };
    setHydrants(updated);
  };

  const addDocumentFromUpload = (newDocument: any) =>
    setDocuments([...documents, newDocument]);

  const removeDocument = (index: number) =>
    setDocuments(documents.filter((_, i) => i !== index));

  const handleBell = () => {
    markAllAsRead();
    navigate('/gerenciar-obras');
  };

  const nucleoName = nucleoBasico?.nome ?? 'Núcleo';

  const renderHeader = ({ openMenu }: { openMenu: () => void }) => (
    <header className="border-b border-home-border bg-home-surface">
      <div className="flex items-start gap-3 px-4 py-5 md:px-8 md:py-6">
        <SidebarMenuButton onClick={openMenu} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-home-muted">
            <Link to="/" className="hover:underline">Dashboard</Link>
            {' / '}
            <Link to="/preventivos" className="hover:underline">Preventivos</Link>
            {' / '}
            <Link to={`/preventivos/${id}`} className="hover:underline">{nucleoName}</Link>
            {' / Editar'}
          </p>
          <button
            type="button"
            onClick={() => navigate(`/preventivos/${id}`)}
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>

        <div className="flex items-center gap-3 self-start pt-1">
          <div className="relative hidden md:block w-[280px] lg:w-[380px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-home-muted" />
            <Input
              type="search"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Pesquisar no sistema..."
              className="h-11 rounded-full border-home-border bg-home-bg pl-11 pr-5 text-[15px] focus-visible:ring-primary/40"
              aria-label="Pesquisar no sistema"
            />
          </div>
          <button
            type="button"
            onClick={handleBell}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-home-muted transition-colors hover:bg-home-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Notificações"
          >
            <Bell className="h-[20px] w-[20px]" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warning" />
            )}
          </button>
        </div>
      </div>
    </header>
  );

  if (loading) {
    return (
      <PreventivosLayout header={renderHeader}>
        <p className="text-sm text-home-muted">Carregando...</p>
      </PreventivosLayout>
    );
  }

  if (!nucleoBasico) {
    return (
      <PreventivosLayout header={renderHeader}>
        <p className="text-sm text-home-muted">Núcleo não encontrado</p>
      </PreventivosLayout>
    );
  }

  return (
    <PreventivosLayout header={renderHeader}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Editar Dados de Preventivos
          </h1>
          <p className="mt-1 text-sm text-home-muted">{nucleoBasico.nome}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <SectionCard title="Informações Básicas (Somente Leitura)">
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-home-border bg-home-bg px-4 py-3 text-sm text-home-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-home-muted" />
              <span>
                Estas informações não podem ser editadas neste módulo. Para
                alterá-las, use a página de edição central do núcleo.
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome do Núcleo</Label>
                <Input value={nucleoBasico.nome} disabled className="bg-home-bg" />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={nucleoBasico.cidade} disabled className="bg-home-bg" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Endereço</Label>
                <Input value={nucleoBasico.endereco} disabled className="bg-home-bg" />
              </div>
            </div>
          </SectionCard>

          {/* Alvará */}
          <SectionCard title="Alvará do Corpo de Bombeiros">
            <div className="flex items-center gap-3">
              <Switch
                id="hasAVCB"
                checked={hasAVCB}
                onCheckedChange={(v) => setHasAVCB(v)}
                disabled={!canEdit}
              />
              <Label htmlFor="hasAVCB" className="cursor-pointer">
                Possui Alvará do Corpo de Bombeiros (AVCB)
              </Label>
            </div>

            {hasAVCB && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="avcbDate">Data de Validade</Label>
                  <Input
                    id="avcbDate"
                    type="date"
                    value={avcbDate}
                    onChange={(e) => setAvcbDate(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="avcbUrl">
                    Link do Documento{' '}
                    <span className="text-home-muted">(opcional)</span>
                  </Label>
                  <Input
                    id="avcbUrl"
                    type="url"
                    placeholder="https://..."
                    value={avcbDocumentUrl}
                    onChange={(e) => setAvcbDocumentUrl(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                {avcbDocumentUrl && (
                  <a
                    href={avcbDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="md:col-span-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Abrir documento do alvará
                  </a>
                )}
              </div>
            )}
          </SectionCard>

          {/* Extintores */}
          <SectionCard
            title="Extintores de Incêndio"
            count={extinguishers.length}
            action={
              canEdit && extinguishers.length > 0 ? (
                <Button type="button" size="sm" onClick={addExtinguisher}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Extintor
                </Button>
              ) : null
            }
          >
            {extinguishers.length === 0 ? (
              <EmptyState
                message="Nenhum extintor cadastrado para este núcleo."
                action={
                  canEdit ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addExtinguisher}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Extintor
                    </Button>
                  ) : null
                }
              />
            ) : (
              <div className="space-y-4">
                {extinguishers.map((ext, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-home-border bg-home-bg/40 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2 font-medium text-foreground">
                        <Flame className="h-4 w-4 text-primary" />
                        Extintor {index + 1}
                      </h4>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => copyExtinguisher(index)}
                            title="Copiar extintor"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExtinguisher(index)}
                            title="Remover extintor"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Tipo</Label>
                        <select
                          value={ext.type}
                          onChange={(e) =>
                            updateExtinguisher(index, 'type', e.target.value)
                          }
                          disabled={!canEdit}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="ABC">ABC - Multipropósito</option>
                          <option value="H2O">H2O - Água</option>
                          <option value="PQS">PQS - Pó Químico Seco</option>
                          <option value="CO2">CO2 - Gás Carbônico</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Capacidade</Label>
                        {ext.type === 'H2O' ? (
                          <Input value="10L" readOnly className="bg-home-bg" />
                        ) : (
                          <select
                            value={ext.capacity}
                            onChange={(e) =>
                              updateExtinguisher(index, 'capacity', e.target.value)
                            }
                            disabled={!canEdit}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">Selecione a capacidade</option>
                            <option value="4kg">4kg</option>
                            <option value="6kg">6kg</option>
                          </select>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label>Local de Instalação</Label>
                        <Input
                          value={ext.location}
                          onChange={(e) =>
                            updateExtinguisher(index, 'location', e.target.value)
                          }
                          placeholder="Ex: Recepção, Sala de Informática"
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Data de Vencimento</Label>
                        <Input
                          type="date"
                          value={ext.expiration_date}
                          onChange={(e) =>
                            updateExtinguisher(
                              index,
                              'expiration_date',
                              e.target.value
                            )
                          }
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Teste Hidrostático</Label>
                        <Input
                          type="date"
                          value={ext.hydrostatic_test || ''}
                          onChange={(e) =>
                            updateExtinguisher(
                              index,
                              'hydrostatic_test',
                              e.target.value || null
                            )
                          }
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Tipo de Suporte</Label>
                        <select
                          value={ext.support_type || ''}
                          onChange={(e) =>
                            updateExtinguisher(
                              index,
                              'support_type',
                              e.target.value || null
                            )
                          }
                          disabled={!canEdit}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Selecionar suporte</option>
                          <option value="wall">Parede</option>
                          <option value="tripod">Tripé</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 flex items-center gap-2 pt-1">
                        <Checkbox
                          checked={ext.has_vertical_signage}
                          onCheckedChange={(checked) =>
                            updateExtinguisher(
                              index,
                              'has_vertical_signage',
                              checked
                            )
                          }
                          disabled={!canEdit}
                        />
                        <Label className="cursor-pointer">
                          Possui Sinalização Vertical
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Hidrantes */}
          <SectionCard
            title="Hidrantes"
            count={hydrants.length}
            action={
              canEdit && hydrants.length > 0 ? (
                <Button type="button" size="sm" onClick={addHydrant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Hidrante
                </Button>
              ) : null
            }
          >
            {hydrants.length === 0 ? (
              <EmptyState
                message="Nenhum hidrante cadastrado."
                action={
                  canEdit ? (
                    <Button type="button" variant="outline" onClick={addHydrant}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Hidrante
                    </Button>
                  ) : null
                }
              />
            ) : (
              <div className="space-y-4">
                {hydrants.map((hyd, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-home-border bg-home-bg/40 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2 font-medium text-foreground">
                        <Droplets className="h-4 w-4 text-primary" />
                        Hidrante {index + 1}
                      </h4>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHydrant(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Local de Instalação</Label>
                        <Input
                          value={hyd.location}
                          onChange={(e) =>
                            updateHydrant(index, 'location', e.target.value)
                          }
                          placeholder="Ex: Entrada Principal, Corredor A"
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Status</Label>
                        <select
                          value={hyd.status}
                          onChange={(e) =>
                            updateHydrant(index, 'status', e.target.value)
                          }
                          disabled={!canEdit}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="verified">Verificado</option>
                          <option value="not_verified">Não Verificado</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Validade da Mangueira (Opcional)</Label>
                        <Input
                          type="date"
                          value={hyd.hose_expiration_date || ''}
                          onChange={(e) =>
                            updateHydrant(
                              index,
                              'hose_expiration_date',
                              e.target.value || null
                            )
                          }
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-sm font-medium mb-3 block">
                        Acessórios
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          ['has_register', 'Registro'],
                          ['has_hose', 'Mangueira'],
                          ['has_key', 'Chave'],
                          ['has_coupling', 'Engate (Storz)'],
                          ['has_adapter', 'Adaptador'],
                          ['has_nozzle', 'Esguicho'],
                        ].map(([key, label]) => (
                          <div key={key} className="flex items-center gap-2">
                            <Checkbox
                              checked={hyd[key as keyof Hydrant] as boolean}
                              onCheckedChange={(checked) =>
                                updateHydrant(index, key as keyof Hydrant, checked)
                              }
                              disabled={!canEdit}
                            />
                            <Label className="text-sm cursor-pointer">{label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Documentos */}
          <SectionCard title="Documentos" count={documents.length}>
            {canEdit && <DocumentUpload onDocumentAdd={addDocumentFromUpload} />}

            {documents.length === 0 ? (
              <div className="mt-4">
                <EmptyState message="Nenhum documento enviado." />
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 rounded-lg border border-home-border bg-home-bg/40 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {doc.name}
                        </p>
                        <p className="text-xs text-home-muted">{doc.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Ver
                        </a>
                      )}
                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Ações */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => navigate(`/preventivos/${id}`)}
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Cancelar
            </button>
            {canEdit && (
              <Button type="submit" disabled={saving} size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </PreventivosLayout>
  );
}
