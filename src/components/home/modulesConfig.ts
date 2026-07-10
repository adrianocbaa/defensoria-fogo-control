import {
  Shield,
  Wrench,
  Wind,
  HardHat,
  FolderKanban,
  Package,
  Laptop,
  Users,
  Calculator,
  Ruler,
  type LucideIcon,
} from 'lucide-react';
import type { Sector } from '@/hooks/useUserSectors';

export type ModuleCategory = 'Operacionais' | 'Administrativos' | 'Ferramentas Técnicas';

export interface ModuleDef {
  id: Sector;
  title: string;
  category: ModuleCategory;
  icon: LucideIcon;
  path: string;
  inDevelopment?: boolean;
}

/** Rotas reais — devem espelhar as usadas hoje em MainDashboard */
export const MODULES: ModuleDef[] = [
  { id: 'preventivos',     title: 'Preventivos',        category: 'Operacionais',        icon: Shield,       path: '/preventivos' },
  { id: 'manutencao',      title: 'Manutenção',         category: 'Operacionais',        icon: Wrench,       path: '/maintenance' },
  { id: 'ar_condicionado', title: 'Ar-Condicionado',    category: 'Operacionais',        icon: Wind,         path: '#', inDevelopment: true },
  { id: 'obra',            title: 'Obra',               category: 'Operacionais',        icon: HardHat,      path: '/obras' },
  { id: 'projetos',        title: 'Projetos',           category: 'Operacionais',        icon: FolderKanban, path: '#', inDevelopment: true },
  { id: 'almoxarifado',    title: 'Almoxarifado',       category: 'Administrativos',     icon: Package,      path: '/inventory' },
  { id: 'nucleos',         title: 'Teletrabalho',       category: 'Administrativos',     icon: Laptop,       path: '/nucleos' },
  { id: 'nucleos_central', title: 'Núcleos — Cadastro', category: 'Administrativos',     icon: Users,        path: '/nucleos-central' },
  { id: 'orcamento',       title: 'Orçamento',          category: 'Administrativos',     icon: Calculator,   path: '/orcamento' },
  { id: 'dimensionamento', title: 'Dimensionamento',    category: 'Ferramentas Técnicas',icon: Ruler,        path: '/dimensionamento' },
];

/** Ids priorizados no acesso rápido, quando disponíveis */
export const QUICK_ACCESS_ORDER: Sector[] = ['preventivos', 'manutencao', 'obra', 'orcamento'];

/** Agrupamento exibido na sidebar */
export const SIDEBAR_GROUPS: { label: string; ids: Sector[] }[] = [
  { label: 'Operacionais',    ids: ['preventivos', 'manutencao', 'obra'] },
  { label: 'Administrativos', ids: ['almoxarifado', 'nucleos', 'orcamento'] },
];
