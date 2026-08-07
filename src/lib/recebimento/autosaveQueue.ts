import type { VerificacaoStatus } from '@/lib/recebimento/constants';

/** Rascunho local de uma resposta de verificação ainda não confirmada pelo servidor. */
export interface DraftEntry {
  verificacaoId: string;
  status: VerificacaoStatus;
  ts: number;
}

const PREFIX = 'recebimento_autosave_v1:';

const key = (vistoriaId: string) => `${PREFIX}${vistoriaId}`;

function safeParse(raw: string | null): DraftEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DraftEntry[]) : [];
  } catch {
    return [];
  }
}

export function loadDrafts(vistoriaId: string): DraftEntry[] {
  try {
    return safeParse(localStorage.getItem(key(vistoriaId)));
  } catch {
    return [];
  }
}

function save(vistoriaId: string, entries: DraftEntry[]) {
  try {
    if (entries.length === 0) localStorage.removeItem(key(vistoriaId));
    else localStorage.setItem(key(vistoriaId), JSON.stringify(entries));
  } catch {
    /* storage cheio/indisponível — segue apenas em memória */
  }
}

/** Adiciona/atualiza rascunhos (último valor por verificação vence). */
export function enqueueDrafts(
  vistoriaId: string,
  updates: { verificacaoId: string; status: VerificacaoStatus }[],
): DraftEntry[] {
  const atual = loadDrafts(vistoriaId);
  const map = new Map(atual.map((d) => [d.verificacaoId, d]));
  const ts = Date.now();
  for (const u of updates) map.set(u.verificacaoId, { ...u, ts });
  const next = Array.from(map.values());
  save(vistoriaId, next);
  return next;
}

/** Remove rascunhos já persistidos, preservando alterações mais recentes. */
export function ackDrafts(vistoriaId: string, acked: DraftEntry[]): DraftEntry[] {
  const ackMap = new Map(acked.map((d) => [d.verificacaoId, d.ts]));
  const next = loadDrafts(vistoriaId).filter((d) => {
    const t = ackMap.get(d.verificacaoId);
    return t === undefined || d.ts > t;
  });
  save(vistoriaId, next);
  return next;
}

export function clearDrafts(vistoriaId: string) {
  save(vistoriaId, []);
}
