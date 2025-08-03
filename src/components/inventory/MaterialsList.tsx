import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Search, Filter, Download, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Material {
  id: string;
  code: string;
  description: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
}

export function MaterialsList() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    const filtered = materials.filter(material =>
      material.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMaterials(filtered);
  }, [materials, searchTerm]);

  const loadMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('code');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os materiais",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return;

    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Material excluído com sucesso"
      });

      loadMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o material",
        variant: "destructive"
      });
    }
  };

  const getStockStatus = (current: number, minimum: number) => {
    if (current <= minimum) return { label: 'Baixo', variant: 'destructive' as const };
    if (current <= minimum * 1.5) return { label: 'Atenção', variant: 'secondary' as const };
    return { label: 'OK', variant: 'default' as const };
  };

  if (loading) {
    return <div className="p-6">Carregando materiais...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-border/50 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Lista de Materiais
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie o catálogo completo de materiais do estoque
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Novo Material
              </Button>
              <Button variant="outline" className="btn-action border-green-200 text-green-700 hover:bg-green-50">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search & Filter Section */}
        <Card className="card-enhanced">
          <CardContent className="p-4">
            <div className="filter-bar">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código, descrição ou categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="btn-action">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
                <Button variant="outline" size="sm" className="btn-action">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="card-stats">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{materials.length}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="card-stats">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {materials.filter(m => m.current_stock <= m.minimum_stock).length}
              </div>
              <p className="text-xs text-muted-foreground">Críticos</p>
            </CardContent>
          </Card>
          <Card className="card-stats">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {materials.filter(m => m.current_stock > m.minimum_stock && m.current_stock <= m.minimum_stock * 1.5).length}
              </div>
              <p className="text-xs text-muted-foreground">Atenção</p>
            </CardContent>
          </Card>
          <Card className="card-stats">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {materials.filter(m => m.current_stock > m.minimum_stock * 1.5).length}
              </div>
              <p className="text-xs text-muted-foreground">OK</p>
            </CardContent>
          </Card>
        </div>

        {/* Materials Table */}
        <Card className="card-enhanced">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Materiais Cadastrados</CardTitle>
              <Badge variant="outline">
                {filteredMaterials.length} de {materials.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile View */}
            <div className="block sm:hidden">
              <div className="space-y-3 p-4">
                {filteredMaterials.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhum material encontrado' : 'Nenhum material cadastrado'}
                  </div>
                ) : (
                  filteredMaterials.map((material) => {
                    const status = getStockStatus(material.current_stock, material.minimum_stock);
                    return (
                      <Card key={material.id} className="p-4 border border-border/50">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-foreground">{material.code}</div>
                            <Badge variant={status.variant} className="text-xs">
                              {status.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {material.description}
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Estoque: <span className="font-medium">{material.current_stock} {material.unit}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Mín: <span className="font-medium">{material.minimum_stock}</span>
                            </span>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDelete(material.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block table-responsive">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="font-semibold">Código</TableHead>
                    <TableHead className="font-semibold">Descrição</TableHead>
                    <TableHead className="font-semibold">Unidade</TableHead>
                    <TableHead className="text-center font-semibold">Saldo</TableHead>
                    <TableHead className="text-center font-semibold">Mínimo</TableHead>
                    <TableHead className="text-center font-semibold">Status</TableHead>
                    <TableHead className="text-center font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'Nenhum material encontrado' : 'Nenhum material cadastrado'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaterials.map((material) => {
                      const status = getStockStatus(material.current_stock, material.minimum_stock);
                      return (
                        <TableRow 
                          key={material.id} 
                          className={`hover:bg-muted/50 ${
                            status.variant === 'destructive' ? 'table-row-critical' : 
                            status.variant === 'secondary' ? 'table-row-warning' : ''
                          }`}
                        >
                          <TableCell className="font-medium">{material.code}</TableCell>
                          <TableCell className="max-w-xs truncate">{material.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {material.unit}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {material.current_stock}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {material.minimum_stock}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={status.variant} className="text-xs">
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(material.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}