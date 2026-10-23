export const INBOUND_POLICIES = {
  any: 'Qualquer remetente', allowed_domains: 'Domínios permitidos', registered_users: 'Usuários cadastrados',
  registered_or_allowed_domains: 'Usuários cadastrados ou domínios permitidos',
};
export type InboundPolicy = keyof typeof INBOUND_POLICIES;
export type InboundConfig = { enabled: boolean; alias: string; policy: InboundPolicy; domains: string; addresses: string };
const domainPattern = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$/;
const list = (v: string) => [...new Set(v.split(/[\s,;]+/).map(s=>s.trim().toLowerCase()).filter(Boolean))].sort();
export function normalizeInboundConfig(v: InboundConfig) {
  return { enabled:v.enabled, alias:v.alias.trim().toLowerCase(), policy:v.policy, domains:list(v.domains), addresses:list(v.addresses) };
}
export function validateInboundConfig(v: InboundConfig): string | null {
  const c=normalizeInboundConfig(v);
  if (c.alias && !/^[a-z0-9][a-z0-9-]{1,40}$/.test(c.alias)) return 'Alias inválido: use de 2 a 41 letras minúsculas, números ou hífen.';
  if (!Object.prototype.hasOwnProperty.call(INBOUND_POLICIES,c.policy)) return 'Selecione a política de remetente.';
  if (c.domains.length>100 || c.domains.some(d=>d.length>253 || !domainPattern.test(d))) return 'Informe domínios válidos, sem @ ou endereço de site.';
  if (c.policy==='allowed_domains' && !c.domains.length) return 'Informe ao menos um domínio permitido.';
  if (c.addresses.length>100 || c.addresses.some(a=> { const [local,domain,...rest]=a.split('@'); return rest.length>0 || a.length>254 || !local || local.length>64 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) || !domain || !domainPattern.test(domain); })) return 'Informe endereços de e-mail válidos.';
  if (c.enabled && !c.alias && !c.addresses.length) return 'Informe um alias ou endereço exato para habilitar o recebimento.';
  return null;
}
export function inboundConfigError(code?: string): string {
  if (code==='23505') return 'Esse alias ou endereço já pertence a outra organização.';
  if (code==='42501') return 'Somente o Super Admin pode alterar esta configuração.';
  if (code==='22023') return 'Revise o alias, os domínios e os endereços informados.';
  return 'Não foi possível salvar a configuração. Tente novamente.';
}