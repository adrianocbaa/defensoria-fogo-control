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
}

export interface CreateTravelData {
  servidor: string;
  destino: string;
  data_ida: string | null;
  data_volta: string | null;
  motivo: string;
}