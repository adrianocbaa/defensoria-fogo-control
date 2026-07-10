import { addDays, differenceInDays, isBefore, parseISO, startOfDay } from 'date-fns';

export type NucleusPinColor = 'green' | 'orange' | 'red' | 'gray';
export type LicenseStatus = 'valid' | 'expiring-soon' | 'expired' | null;
export type ExtinguisherLifecycle = 'valid' | 'expiring-soon' | 'expired';

export interface StatusInputs {
  licenseValidUntil?: string | null;
  extinguishers?: Array<{ expiration_date?: string | null }>;
}

const WARN_WINDOW_DAYS = 60;

export function getLicenseStatus(dateStr?: string | null): LicenseStatus {
  if (!dateStr) return null;
  const today = startOfDay(new Date());
  const validUntil = startOfDay(parseISO(dateStr));
  if (isBefore(validUntil, today)) return 'expired';
  if (isBefore(validUntil, addDays(today, WARN_WINDOW_DAYS))) return 'expiring-soon';
  return 'valid';
}

export function getExtinguisherStatus(dateStr?: string | null): ExtinguisherLifecycle {
  if (!dateStr) return 'valid';
  const today = startOfDay(new Date());
  const exp = startOfDay(parseISO(dateStr));
  if (isBefore(exp, today)) return 'expired';
  if (isBefore(exp, addDays(today, WARN_WINDOW_DAYS))) return 'expiring-soon';
  return 'valid';
}

export function calcPinColor({ licenseValidUntil, extinguishers = [] }: StatusInputs): NucleusPinColor {
  const licenseStatus = getLicenseStatus(licenseValidUntil);
  const hasNoLicense = !licenseValidUntil;
  const hasNoExtinguishers = extinguishers.length === 0;
  const expiredCount = extinguishers.filter((e) => getExtinguisherStatus(e.expiration_date) === 'expired').length;
  const expiringCount = extinguishers.filter((e) => getExtinguisherStatus(e.expiration_date) === 'expiring-soon').length;

  if (expiredCount > 0 || licenseStatus === 'expired' || hasNoExtinguishers || hasNoLicense) return 'red';
  if (expiringCount > 0 || licenseStatus === 'expiring-soon') return 'orange';
  return 'green';
}

/** Ação recomendada, derivada dos dados reais. */
export function getNextAction(inputs: StatusInputs): string {
  const { licenseValidUntil, extinguishers = [] } = inputs;
  const licenseStatus = getLicenseStatus(licenseValidUntil);
  const expired = extinguishers.filter((e) => getExtinguisherStatus(e.expiration_date) === 'expired').length;
  const expiring = extinguishers.filter((e) => getExtinguisherStatus(e.expiration_date) === 'expiring-soon').length;

  if (!licenseValidUntil && extinguishers.length === 0) return 'Cadastrar dados de prevenção';
  if (licenseStatus === 'expired') return 'Alvará vencido — regularizar';
  if (expired > 0) return `Substituir ${expired} extintor${expired > 1 ? 'es' : ''} vencido${expired > 1 ? 's' : ''}`;
  if (licenseStatus === 'expiring-soon' && licenseValidUntil) {
    const days = differenceInDays(startOfDay(parseISO(licenseValidUntil)), startOfDay(new Date()));
    return `Alvará vence em ${days} dia${days !== 1 ? 's' : ''} — agendar renovação`;
  }
  if (expiring > 0) return `${expiring} extintor${expiring > 1 ? 'es' : ''} vencendo em breve`;
  if (licenseStatus === 'valid') return 'Certificado válido';
  return 'Próxima ação não informada';
}

export function nextActionColorClass(inputs: StatusInputs): string {
  const color = calcPinColor(inputs);
  if (color === 'red') return 'text-destructive';
  if (color === 'orange') return 'text-warning';
  if (color === 'green') return 'text-success';
  return 'text-muted-foreground';
}
