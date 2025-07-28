// Utility functions for formatting currency and percentages in Brazilian format

/**
 * Formats a number as Brazilian currency (R$)
 * Example: 15000 -> "R$ 15.000,00"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a number as percentage with 2 decimal places
 * Example: 50.123 -> "50,12%"
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/**
 * Formats a decimal percentage directly (already in 0-100 range)
 * Example: 50.123 -> "50,12%"
 */
export function formatPercentageValue(value: number): string {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}