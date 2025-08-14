import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Eye, Edit, Trash2, MapPin } from 'lucide-react';
import { CreatePropertyModal } from '@/components/appraisal/CreatePropertyModal';
import { EditPropertyModal } from '@/components/appraisal/EditPropertyModal';
import { useState, useEffect } from 'react';
import { propertiesApi, Property } from '@/services/appraisalApi';
import { toast } from '@/hooks/use-toast';

export function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const data = await propertiesApi.list();
      setProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar imóveis',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyCreated = () => {
    setShowCreateModal(false);
    fetchProperties();
    toast({
      title: 'Sucesso',
      description: 'Imóvel criado com sucesso!',
    });
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.zoning?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKind = kindFilter === 'all' || property.kind === kindFilter;
    return matchesSearch && matchesKind;
  });

  const getKindBadge = (kind: string) => {
    const config = {
      urban: { label: 'Urbano', className: 'bg-blue-100 text-blue-800' },
      rural: { label: 'Rural', className: 'bg-green-100 text-green-800' }
    };
    const kindConfig = config[kind as keyof typeof config] || config.urban;
    return <Badge className={kindConfig.className}>{kindConfig.label}</Badge>;
  };

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Imóveis"
          subtitle="Cadastro e gestão de imóveis para avaliação"
        />

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Buscar por endereço ou zoneamento..."
                className="pl-10 w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="px-3 py-2 border rounded-md"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
            >
              <option value="all">Todos os tipos</option>
              <option value="urban">Urbano</option>
              <option value="rural">Rural</option>
            </select>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Imóvel
          </Button>
        </div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">Listagem</TabsTrigger>
            <TabsTrigger value="map">Mapa</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Imóveis Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Carregando...</div>
                ) : filteredProperties.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      {properties.length === 0 ? 'Nenhum imóvel cadastrado.' : 'Nenhum imóvel encontrado com os filtros aplicados.'}
                    </p>
                    <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Cadastrar Primeiro Imóvel
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endereço</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Área Terreno</TableHead>
                        <TableHead>Área Construída</TableHead>
                        <TableHead>Qualidade</TableHead>
                        <TableHead>Idade</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProperties.map((property) => (
                        <TableRow key={property.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {property.address || 'Endereço não informado'}
                            </div>
                          </TableCell>
                          <TableCell>{getKindBadge(property.kind)}</TableCell>
                          <TableCell>{property.land_area ? `${property.land_area} m²` : 'N/A'}</TableCell>
                          <TableCell>{property.built_area ? `${property.built_area} m²` : 'N/A'}</TableCell>
                          <TableCell>{property.quality || 'N/A'}</TableCell>
                          <TableCell>{property.age ? `${property.age} anos` : 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <EditPropertyModal 
                                property={property}
                                onSuccess={() => fetchProperties()}
                              />
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="map" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mapa de Imóveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Visualização em mapa será implementada em breve.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showCreateModal && (
          <CreatePropertyModal 
            onSuccess={(property) => {
              handlePropertyCreated();
              setShowCreateModal(false);
            }}
          />
        )}
      </div>
    </SimpleHeader>
  );
}

export default PropertiesPage;