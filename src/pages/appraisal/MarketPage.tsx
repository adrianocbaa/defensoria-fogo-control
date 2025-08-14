import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Eye, Edit, Trash2, BarChart3, MapPin } from 'lucide-react';
import { useState } from 'react';

interface Comparable {
  id: string;
  source: string;
  date: string;
  deal_type: 'sale' | 'rent' | 'offer';
  price_total: number;
  price_unit: number;
  land_area: number;
  built_area: number;
  kind: 'urban' | 'rural';
  condition: string;
}

const mockComparables: Comparable[] = [
  {
    id: '1',
    source: 'Portal Imobiliário',
    date: '2024-01-10',
    deal_type: 'sale',
    price_total: 450000,
    price_unit: 2500,
    land_area: 300,
    built_area: 180,
    kind: 'urban',
    condition: 'Bom'
  },
  {
    id: '2',
    source: 'Cartório de Registro',
    date: '2024-01-05',
    deal_type: 'sale',
    price_total: 380000,
    price_unit: 2200,
    land_area: 280,
    built_area: 172,
    kind: 'urban',
    condition: 'Regular'
  }
];

const getDealTypeBadge = (dealType: Comparable['deal_type']) => {
  const dealTypeConfig = {
    sale: { label: 'Venda', className: 'bg-green-100 text-green-800' },
    rent: { label: 'Aluguel', className: 'bg-blue-100 text-blue-800' },
    offer: { label: 'Oferta', className: 'bg-yellow-100 text-yellow-800' }
  };
  
  const config = dealTypeConfig[dealType];
  return <Badge className={config.className}>{config.label}</Badge>;
};

const getKindBadge = (kind: Comparable['kind']) => {
  const kindConfig = {
    urban: { label: 'Urbano', className: 'bg-blue-100 text-blue-800' },
    rural: { label: 'Rural', className: 'bg-green-100 text-green-800' }
  };
  
  const config = kindConfig[kind];
  return <Badge className={config.className}>{config.label}</Badge>;
};

export function MarketPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dealTypeFilter, setDealTypeFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<string>('all');

  const filteredComparables = mockComparables.filter(comparable => {
    const matchesSearch = comparable.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDealType = dealTypeFilter === 'all' || comparable.deal_type === dealTypeFilter;
    const matchesKind = kindFilter === 'all' || comparable.kind === kindFilter;
    return matchesSearch && matchesDealType && matchesKind;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Amostras de Mercado"
          subtitle="Dados comparáveis para análise de mercado imobiliário"
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Dados de Mercado
              </CardTitle>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Amostra
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar amostras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={dealTypeFilter} onValueChange={setDealTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo de Negócio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="rent">Aluguel</SelectItem>
                  <SelectItem value="offer">Oferta</SelectItem>
                </SelectContent>
              </Select>
              <Select value={kindFilter} onValueChange={setKindFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
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
                    <TableHead>Fonte</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Valor/m²</TableHead>
                    <TableHead>Área Terreno</TableHead>
                    <TableHead>Área Construída</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComparables.length > 0 ? (
                    filteredComparables.map((comparable) => (
                      <TableRow key={comparable.id}>
                        <TableCell className="font-medium">{comparable.source}</TableCell>
                        <TableCell>{new Date(comparable.date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{getDealTypeBadge(comparable.deal_type)}</TableCell>
                        <TableCell>{getKindBadge(comparable.kind)}</TableCell>
                        <TableCell>{formatCurrency(comparable.price_total)}</TableCell>
                        <TableCell>{formatCurrency(comparable.price_unit)}</TableCell>
                        <TableCell>{comparable.land_area.toLocaleString('pt-BR')} m²</TableCell>
                        <TableCell>{comparable.built_area.toLocaleString('pt-BR')} m²</TableCell>
                        <TableCell>{comparable.condition}</TableCell>
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
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {searchTerm || dealTypeFilter !== 'all' || kindFilter !== 'all'
                            ? 'Nenhuma amostra encontrada com os filtros aplicados.'
                            : 'Nenhuma amostra cadastrada ainda.'
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

export default MarketPage;