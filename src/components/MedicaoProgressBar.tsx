import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatters';

export interface MedicaoMarcoBar {
  sequencia: number;
  valorAcumulado: number;
  valorMedicao: number;
  percentualAcumulado: number;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  data_vistoria?: string | null;
  data_relatorio?: string | null;
}

function formatDateBR(value?: string | null): string | null {
  if (!value) return null;
  // Expected YYYY-MM-DD; build local date to avoid TZ shift
  const [y, m, d] = value.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('pt-BR');
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
              <TooltipContent side="top" className="text-xs max-w-[240px] space-y-0.5">
                <p className="font-semibold">{marco.sequencia}ª Medição</p>
                <p>Valor pago: <span className="font-bold">{formatCurrency(marco.valorMedicao)}</span></p>
                <p>Acumulado: <span className="font-bold">{formatCurrency(marco.valorAcumulado)}</span></p>
                <p>Progresso: <span className="font-bold">{marco.percentualAcumulado.toFixed(1)}%</span></p>
                {(marco.periodo_inicio || marco.periodo_fim) && (
                  <p className="pt-1 border-t border-border/40">
                    Período: <span className="font-medium">
                      {formatDateBR(marco.periodo_inicio) || '—'} a {formatDateBR(marco.periodo_fim) || '—'}
                    </span>
                  </p>
                )}
                {marco.data_vistoria && (
                  <p>Vistoria: <span className="font-medium">{formatDateBR(marco.data_vistoria)}</span></p>
                )}
                {marco.data_relatorio && (
                  <p>Relatório: <span className="font-medium">{formatDateBR(marco.data_relatorio)}</span></p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
