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
    <TooltipProvider delayDuration={0}>
      <div className={`relative h-2 w-full overflow-visible rounded-full bg-secondary ${className}`}>
        {/* Barra de progresso - usando bg-primary igual ao Progress padrão */}
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${clampedValue}%` }}
        />
        
        {/* Marcadores das medições */}
        {marcos.map((marco) => {
          const position = Math.min(Math.max(marco.percentualAcumulado, 0), 100);
          
          return (
            <Tooltip key={marco.sequencia}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground/70 cursor-pointer hover:bg-foreground transition-colors z-10"
                  style={{ left: `${position}%`, transform: `translateX(-50%) translateY(-50%)` }}
                >
                  {/* Marcador circular no topo */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-foreground border border-background" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="font-semibold">Medição {marco.sequencia}</div>
                <div className="text-muted-foreground">
                  <span className="font-medium">{marco.percentualAcumulado.toFixed(2)}%</span>
                  <span className="mx-1">•</span>
                  <span>{formatCurrency(marco.valorAcumulado)}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
