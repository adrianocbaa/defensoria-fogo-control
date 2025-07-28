import React from 'react';
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
  maxValue 
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

  // Trigger filter change whenever form values change
  React.useEffect(() => {
    onFiltersChange(currentFilters);
  }, [currentFilters, onFiltersChange]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Filtros</h2>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Status Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Status da Obra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {statusOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <Checkbox
                id={`status-${option.value}`}
                checked={currentFilters.status.includes(option.value)}
                onCheckedChange={(checked) => 
                  handleStatusChange(option.value, checked as boolean)
                }
              />
              <label 
                htmlFor={`status-${option.value}`}
                className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                <div className={`w-3 h-3 rounded-full ${option.color}`} />
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