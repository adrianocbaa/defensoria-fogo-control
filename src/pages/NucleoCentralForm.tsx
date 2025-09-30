import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNucleosCentral, NucleoCentral, useModuleVisibility } from '@/hooks/useNucleosCentral';
import { Save, X } from 'lucide-react';
import { MapSelector } from '@/components/MapSelector';
import { ModuleVisibilitySelector } from '@/components/ModuleVisibilitySelector';
import { supabase } from '@/integrations/supabase/client';

const NucleoCentralForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getNucleoById, addNucleo, updateNucleo, loading } = useNucleosCentral();
  const isEditing = !!id;
  const nucleus = isEditing && id ? getNucleoById(id) : null;

  const [formData, setFormData] = useState({
    nome: '',
    cidade: '',
    endereco: '',
    telefones: '',
    email: '',
    lat: '',
    lng: '',
  });

  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [modulesInitialized, setModulesInitialized] = useState(false);
  const { visibility, loading: visibilityLoading } = useModuleVisibility(id || '');


  useEffect(() => {
    if (nucleus) {
      setFormData({
        nome: nucleus.nome || '',
        cidade: nucleus.cidade || '',
        endereco: nucleus.endereco || '',
        telefones: nucleus.telefones || '',
        email: nucleus.email || '',
        lat: nucleus.lat?.toString() || '',
        lng: nucleus.lng?.toString() || '',
      });
    }
  }, [nucleus]);

  // Carregar visibilidade para edição OU selecionar todos para criação
  useEffect(() => {
    if (!modulesInitialized) {
      if (isEditing && visibility.length > 0) {
        // Ao editar, usar os módulos já configurados
        setSelectedModules(visibility.map((v) => v.module_key));
        setModulesInitialized(true);
      } else if (!isEditing && !visibilityLoading) {
        // Ao criar novo, não inicializar automaticamente - usuário precisa escolher
        setModulesInitialized(true);
      }
    }
  }, [visibility, isEditing, visibilityLoading, modulesInitialized]);


  const handleModuleToggle = (moduleKey: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((key) => key !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: Partial<NucleoCentral> = {
      nome: formData.nome,
      cidade: formData.cidade,
      endereco: formData.endereco,
      telefones: formData.telefones || undefined,
      email: formData.email || undefined,
      lat: formData.lat ? parseFloat(formData.lat) : undefined,
      lng: formData.lng ? parseFloat(formData.lng) : undefined,
    };

    try {
      let nucleoId = id;
      
      if (isEditing && id) {
        await updateNucleo(id, data);
      } else {
        const newNucleo = await addNucleo(data as Omit<NucleoCentral, 'id' | 'created_at' | 'updated_at'>);
        nucleoId = newNucleo.id;
      }

      // Atualizar visibilidade dos módulos
      if (nucleoId) {
        // Deletar todas as visibilidades existentes
        await supabase
          .from('nucleo_module_visibility')
          .delete()
          .eq('nucleo_id', nucleoId);

        // Inserir as novas visibilidades
        if (selectedModules.length > 0) {
          const visibilityData = selectedModules.map((moduleKey) => ({
            nucleo_id: nucleoId,
            module_key: moduleKey,
          }));

          await supabase
            .from('nucleo_module_visibility')
            .insert(visibilityData);
        }
      }

      navigate('/nucleos-central');
    } catch (error) {
      console.error('Error saving nucleus:', error);
    }
  };

  return (
    <SimpleHeader>
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 lg:px-8 py-4 lg:py-6">
          <PageHeader
            title={isEditing ? 'Editar Núcleo' : 'Novo Núcleo'}
            subtitle="Preencha as informações do núcleo"
          />
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Básicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome do Núcleo *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="endereco">Endereço *</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="telefones">Telefones</Label>
                  <Input
                    id="telefones"
                    value={formData.telefones}
                    onChange={(e) => setFormData({ ...formData, telefones: e.target.value })}
                    placeholder="Ex: (65) 1234-5678 / (65) 9876-5432"
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lat">Latitude</Label>
                    <Input
                      id="lat"
                      type="number"
                      step="0.000001"
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lng">Longitude</Label>
                    <Input
                      id="lng"
                      type="number"
                      step="0.000001"
                      value={formData.lng}
                      onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                    />
                  </div>
                </div>

                <ModuleVisibilitySelector
                  selectedModules={selectedModules}
                  onModuleToggle={handleModuleToggle}
                />
              </CardContent>
            </Card>

            {/* Mapa */}
            <Card>
              <CardHeader>
                <CardTitle>Localização no Mapa</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Clique no mapa ou arraste o marcador para definir a localização
                </p>
              </CardHeader>
              <CardContent>
                <MapSelector
                  onLocationSelect={(lat, lng) =>
                    setFormData((prev) => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }))
                  }
                  initialCoordinates={formData.lat && formData.lng ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) } : undefined}
                  address={`${formData.endereco} ${formData.cidade}`.trim()}
                />
              </CardContent>
            </Card>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4 mt-6">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/nucleos-central')}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </SimpleHeader>
  );
};

export default NucleoCentralForm;
