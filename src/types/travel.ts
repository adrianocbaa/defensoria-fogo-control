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
  /** Quantidade de diárias solicitadas (0.5, 1.0, 1.5, ...). Usado para
   *  calcular a data de volta automaticamente e para o controle mensal. */
  diarias?: number | null;
}

export interface CreateTravelData {
  servidor: string;
  destino: string;
  data_ida: string | null;
  data_volta: string | null;
  motivo: string;
  manager_ids?: string[];
  diarias?: number | null;
}
