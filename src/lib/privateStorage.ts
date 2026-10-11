/**
 * Lote S1 — Arquivos privados por órgão.
 *
 * Os buckets abaixo são privados. Registros antigos guardam URLs no formato
 * "/storage/v1/object/public/<bucket>/<path>", que não funcionam mais sem autorização.
 * Este módulo troca essas referências por URLs assinadas temporárias, geradas
 * com o token do usuário — o Storage só assina se a política de acesso do órgão permitir.
 *
 * - Nunca persistir a URL assinada no banco; persistir apenas a referência (storageRef).
 * - installPrivateStorageShim() intercepta <img>/<video>/<source>, fetch, window.open e
 *   cliques em links, para que telas, PDFs e exports antigos continuem funcionando.
 */
import { supabase } from '@/integrations/supabase/client';

export const PRIVATE_BUCKETS = ['service-photos', 'documents', 'rdo-pdf', 'teletrabalho-portarias'] as const;
export type PrivateBucket = (typeof PRIVATE_BUCKETS)[number];

const EXPIRES_IN = 60 * 60; // 1 hora
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const SUPABASE_URL = 'https://mmumfgxngzaivvyqfbed.supabase.co';

const RE = new RegExp(
  `/storage/v1/(?:object|render/image)/(?:public|sign|authenticated)/(${PRIVATE_BUCKETS.join('|')})/([^?#]+)`,
);

export function parsePrivateStorageUrl(url: string | null | undefined): { bucket: PrivateBucket; path: string } | null {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(RE);
  if (!m) return null;
  if (url.includes('/object/sign/') && url.includes('token=')) return null; // já assinada
  try {
    return { bucket: m[1] as PrivateBucket, path: decodeURIComponent(m[2]) };
  } catch {
    return { bucket: m[1] as PrivateBucket, path: m[2] };
  }
}

/** Referência canônica (não funcional publicamente) para persistir no banco. */
export function storageRef(bucket: PrivateBucket, path: string): string {
  const enc = path.split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${enc}`;
}

type CacheEntry = { url: string | null; exp: number };
const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<string | null>>();
const queue = new Map<PrivateBucket, Map<string, Array<(u: string | null) => void>>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
/** Época da sessão: respostas iniciadas em época anterior nunca gravam no cache nem são entregues. */
let epoch = 0;

/** Invalida tudo ligado à sessão atual (cache, fila, pendentes, timer). */
export function resetPrivateStorageSession() {
  epoch++;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  const old = Array.from(queue.values());
  queue.clear();
  pending.clear();
  cache.clear();
  // Resolve chamadores antigos com null (sem URL da sessão anterior)
  old.forEach((items) => items.forEach((cbs) => cbs.forEach((cb) => cb(null))));
}

/** Somente para testes. */
export function __privateStorageState() {
  return { epoch, cache: cache.size, pending: pending.size, queue: queue.size };
}

function flush() {
  flushTimer = null;
  const myEpoch = epoch;
  const batches = Array.from(queue.entries());
  queue.clear();
  for (const [bucket, items] of batches) {
    const paths = Array.from(items.keys());
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      supabase.storage
        .from(bucket)
        .createSignedUrls(chunk, EXPIRES_IN)
        .then(({ data, error }) => {
          const stale = myEpoch !== epoch;
          const byPath = new Map<string, string | null>();
          (data || []).forEach((d: any) => byPath.set(d.path, d.error ? null : d.signedUrl));
          for (const p of chunk) {
            const url = stale || error ? null : byPath.get(p) ?? null;
            if (!stale) {
              cache.set(`${bucket}/${p}`, { url, exp: Date.now() + (url ? EXPIRES_IN * 1000 - REFRESH_MARGIN_MS : 30_000) });
            }
            items.get(p)?.forEach((cb) => cb(url));
          }
        })
        .catch(() => chunk.forEach((p) => items.get(p)?.forEach((cb) => cb(null))));
    }
  }
}

export function signPrivatePath(bucket: PrivateBucket, path: string): Promise<string | null> {
  const key = `${bucket}/${path}`;
  const c = cache.get(key);
  if (c && c.exp > Date.now()) return Promise.resolve(c.url);
  const p = pending.get(key);
  if (p) return p;
  const myEpoch = epoch;
  const promise = new Promise<string | null>((resolve) => {
    if (!queue.has(bucket)) queue.set(bucket, new Map());
    const m = queue.get(bucket)!;
    if (!m.has(path)) m.set(path, []);
    m.get(path)!.push((u) => resolve(myEpoch === epoch ? u : null));
    if (!flushTimer) flushTimer = setTimeout(flush, 15);
  }).finally(() => { if (pending.get(key) === promise) pending.delete(key); });
  pending.set(key, promise);
  return promise;
}

/** Converte qualquer URL/referência de bucket privado em URL assinada; demais URLs passam intactas. */
export async function resolveStorageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const parsed = parsePrivateStorageUrl(url);
  if (!parsed) return url;
  return signPrivatePath(parsed.bucket, parsed.path);
}

export async function openPrivateFile(urlOrRef: string, bucket?: PrivateBucket) {
  const win = window.open('', '_blank');
  const url = bucket && !/^https?:/i.test(urlOrRef)
    ? await signPrivatePath(bucket, urlOrRef)
    : await resolveStorageUrl(urlOrRef);
  if (!url) {
    win?.close();
    return false;
  }
  if (win) win.location.href = url;
  else window.location.href = url;
  return true;
}

let installed = false;
export function installPrivateStorageShim() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const SRC_TAGS = new Set(['IMG', 'VIDEO', 'SOURCE', 'IFRAME', 'EMBED', 'AUDIO']);
  const origSetAttribute = Element.prototype.setAttribute;
  const apply = (el: Element, name: string, value: string) => {
    const parsed = parsePrivateStorageUrl(value);
    if (!parsed) return false;
    (el as any).__privSrc = value;
    signPrivatePath(parsed.bucket, parsed.path).then((signed) => {
      if ((el as any).__privSrc !== value) return; // src mudou nesse meio tempo
      origSetAttribute.call(el, name, signed || 'data:,');
    });
    return true;
  };

  Element.prototype.setAttribute = function (name: string, value: string) {
    if ((name === 'src' || name === 'poster') && SRC_TAGS.has(this.tagName) && typeof value === 'string') {
      if (apply(this, name, value)) return;
      (this as any).__privSrc = undefined;
    }
    return origSetAttribute.call(this, name, value);
  };

  for (const Ctor of [HTMLImageElement, HTMLVideoElement, HTMLSourceElement, HTMLIFrameElement] as any[]) {
    const desc = Object.getOwnPropertyDescriptor(Ctor.prototype, 'src');
    if (!desc?.set) continue;
    Object.defineProperty(Ctor.prototype, 'src', {
      ...desc,
      set(value: string) {
        if (typeof value === 'string' && apply(this, 'src', value)) return;
        (this as any).__privSrc = undefined;
        desc.set!.call(this, value);
      },
    });
  }

  const origFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    const parsed = parsePrivateStorageUrl(url);
    if (parsed && (!init?.method || init.method.toUpperCase() === 'GET')) {
      const signed = await signPrivatePath(parsed.bucket, parsed.path);
      if (signed) return origFetch(signed, init);
    }
    return origFetch(input as any, init);
  }) as typeof window.fetch;

  const origOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const s = url ? String(url) : '';
    const parsed = parsePrivateStorageUrl(s);
    if (!parsed) return origOpen(url as any, target, features);
    const win = origOpen('', target ?? '_blank', features);
    signPrivatePath(parsed.bucket, parsed.path).then((signed) => {
      if (!signed) return win?.close();
      if (win) win.location.href = signed;
    });
    return win;
  }) as typeof window.open;

  document.addEventListener(
    'click',
    (ev) => {
      const a = (ev.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a as any).__privSigned) return;
      const parsed = parsePrivateStorageUrl(a.href);
      if (!parsed) return;
      ev.preventDefault();
      ev.stopPropagation();
      const download = a.getAttribute('download');
      signPrivatePath(parsed.bucket, parsed.path).then((signed) => {
        if (!signed) return;
        const link = document.createElement('a');
        link.href = signed;
        if (download !== null) link.download = download;
        if (a.target) link.target = a.target;
        link.rel = 'noopener';
        (link as any).__privSigned = true;
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
    },
    true,
  );
}

/** Prefixo de órgão para novos uploads (a política de Storage valida no servidor). */
let orgPromise: Promise<string | null> | null = null;
export function getMyOrganizationId(): Promise<string | null> {
  if (!orgPromise) {
    orgPromise = (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await (supabase.rpc as any)('user_organization_id', { _user_id: u.user.id });
      return (data as string) || null;
    })().catch(() => null);
    orgPromise.then((v) => { if (!v) orgPromise = null; });
  }
  return orgPromise;
}
let lastSessionKey: string | null | undefined;
supabase.auth.onAuthStateChange((_evt, session) => {
  const key = session?.user?.id ?? null;
  // Renovação de token do mesmo usuário não invalida; troca de usuário/logout invalida tudo
  if (lastSessionKey !== undefined && key === lastSessionKey) return;
  lastSessionKey = key;
  orgPromise = null;
  resetPrivateStorageSession();
});

/** Caminho tenant-aware: <org>/<modulo>/<...segmentos>/<arquivo> */
export async function tenantPath(module: string, ...rest: string[]): Promise<string> {
  const org = await getMyOrganizationId();
  if (!org) throw new Error('Organização do usuário não encontrada');
  return [org, module, ...rest].filter(Boolean).join('/');
}
