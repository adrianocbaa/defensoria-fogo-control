import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatters';

export interface MedicaoMarcoBar {
  sequencia: number;
  valorAcumulado: number;
  valorMedicao: number;
  percentualAcumulado: number;
}

interface MedicaoProgressBarProps {
  marcos: MedicaoMarcoBar[];
  totalContrato: number;
  className?: string;
  height?: number;
  color?: 'green' | 'blue';
}

export function MedicaoProgressBar({ marcos, totalContrato, className = '', height = 8, color = 'green' }: MedicaoProgressBarProps) {
  const percentualTotal = totalContrato > 0
    ? Math.min((marcos[marcos.length - 1]?.valorAcumulado || 0) / totalContrato * 100, 100)
    : 0;

  const trackColor = color === 'blue' ? 'bg-blue-500' : 'bg-green-500';
  const markerColor = color === 'blue' ? 'bg-blue-700' : 'bg-green-700';

  return (
    <TooltipProvider delayDuration={100}>
      <div className={`relative w-full ${className}`} style={{ height }}>
        {/* Trilho de fundo */}
        <div className="absolute inset-0 rounded-full bg-muted" style={{ height }} />
        {/* Barra preenchida */}
        <div
          className={`absolute left-0 top-0 rounded-full transition-all duration-300 ${trackColor}`}
          style={{ width: `${percentualTotal}%`, height }}
        />
        {/* Marcos — tracinho discreto */}
        {marcos.map((marco) => {
          const pos = totalContrato > 0
            ? Math.min((marco.valorAcumulado / totalContrato) * 100, 100)
            : 0;

          return (
            <Tooltip key={marco.sequencia}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-0 -translate-x-1/2 z-10 cursor-pointer"
                  style={{ left: `${pos}%`, height }}
                >
                  <div
                    className={`w-[2px] opacity-70 hover:opacity-100 transition-opacity ${markerColor}`}
                    style={{ height }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px]">
                <p className="font-semibold">{marco.sequencia}ª Medição</p>
                <p>Valor pago: <span className="font-bold">{formatCurrency(marco.valorMedicao)}</span></p>
                <p>Acumulado: <span className="font-bold">{formatCurrency(marco.valorAcumulado)}</span></p>
                <p>Progresso: <span className="font-bold">{marco.percentualAcumulado.toFixed(1)}%</span></p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
