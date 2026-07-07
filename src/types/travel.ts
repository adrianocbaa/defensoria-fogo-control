export interface Travel {
  id: string;
  servidor: string;
  destino: string;
  data_ida: string | null;
  data_volta: string | null;
  motivo: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  /** IDs dos servidores da manutenção envolvidos (nova estrutura multi). */
  manager_ids?: string[];
  ticket_id?: string | null;
}

export interface CreateTravelData {
  servidor: string;
  destino: string;
  data_ida: string | null;
  data_volta: string | null;
  motivo: string;
  manager_ids?: string[];
}
