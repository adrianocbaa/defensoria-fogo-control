import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MedicaoMarco } from '@/hooks/useMedicoesFinanceiro';
import { formatCurrency } from '@/lib/formatters';

interface ProgressBarWithMarkersProps {
  value: number;
  marcos: MedicaoMarco[];
  className?: string;
  variant?: 'default' | 'subtle';
  color?: 'default' | 'green' | 'blue';
}

export function ProgressBarWithMarkers({ value, marcos, className = '', variant = 'default', color = 'default' }: ProgressBarWithMarkersProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  
  const isSubtle = variant === 'subtle';
  const markerLineClass = isSubtle 
    ? "absolute top-1/2 -translate-y-1/2 w-px h-4 bg-muted-foreground/70 cursor-pointer hover:bg-muted-foreground transition-colors z-10"
    : "absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground/70 cursor-pointer hover:bg-foreground transition-colors z-10";

  const colorClass = color === 'green' ? 'bg-green-600' : color === 'blue' ? 'bg-blue-600' : 'bg-primary';

  return (
    <TooltipProvider delayDuration={0}>
      <div className={`relative h-2 w-full overflow-visible rounded-full bg-secondary ${className}`}>
        {/* Barra de progresso */}
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${clampedValue}%` }}
        />
        
        {/* Marcadores das medições */}
        {marcos.map((marco) => {
          const position = Math.min(Math.max(marco.percentualAcumulado, 0), 100);
          
          return (
            <Tooltip key={marco.sequencia}>
              <TooltipTrigger asChild>
                <div
                  className={markerLineClass}
                  style={{ left: `${position}%`, transform: `translateX(-50%) translateY(-50%)` }}
                >
                  {/* Marcador circular no topo - apenas para variant default */}
                  {!isSubtle && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-foreground border border-background" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="font-semibold">Medição {marco.sequencia}</div>
                <div className="text-muted-foreground">
                  <span>{formatCurrency(marco.valorMedicao)}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
