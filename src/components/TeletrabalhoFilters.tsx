import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, RotateCcw } from 'lucide-react';

export type TeletrabalhoFilterStatus = 'all' | 'active' | 'scheduled';

export interface TeletrabalhoFiltersData {
  status: TeletrabalhoFilterStatus[];
}

interface TeletrabalhoFiltersProps {
  onFiltersChange: (filters: TeletrabalhoFiltersData) => void;
  loading?: boolean;
}

const statusOptions = [
  { value: 'all' as const, label: 'Todos', color: 'bg-blue-500' },
  { value: 'active' as const, label: 'Em Teletrabalho', color: 'bg-green-500' },
  { value: 'scheduled' as const, label: 'Agendados', color: 'bg-yellow-500' }
];

export function TeletrabalhoFilters({ 
  onFiltersChange,
  loading = false
}: TeletrabalhoFiltersProps) {
  const { watch, setValue, reset } = useForm<TeletrabalhoFiltersData>({
    defaultValues: {
      status: ['all']
    }
  });

  const currentFilters = watch();

  // Trigger filter change when values change
  useEffect(() => {
    onFiltersChange(currentFilters);
  }, [currentFilters, onFiltersChange]);

  const handleStatusChange = (status: TeletrabalhoFilterStatus, checked: boolean) => {
    const currentStatus = [...currentFilters.status];
    
    // If checking "Todos", clear others and set only "all"
    if (status === 'all' && checked) {
      setValue('status', ['all']);
      return;
    }
    
    // If unchecking and only one left, keep it
    if (!checked && currentStatus.length === 1) {
      return;
    }
    
    // Remove "all" when selecting specific status
    const filteredStatus = currentStatus.filter(s => s !== 'all');
    
    let newStatus: TeletrabalhoFilterStatus[];
    if (checked) {
      newStatus = [...filteredStatus, status];
    } else {
      newStatus = filteredStatus.filter(s => s !== status);
    }
    
    // If no status selected, default to "all"
    if (newStatus.length === 0) {
      newStatus = ['all'];
    }
    
    setValue('status', newStatus);
  };

  const handleClearFilters = () => {
    reset({
      status: ['all']
    });
  };

  const hasActiveFilters = !currentFilters.status.includes('all');

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
          <CardTitle className="text-sm lg:text-base font-medium">Status de Teletrabalho</CardTitle>
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
    </div>
  );
}
