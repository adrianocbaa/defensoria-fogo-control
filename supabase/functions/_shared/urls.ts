/** Canonical destinations for persistent links; no request-origin fallback. */
export const APP_URL = 'https://app.sidif.com.br';
export const INSTITUTIONAL_URL = 'https://sidif.com.br';

function destinationUrl(base: string, path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error('Expected a relative path starting with a single slash');
  }
  return `${base}${path}`;
}

export const appUrl = (path = '/'): string => destinationUrl(APP_URL, path);
export const institutionalUrl = (path = '/'): string => destinationUrl(INSTITUTIONAL_URL, path);