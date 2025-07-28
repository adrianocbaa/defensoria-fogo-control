import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Filter, RotateCcw } from 'lucide-react';
import { type ObraStatus } from '@/data/mockObras';
import { useDebounce } from '@/hooks/useDebounce';
import { FiltersLoadingSkeleton } from '@/components/LoadingStates';

export interface FiltersData {
  status: ObraStatus[];
  tipos: string[];
  municipio: string;
  valorMin: number;
  valorMax: number;
}

interface ObrasFiltersProps {
  onFiltersChange: (filters: FiltersData) => void;
  availableTypes: string[];
  availableMunicipios: string[];
  maxValue: number;
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
  maxValue,
  loading = false
}: ObrasFiltersProps) {
  const { watch, setValue, reset } = useForm<FiltersData>({
    defaultValues: {
      status: [],
      tipos: [],
      municipio: 'all',
      valorMin: 0,
      valorMax: maxValue
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
      municipio: 'all',
      valorMin: 0,
      valorMax: maxValue
    });
  };

  const hasActiveFilters = currentFilters.status.length > 0 || 
                          currentFilters.tipos.length > 0 || 
                          (currentFilters.municipio !== 'all' && currentFilters.municipio !== '') ||
                          currentFilters.valorMin > 0 ||
                          currentFilters.valorMax < maxValue;

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
          <Select 
            value={currentFilters.municipio} 
            onValueChange={(value) => setValue('municipio', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um município" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os municípios</SelectItem>
              {availableMunicipios.map((municipio) => (
                <SelectItem key={municipio} value={municipio}>
                  {municipio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Value Range Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Valor da Obra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">
              R$ {currentFilters.valorMin.toLocaleString('pt-BR')} - R$ {currentFilters.valorMax.toLocaleString('pt-BR')}
            </Label>
            <Slider
              value={[currentFilters.valorMin, currentFilters.valorMax]}
              onValueChange={([min, max]) => {
                setValue('valorMin', min);
                setValue('valorMax', max);
              }}
              max={maxValue}
              min={0}
              step={1000000}
              className="w-full"
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
              {currentFilters.municipio && currentFilters.municipio !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {currentFilters.municipio}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setValue('municipio', 'all')}
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