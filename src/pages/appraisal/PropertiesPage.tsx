import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Eye, Edit, Trash2, Building, MapPin } from 'lucide-react';
import { useState } from 'react';

interface Property {
  id: string;
  address: string;
  kind: 'urban' | 'rural';
  land_area: number;
  built_area: number;
  condition: string;
  age: number;
  quality: string;
}

const mockProperties: Property[] = [
  {
    id: '1',
    address: 'Rua das Flores, 123 - Centro',
    kind: 'urban',
    land_area: 360,
    built_area: 180,
    condition: 'Bom',
    age: 15,
    quality: 'Normal'
  },
  {
    id: '2',
    address: 'Fazenda São João - Zona Rural',
    kind: 'rural',
    land_area: 50000,
    built_area: 300,
    condition: 'Excelente',
    age: 8,
    quality: 'Superior'
  }
];

const getKindBadge = (kind: Property['kind']) => {
  const kindConfig = {
    urban: { label: 'Urbano', className: 'bg-blue-100 text-blue-800' },
    rural: { label: 'Rural', className: 'bg-green-100 text-green-800' }
  };
  
  const config = kindConfig[kind];
  return <Badge className={config.className}>{config.label}</Badge>;
};

export function PropertiesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');

  const filteredProperties = mockProperties.filter(property => {
    const matchesSearch = property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKind = kindFilter === 'all' || property.kind === kindFilter;
    return matchesSearch && matchesKind;
  });

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Imóveis"
          subtitle="Cadastro e gestão de imóveis para avaliação"
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Cadastro de Imóveis
              </CardTitle>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Imóvel
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar imóveis..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={kindFilter} onValueChange={setKindFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="urban">Urbano</SelectItem>
                  <SelectItem value="rural">Rural</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Área Terreno (m²)</TableHead>
                    <TableHead>Área Construída (m²)</TableHead>
                    <TableHead>Idade (anos)</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Qualidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.length > 0 ? (
                    filteredProperties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {property.address}
                          </div>
                        </TableCell>
                        <TableCell>{getKindBadge(property.kind)}</TableCell>
                        <TableCell>{property.land_area.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{property.built_area.toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{property.age}</TableCell>
                        <TableCell>{property.condition}</TableCell>
                        <TableCell>{property.quality}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {searchTerm || kindFilter !== 'all' 
                            ? 'Nenhum imóvel encontrado com os filtros aplicados.'
                            : 'Nenhum imóvel cadastrado ainda.'
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleHeader>
  );
}

export default PropertiesPage;