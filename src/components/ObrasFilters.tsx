import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Filter, RotateCcw, Search } from 'lucide-react';
import { type ObraStatus } from '@/data/mockObras';
import { useDebounce } from '@/hooks/useDebounce';
import { FiltersLoadingSkeleton } from '@/components/LoadingStates';

export interface FiltersData {
  status: ObraStatus[];
  tipos: string[];
  municipio: string;
}

interface ObrasFiltersProps {
  onFiltersChange: (filters: FiltersData) => void;
  availableTypes: string[];
  availableMunicipios: string[];
  loading?: boolean;
}

const statusOptions = [
  { value: 'concluida' as const, label: 'Concluída', color: 'bg-green-500' },
  { value: 'em_andamento' as const, label: 'Em Andamento', color: 'bg-blue-500' },
  { value: 'planejada' as const, label: 'Planejada', color: 'bg-yellow-500' },
  { value: 'paralisada' as const, label: 'Paralisada', color: 'bg-red-500' }
];

export function ObrasFilters({ 
  onFiltersChange, 
  availableTypes, 
  availableMunicipios, 
  loading = false
}: ObrasFiltersProps) {
  const { watch, setValue, reset } = useForm<FiltersData>({
    defaultValues: {
      status: [],
      tipos: [],
      municipio: ''
    }
  });

  const currentFilters = watch();
  
  // Debounce filter changes to improve performance
  const debouncedFilters = useDebounce(currentFilters, 300);

  // Trigger filter change when debounced values change
  useEffect(() => {
    onFiltersChange(debouncedFilters);
  }, [debouncedFilters, onFiltersChange]);

  const handleStatusChange = (status: ObraStatus, checked: boolean) => {
    const currentStatus = currentFilters.status;
    if (checked) {
      setValue('status', [...currentStatus, status]);
    } else {
      setValue('status', currentStatus.filter(s => s !== status));
    }
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    const currentTypes = currentFilters.tipos;
    if (checked) {
      setValue('tipos', [...currentTypes, type]);
    } else {
      setValue('tipos', currentTypes.filter(t => t !== type));
    }
  };

  const handleClearFilters = () => {
    reset({
      status: [],
      tipos: [],
      municipio: ''
    });
  };

  const hasActiveFilters = currentFilters.status.length > 0 || 
                          currentFilters.tipos.length > 0 || 
                          (currentFilters.municipio !== '');

  // Show loading skeleton while data loads
  if (loading) {
    return (
      <div className="space-y-6">
        <FiltersLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 lg:h-5 lg:w-5" />
          <h2 className="text-base lg:text-lg font-semibold">Filtros</h2>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        )}
      </div>

      {/* Status Filter */}
      <Card className="transition-all duration-200 hover:shadow-sm">
        <CardHeader className="pb-2 lg:pb-3">
          <CardTitle className="text-sm lg:text-base font-medium">Status da Obra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 lg:space-y-3">
          {statusOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2 lg:space-x-3">
              <Checkbox
                id={`status-${option.value}`}
                checked={currentFilters.status.includes(option.value)}
                onCheckedChange={(checked) => 
                  handleStatusChange(option.value, checked as boolean)
                }
              />
              <label 
                htmlFor={`status-${option.value}`}
                className="flex items-center gap-2 text-xs lg:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer transition-colors hover:text-primary"
              >
                <div className={`w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full ${option.color}`} />
                {option.label}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Type Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Tipo de Obra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {availableTypes.map((type) => (
            <div key={type} className="flex items-center space-x-3">
              <Checkbox
                id={`type-${type}`}
                checked={currentFilters.tipos.includes(type)}
                onCheckedChange={(checked) => 
                  handleTypeChange(type, checked as boolean)
                }
              />
              <label 
                htmlFor={`type-${type}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {type}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Municipality Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Município</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por município..."
              value={currentFilters.municipio}
              onChange={(e) => setValue('municipio', e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Filtros Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentFilters.status.map((status) => {
                const statusOption = statusOptions.find(s => s.value === status);
                return (
                  <Badge key={status} variant="secondary" className="text-xs">
                    {statusOption?.label}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => handleStatusChange(status, false)}
                    />
                  </Badge>
                );
              })}
              {currentFilters.tipos.map((tipo) => (
                <Badge key={tipo} variant="secondary" className="text-xs">
                  {tipo}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => handleTypeChange(tipo, false)}
                  />
                </Badge>
              ))}
              {currentFilters.municipio && (
                <Badge variant="secondary" className="text-xs">
                  Município: {currentFilters.municipio}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setValue('municipio', '')}
                  />
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}