import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { comparablesApi, Comparable } from '@/services/appraisalApi';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';

interface SelectComparablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: (selectedComparables: Comparable[]) => void;
}

export function SelectComparablesModal({ 
  open, 
  onOpenChange, 
  projectId, 
  onSuccess 
}: SelectComparablesModalProps) {
  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadComparables();
    }
  }, [open]);

  const loadComparables = async () => {
    setLoading(true);
    try {
      const data = await comparablesApi.list();
      setComparables(data);
    } catch (error) {
      console.error('Error loading comparables:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar comparáveis',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredComparables = comparables.filter(comparable => {
    const matchesSearch = comparable.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comparable.source?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKind = kindFilter === 'all' || comparable.kind === kindFilter;
    
    let matchesDate = true;
    if (dateFrom && comparable.date) {
      matchesDate = matchesDate && comparable.date >= dateFrom;
    }
    if (dateTo && comparable.date) {
      matchesDate = matchesDate && comparable.date <= dateTo;
    }

    return matchesSearch && matchesKind && matchesDate;
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(filteredComparables.map(c => c.id!));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Selecione pelo menos um comparável',
        variant: 'destructive',
      });
      return;
    }

    try {
      const selectedComparables = comparables.filter(c => selectedIds.includes(c.id!));
      
      // Create sample record in database
      const { samplesApi } = await import('@/services/appraisalApi');
      await samplesApi.create({
        project_id: projectId,
        name: `Amostra ${new Date().toLocaleDateString('pt-BR')}`,
        comparable_ids: selectedIds,
        criteria_json: {
          kind_filter: kindFilter,
          date_from: dateFrom,
          date_to: dateTo,
          search_term: searchTerm
        }
      });

      onSuccess(selectedComparables);
      onOpenChange(false);
      
      toast({
        title: 'Sucesso',
        description: `${selectedIds.length} comparáveis selecionados para o projeto`,
      });
    } catch (error) {
      console.error('Error creating sample:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao vincular comparáveis ao projeto',
        variant: 'destructive',
      });
    }
  };

  const getKindBadge = (kind: string) => {
    const config = {
      urban: { label: 'Urbano', className: 'bg-blue-100 text-blue-800' },
      rural: { label: 'Rural', className: 'bg-green-100 text-green-800' }
    };
    const kindConfig = config[kind as keyof typeof config] || config.urban;
    return <Badge className={kindConfig.className}>{kindConfig.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Selecionar Comparáveis</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Fonte, observações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="kind">Tipo</Label>
              <select
                id="kind"
                className="w-full px-3 py-2 border rounded-md"
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="urban">Urbano</option>
                <option value="rural">Rural</option>
              </select>
            </div>

            <div>
              <Label htmlFor="dateFrom">Data de</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Data até</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {selectedIds.length} de {filteredComparables.length} selecionados
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Selecionar Todos
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Limpar Seleção
              </Button>
            </div>
          </div>

          {/* Comparables List */}
          <ScrollArea className="h-96">
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : filteredComparables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum comparável encontrado com os filtros aplicados
              </div>
            ) : (
              <div className="space-y-2">
                {filteredComparables.map((comparable) => (
                  <div
                    key={comparable.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedIds.includes(comparable.id!) 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleSelection(comparable.id!)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          checked={selectedIds.includes(comparable.id!)}
                          onChange={() => toggleSelection(comparable.id!)}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getKindBadge(comparable.kind)}
                            <span className="text-sm text-muted-foreground">
                              {comparable.source} • {new Date(comparable.date || '').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Preço Total:</span><br/>
                              <span className="font-medium">{formatCurrency(comparable.price_total || 0)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Preço Unit:</span><br/>
                              <span className="font-medium">{formatCurrency(comparable.price_unit || 0)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Área Terreno:</span><br/>
                              <span className="font-medium">{comparable.land_area} m²</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Área Construída:</span><br/>
                              <span className="font-medium">{comparable.built_area} m²</span>
                            </div>
                          </div>
                          {comparable.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {comparable.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
              Confirmar Seleção ({selectedIds.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}