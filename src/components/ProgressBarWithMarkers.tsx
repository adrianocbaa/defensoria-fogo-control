import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MedicaoMarco } from '@/hooks/useMedicoesFinanceiro';
import { formatCurrency } from '@/lib/formatters';

interface ProgressBarWithMarkersProps {
  value: number;
  marcos: MedicaoMarco[];
  className?: string;
}

export function ProgressBarWithMarkers({ value, marcos, className = '' }: ProgressBarWithMarkersProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <TooltipProvider>
      <div className={`relative h-3 w-full overflow-visible rounded-full bg-secondary ${className}`}>
        {/* Barra de progresso */}
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-300"
          style={{ width: `${clampedValue}%` }}
        />
        
        {/* Marcadores das medições */}
        {marcos.map((marco) => {
          const position = Math.min(Math.max(marco.percentualAcumulado, 0), 100);
          
          return (
            <Tooltip key={marco.sequencia}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-foreground/80 cursor-pointer hover:bg-foreground transition-colors z-10"
                  style={{ left: `${position}%`, transform: `translateX(-50%) translateY(-50%)` }}
                >
                  {/* Marcador circular no topo */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-foreground border border-background shadow-sm" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="font-medium">Medição {marco.sequencia}</div>
                <div className="text-muted-foreground">
                  {marco.percentualAcumulado.toFixed(2)}% • {formatCurrency(marco.valorAcumulado)}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
