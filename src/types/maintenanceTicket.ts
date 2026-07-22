import type { TicketService } from '@/hooks/useTicketServices';
import type { TaskPhoto } from '@/components/maintenance/TaskPhotoUploader';

/**
 * Tipo unificado usado pelos modais e pelo Kanban.
 * Combina campos do banco (snake_case ausente aqui — já mapeados) com
 * campos de apresentação (icon, createdAt) e aliases usados na UI.
 */
export interface UITicket {
  id: string;
  ticketNumber?: number;
  title: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  type: string;
  location: string;
  assignee: string;
  status: string;
  createdAt: string;
  icon: any;
  observations?: string[];
  services?: TicketService[];
  materials?: { name: string; completed: boolean }[];
  requestType?: 'email' | 'processo' | 'direto';
  processNumber?: string;
  requestedAt?: string;
  managerId?: string | null;
  /** IDs de todos os servidores da manutenção envolvidos (nova estrutura). */
  managerIds?: string[];
  nucleoId?: string | null;
  completedAt?: Date;
  finalizedAt?: string | null;
  confirmationFileUrl?: string | null;
  confirmationFileName?: string | null;
  finalizationNote?: string | null;
  /** Fotos de referência no nível do procedimento (fiscal → manutenção). */
  referencePhotos?: TaskPhoto[];
  // campos originais (opcionais para compat)
  created_at?: string;
  updated_at?: string;
  travel_id?: string;
  user_id?: string;
}
