import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Plus, X, MapPin, Shield, Target, Droplets, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { DocumentUpload } from '@/components/DocumentUpload';

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

interface Document {
  id?: string;
  name: string;
  type: string;
  url: string;
  uploaded_at?: string;
  size?: number;
}

export default function PreventivosEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nucleoBasico, setNucleoBasico] = useState<NucleoBasico | null>(null);
  
  // Alvará
  const [hasAVCB, setHasAVCB] = useState(false);
  const [avcbDate, setAvcbDate] = useState('');
  const [avcbDocumentUrl, setAvcbDocumentUrl] = useState('');
  
  // Extintores
  const [extinguishers, setExtinguishers] = useState<FireExtinguisher[]>([]);
  
  // Hidrantes
  const [hydrants, setHydrants] = useState<Hydrant[]>([]);
  
  // Documentos
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar informações básicas (somente leitura)
      const { data: basicData, error: basicError } = await supabase
        .from('nucleos_central')
        .select('id, nome, endereco, cidade, telefones, email')
        .eq('id', id)
        .maybeSingle();

      if (basicError) throw basicError;
      setNucleoBasico(basicData);

      // Buscar alvará
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

      // Buscar extintores
      const { data: extData } = await supabase
        .from('fire_extinguishers')
        .select('*')
        .eq('nucleus_id', id)
        .order('location');

      setExtinguishers(extData || []);

      // Buscar hidrantes
      const { data: hydData } = await supabase
        .from('hydrants')
        .select('*')
        .eq('nucleus_id', id);

      setHydrants((hydData || []).map(h => ({
        ...h,
        status: h.status as 'verified' | 'not_verified'
      })));

      // Buscar documentos
      const { data: docData } = await supabase
        .from('documents')
        .select('*')
        .eq('nucleus_id', id)
        .order('uploaded_at', { ascending: false });

      setDocuments(docData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);

      // Atualizar ou criar registro em nuclei
      const nucleiRecord = {
        id: id,
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
        await supabase
          .from('nuclei')
          .update(nucleiRecord)
          .eq('id', id);
      } else {
        await supabase.from('nuclei').insert(nucleiRecord);
      }

      // Salvar extintores - deletar todos e recriar
      await supabase.from('fire_extinguishers').delete().eq('nucleus_id', id);
      
      if (extinguishers.length > 0) {
        const extinguishersToInsert = extinguishers.map(ext => ({
          nucleus_id: id,
          type: ext.type,
          location: ext.location,
          capacity: ext.capacity || null,
          expiration_date: ext.expiration_date,
          hydrostatic_test: ext.hydrostatic_test || null,
          support_type: ext.support_type || null,
          has_vertical_signage: ext.has_vertical_signage || false,
          status: getExtinguisherStatus(ext.expiration_date) as 'valid' | 'expiring-soon' | 'expired',
        }));
        
        await supabase.from('fire_extinguishers').insert(extinguishersToInsert);
      }

      // Salvar hidrantes - deletar todos e recriar
      await supabase.from('hydrants').delete().eq('nucleus_id', id);
      
      if (hydrants.length > 0) {
        const hydrantsToInsert = hydrants.map(hyd => ({
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

      // Salvar documentos - deletar todos e recriar
      await supabase.from('documents').delete().eq('nucleus_id', id);
      
      if (documents.length > 0) {
        const documentsToInsert = documents.map(doc => ({
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
      toast({
        title: 'Erro ao salvar',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getExtinguisherStatus = (expirationDate: string) => {
    const now = new Date();
    const expDate = new Date(expirationDate);
    const twoMonthsFromNow = new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000));

    if (expDate < now) return 'expired';
    if (expDate <= twoMonthsFromNow) return 'expiring-soon';
    return 'valid';
  };

  // Funções para Extintores
  const addExtinguisher = () => {
    setExtinguishers([...extinguishers, {
      type: 'ABC',
      location: '',
      capacity: '',
      expiration_date: format(new Date(), 'yyyy-MM-dd'),
      hydrostatic_test: null,
      support_type: null,
      has_vertical_signage: false,
    }]);
  };

  const removeExtinguisher = (index: number) => {
    setExtinguishers(extinguishers.filter((_, i) => i !== index));
  };

  const updateExtinguisher = (index: number, field: keyof FireExtinguisher, value: any) => {
    const updated = [...extinguishers];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-set capacity for H2O
    if (field === 'type' && value === 'H2O') {
      updated[index].capacity = '10L';
    }
    
    setExtinguishers(updated);
  };

  // Funções para Hidrantes
  const addHydrant = () => {
    setHydrants([...hydrants, {
      location: '',
      status: 'not_verified',
      hose_expiration_date: null,
      has_register: false,
      has_hose: false,
      has_key: false,
      has_coupling: false,
      has_adapter: false,
      has_nozzle: false,
    }]);
  };

  const removeHydrant = (index: number) => {
    setHydrants(hydrants.filter((_, i) => i !== index));
  };

  const updateHydrant = (index: number, field: keyof Hydrant, value: any) => {
    const updated = [...hydrants];
    updated[index] = { ...updated[index], [field]: value };
    setHydrants(updated);
  };

  // Funções para Documentos
  const addDocumentFromUpload = (newDocument: any) => {
    setDocuments([...documents, newDocument]);
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-6 lg:px-8 py-8">
          <p>Carregando...</p>
        </div>
      </SimpleHeader>
    );
  }

  if (!nucleoBasico) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-6 lg:px-8 py-8">
          <p>Núcleo não encontrado</p>
        </div>
      </SimpleHeader>
    );
  }

  return (
    <SimpleHeader>
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 lg:px-8 py-4 lg:py-6">
          <PageHeader
            title="Editar Dados de Preventivos"
            subtitle={nucleoBasico.nome}
            actions={
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/preventivos/${id}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            }
          />
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas - Somente Leitura */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Informações Básicas (Somente Leitura)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Núcleo</Label>
                  <Input value={nucleoBasico.nome} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={nucleoBasico.cidade} disabled className="bg-muted" />
                </div>
                <div className="md:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={nucleoBasico.endereco} disabled className="bg-muted" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Estas informações não podem ser editadas neste módulo. Para alterá-las, use a página de edição central do núcleo.
              </p>
            </CardContent>
          </Card>

          {/* Alvará do Corpo de Bombeiros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Alvará do Corpo de Bombeiros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasAVCB"
                  checked={hasAVCB}
                  onCheckedChange={(checked) => setHasAVCB(checked as boolean)}
                />
                <Label htmlFor="hasAVCB">Possui Alvará do Corpo de Bombeiros (AVCB)</Label>
              </div>

              {hasAVCB && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <div>
                    <Label htmlFor="avcbDate">Data de Validade</Label>
                    <Input
                      id="avcbDate"
                      type="date"
                      value={avcbDate}
                      onChange={(e) => setAvcbDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extintores de Incêndio */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Extintores de Incêndio ({extinguishers.length})
                </CardTitle>
                <Button type="button" onClick={addExtinguisher} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Extintor
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {extinguishers.map((ext, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Extintor {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExtinguisher(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo</Label>
                      <select
                        value={ext.type}
                        onChange={(e) => updateExtinguisher(index, 'type', e.target.value)}
                        className="w-full p-2 border border-border rounded-md bg-background"
                      >
                        <option value="ABC">ABC - Multipropósito</option>
                        <option value="H2O">H2O - Água</option>
                        <option value="PQS">PQS - Pó Químico Seco</option>
                        <option value="CO2">CO2 - Gás Carbônico</option>
                      </select>
                    </div>

                    <div>
                      <Label>Capacidade</Label>
                      {ext.type === 'H2O' ? (
                        <Input value="10L" readOnly className="bg-muted" />
                      ) : (
                        <select
                          value={ext.capacity}
                          onChange={(e) => updateExtinguisher(index, 'capacity', e.target.value)}
                          className="w-full p-2 border border-border rounded-md bg-background"
                        >
                          <option value="">Selecione a capacidade</option>
                          <option value="4kg">4kg</option>
                          <option value="6kg">6kg</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <Label>Local de Instalação</Label>
                      <Input
                        value={ext.location}
                        onChange={(e) => updateExtinguisher(index, 'location', e.target.value)}
                        placeholder="Ex: Recepção, Sala de Informática"
                      />
                    </div>

                    <div>
                      <Label>Data de Vencimento</Label>
                      <Input
                        type="date"
                        value={ext.expiration_date}
                        onChange={(e) => updateExtinguisher(index, 'expiration_date', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Teste Hidrostático</Label>
                      <Input
                        type="date"
                        value={ext.hydrostatic_test || ''}
                        onChange={(e) => updateExtinguisher(index, 'hydrostatic_test', e.target.value || null)}
                      />
                    </div>

                    <div>
                      <Label>Tipo de Suporte</Label>
                      <select
                        value={ext.support_type || ''}
                        onChange={(e) => updateExtinguisher(index, 'support_type', e.target.value || null)}
                        className="w-full p-2 border border-border rounded-md bg-background"
                      >
                        <option value="">Selecionar suporte</option>
                        <option value="wall">Parede</option>
                        <option value="tripod">Tripé</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={ext.has_vertical_signage}
                          onCheckedChange={(checked) => updateExtinguisher(index, 'has_vertical_signage', checked)}
                        />
                        <Label>Possui Sinalização Vertical</Label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Hidrantes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-5 w-5" />
                  Hidrantes ({hydrants.length})
                </CardTitle>
                <Button type="button" onClick={addHydrant} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Hidrante
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {hydrants.map((hyd, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Hidrante {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHydrant(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Local de Instalação</Label>
                      <Input
                        value={hyd.location}
                        onChange={(e) => updateHydrant(index, 'location', e.target.value)}
                        placeholder="Ex: Entrada Principal, Corredor A"
                      />
                    </div>

                    <div>
                      <Label>Status</Label>
                      <select
                        value={hyd.status}
                        onChange={(e) => updateHydrant(index, 'status', e.target.value)}
                        className="w-full p-2 border border-border rounded-md bg-background"
                      >
                        <option value="verified">Verificado</option>
                        <option value="not_verified">Não Verificado</option>
                      </select>
                    </div>

                    <div>
                      <Label>Validade da Mangueira (Opcional)</Label>
                      <Input
                        type="date"
                        value={hyd.hose_expiration_date || ''}
                        onChange={(e) => updateHydrant(index, 'hose_expiration_date', e.target.value || null)}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium mb-3 block">Acessórios</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hyd.has_register}
                          onCheckedChange={(checked) => updateHydrant(index, 'has_register', checked)}
                        />
                        <Label className="text-sm">Registro</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hyd.has_hose}
                          onCheckedChange={(checked) => updateHydrant(index, 'has_hose', checked)}
                        />
                        <Label className="text-sm">Mangueira</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hyd.has_key}
                          onCheckedChange={(checked) => updateHydrant(index, 'has_key', checked)}
                        />
                        <Label className="text-sm">Chave</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hyd.has_coupling}
                          onCheckedChange={(checked) => updateHydrant(index, 'has_coupling', checked)}
                        />
                        <Label className="text-sm">Engate (Storz)</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hyd.has_adapter}
                          onCheckedChange={(checked) => updateHydrant(index, 'has_adapter', checked)}
                        />
                        <Label className="text-sm">Adaptador</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hyd.has_nozzle}
                          onCheckedChange={(checked) => updateHydrant(index, 'has_nozzle', checked)}
                        />
                        <Label className="text-sm">Esguicho</Label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos ({documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DocumentUpload onDocumentAdd={addDocumentFromUpload} />

              {documents.map((doc, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.type}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/preventivos/${id}`)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </SimpleHeader>
  );
}
