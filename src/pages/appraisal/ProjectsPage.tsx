import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Project {
  id: string;
  purpose: string;
  status: 'draft' | 'in_progress' | 'completed';
  property_address: string;
  base_date: string;
  approach: string;
}

const mockProjects: Project[] = [
  {
    id: '1',
    purpose: 'Avaliação para garantia hipotecária',
    status: 'in_progress',
    property_address: 'Rua das Flores, 123 - Centro',
    base_date: '2024-01-15',
    approach: 'Comparativo de mercado'
  },
  {
    id: '2',
    purpose: 'Avaliação para seguro',
    status: 'draft',
    property_address: 'Av. Principal, 456 - Bairro Novo',
    base_date: '2024-01-20',
    approach: 'Custo de reposição'
  }
];

const getStatusBadge = (status: Project['status']) => {
  const statusConfig = {
    draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800' },
    in_progress: { label: 'Em Andamento', className: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'Concluído', className: 'bg-green-100 text-green-800' }
  };
  
  const config = statusConfig[status];
  return <Badge className={config.className}>{config.label}</Badge>;
};

export function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.property_address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Projetos de Avaliação"
          subtitle="Gerencie seus projetos de avaliação de imóveis"
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle>Lista de Projetos</CardTitle>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar projetos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Finalidade</TableHead>
                    <TableHead>Imóvel</TableHead>
                    <TableHead>Data Base</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.purpose}</TableCell>
                        <TableCell>{project.property_address}</TableCell>
                        <TableCell>{new Date(project.base_date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{project.approach}</TableCell>
                        <TableCell>{getStatusBadge(project.status)}</TableCell>
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
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {searchTerm || statusFilter !== 'all' 
                            ? 'Nenhum projeto encontrado com os filtros aplicados.'
                            : 'Nenhum projeto cadastrado ainda.'
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

export default ProjectsPage;