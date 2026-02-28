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
}

export function MedicaoProgressBar({ marcos, totalContrato, className = '', height = 12 }: MedicaoProgressBarProps) {
  const percentualTotal = totalContrato > 0
    ? Math.min((marcos[marcos.length - 1]?.valorAcumulado || 0) / totalContrato * 100, 100)
    : 0;

  return (
    <TooltipProvider delayDuration={100}>
      <div className={`relative w-full ${className}`} style={{ height }}>
        {/* Trilho de fundo */}
        <div
          className="absolute inset-0 rounded-full bg-muted"
          style={{ height }}
        />
        {/* Barra preenchida */}
        <div
          className="absolute left-0 top-0 rounded-full bg-green-500 transition-all duration-300"
          style={{ width: `${percentualTotal}%`, height }}
        />

        {/* Marcos com tooltip */}
        {marcos.map((marco) => {
          const pos = totalContrato > 0
            ? Math.min((marco.valorAcumulado / totalContrato) * 100, 100)
            : 0;

          return (
            <Tooltip key={marco.sequencia}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-pointer"
                  style={{ left: `${pos}%` }}
                >
                  <div className="w-3 h-3 rounded-full bg-green-700 border-2 border-white shadow-md hover:scale-125 transition-transform" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px]">
                <p className="font-semibold">Medição {marco.sequencia}ª</p>
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
