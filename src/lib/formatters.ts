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

/**
 * Formats a date string to Brazilian format
 * Example: "2024-12-31" -> "31/12/2024"
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'Não informado';
  return new Date(dateString).toLocaleDateString('pt-BR');
}

/**
 * Remove all non-digit characters
 */
export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

/**
 * Formats Brazilian phone numbers.
 * - 11 digits: (xx) x xxxx-xxxx
 * - 10 digits: (xx) xxxx-xxxx
 */
export function formatPhoneBR(value?: string | null): string {
  if (!value) return '';
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length === 11) {
    const match = digits.match(/^(\d{2})(\d{1})(\d{4})(\d{4})$/);
    if (!match) return value;
    const [, ddd, nine, p1, p2] = match;
    return `(${ddd}) ${nine} ${p1}-${p2}`;
  }
  if (digits.length === 10) {
    const match = digits.match(/^(\d{2})(\d{4})(\d{4})$/);
    if (!match) return value;
    const [, ddd, p1, p2] = match;
    return `(${ddd}) ${p1}-${p2}`;
  }
  return value;
}

/**
 * Input mask for Brazilian phone numbers while typing
 */
export function maskPhoneBR(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    const match = digits.match(/^(\d{0,2})(\d{0,4})(\d{0,4})$/);
    const [, d1 = '', d2 = '', d3 = ''] = match || [];
    if (!d1) return '';
    let out = `(${d1}`;
    if (d1.length === 2) out += ') ';
    out += d2;
    if (d3) out += `-${d3}`;
    return out;
  }
  const match = digits.match(/^(\d{0,2})(\d{0,1})(\d{0,4})(\d{0,4})$/);
  const [, d1 = '', d2 = '', d3 = '', d4 = ''] = match || [];
  let out = '';
  if (d1) out += `(${d1}`;
  if (d1.length === 2) out += ') ';
  out += d2 ? `${d2}` : '';
  out += d3 ? ` ${d3}` : '';
  out += d4 ? `-${d4}` : '';
  return out;
}