export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      aditivos: {
        Row: {
          created_at: string
          id: string
          obra_id: string
          preco_unitario: number
          quantidade: number
          servico_codigo: string
          servico_descricao: string
          tipo: string
          unidade: string
          updated_at: string
          user_id: string | null
          valor_total: number
        }
        Insert: {
          created_at?: string
          id?: string
          obra_id: string
          preco_unitario?: number
          quantidade?: number
          servico_codigo: string
          servico_descricao: string
          tipo?: string
          unidade: string
          updated_at?: string
          user_id?: string | null
          valor_total?: number
        }
        Update: {
          created_at?: string
          id?: string
          obra_id?: string
          preco_unitario?: number
          quantidade?: number
          servico_codigo?: string
          servico_descricao?: string
          tipo?: string
          unidade?: string
          updated_at?: string
          user_id?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "aditivos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          changed_fields: string[] | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          operation: string
          record_id: string
          table_name: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          record_id: string
          table_name: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          mime_type: string | null
          name: string
          nucleus_id: string
          size: number | null
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at: string
          url: string
        }
        Insert: {
          id?: string
          mime_type?: string | null
          name: string
          nucleus_id: string
          size?: number | null
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
          url: string
        }
        Update: {
          id?: string
          mime_type?: string | null
          name?: string
          nucleus_id?: string
          size?: number | null
          type?: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_nucleus_id_fkey"
            columns: ["nucleus_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
        ]
      }
      fire_extinguishers: {
        Row: {
          capacity: string | null
          created_at: string
          expiration_date: string
          has_vertical_signage: boolean | null
          hydrostatic_test: string | null
          id: string
          last_inspection: string | null
          location: string
          nucleus_id: string
          serial_number: string | null
          status: Database["public"]["Enums"]["extinguisher_status"]
          support_type: string | null
          type: Database["public"]["Enums"]["extinguisher_type"]
          updated_at: string
        }
        Insert: {
          capacity?: string | null
          created_at?: string
          expiration_date: string
          has_vertical_signage?: boolean | null
          hydrostatic_test?: string | null
          id?: string
          last_inspection?: string | null
          location: string
          nucleus_id: string
          serial_number?: string | null
          status: Database["public"]["Enums"]["extinguisher_status"]
          support_type?: string | null
          type: Database["public"]["Enums"]["extinguisher_type"]
          updated_at?: string
        }
        Update: {
          capacity?: string | null
          created_at?: string
          expiration_date?: string
          has_vertical_signage?: boolean | null
          hydrostatic_test?: string | null
          id?: string
          last_inspection?: string | null
          location?: string
          nucleus_id?: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["extinguisher_status"]
          support_type?: string | null
          type?: Database["public"]["Enums"]["extinguisher_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fire_extinguishers_nucleus_id_fkey"
            columns: ["nucleus_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
        ]
      }
      hydrants: {
        Row: {
          created_at: string
          has_adapter: boolean | null
          has_coupling: boolean | null
          has_hose: boolean | null
          has_key: boolean | null
          has_nozzle: boolean | null
          has_register: boolean | null
          hose_expiration_date: string | null
          id: string
          location: string
          nucleus_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_adapter?: boolean | null
          has_coupling?: boolean | null
          has_hose?: boolean | null
          has_key?: boolean | null
          has_nozzle?: boolean | null
          has_register?: boolean | null
          hose_expiration_date?: string | null
          id?: string
          location: string
          nucleus_id: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_adapter?: boolean | null
          has_coupling?: boolean | null
          has_hose?: boolean | null
          has_key?: boolean | null
          has_nozzle?: boolean | null
          has_register?: boolean | null
          hose_expiration_date?: string | null
          id?: string
          location?: string
          nucleus_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hydrants_nucleus_id_fkey"
            columns: ["nucleus_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          assignee: string
          completed_at: string | null
          created_at: string
          id: string
          location: string
          materials: Json | null
          observations: string[] | null
          priority: string
          process_number: string | null
          request_type: string | null
          services: Json | null
          status: string
          title: string
          travel_id: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assignee: string
          completed_at?: string | null
          created_at?: string
          id?: string
          location: string
          materials?: Json | null
          observations?: string[] | null
          priority: string
          process_number?: string | null
          request_type?: string | null
          services?: Json | null
          status: string
          title: string
          travel_id?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assignee?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          location?: string
          materials?: Json | null
          observations?: string[] | null
          priority?: string
          process_number?: string | null
          request_type?: string | null
          services?: Json | null
          status?: string
          title?: string
          travel_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_travel_id_fkey"
            columns: ["travel_id"]
            isOneToOne: false
            referencedRelation: "travels"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          code: string
          created_at: string
          current_stock: number
          description: string
          id: string
          minimum_stock: number
          unit: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_stock?: number
          description: string
          id?: string
          minimum_stock?: number
          unit: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_stock?: number
          description?: string
          id?: string
          minimum_stock?: number
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: []
      }
      medicoes: {
        Row: {
          ano_execucao: number
          created_at: string
          id: string
          mes_execucao: number
          obra_id: string
          preco_unitario: number
          quantidade_executada: number
          quantidade_projeto: number
          servico_codigo: string
          servico_descricao: string
          unidade: string
          updated_at: string
          user_id: string | null
          valor_executado: number
          valor_total: number
        }
        Insert: {
          ano_execucao: number
          created_at?: string
          id?: string
          mes_execucao: number
          obra_id: string
          preco_unitario?: number
          quantidade_executada?: number
          quantidade_projeto?: number
          servico_codigo: string
          servico_descricao: string
          unidade: string
          updated_at?: string
          user_id?: string | null
          valor_executado?: number
          valor_total?: number
        }
        Update: {
          ano_execucao?: number
          created_at?: string
          id?: string
          mes_execucao?: number
          obra_id?: string
          preco_unitario?: number
          quantidade_executada?: number
          quantidade_projeto?: number
          servico_codigo?: string
          servico_descricao?: string
          unidade?: string
          updated_at?: string
          user_id?: string | null
          valor_executado?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      nuclei: {
        Row: {
          address: string
          city: string
          contact_email: string | null
          contact_phone: string | null
          coordinates_lat: number | null
          coordinates_lng: number | null
          created_at: string
          fire_department_license_document_url: string | null
          fire_department_license_valid_until: string | null
          id: string
          is_agent_mode: boolean
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          city: string
          contact_email?: string | null
          contact_phone?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          fire_department_license_document_url?: string | null
          fire_department_license_valid_until?: string | null
          id?: string
          is_agent_mode?: boolean
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          fire_department_license_document_url?: string | null
          fire_department_license_valid_until?: string | null
          id?: string
          is_agent_mode?: boolean
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      obras: {
        Row: {
          coordinates_lat: number | null
          coordinates_lng: number | null
          created_at: string
          created_by: string | null
          data_inicio: string | null
          documentos: Json | null
          empresa_responsavel: string | null
          fotos: Json | null
          id: string
          municipio: string
          n_contrato: string | null
          nome: string
          porcentagem_execucao: number | null
          previsao_termino: string | null
          secretaria_responsavel: string | null
          status: string
          tipo: string
          updated_at: string
          valor_aditivado: number | null
          valor_executado: number | null
          valor_total: number
        }
        Insert: {
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          created_by?: string | null
          data_inicio?: string | null
          documentos?: Json | null
          empresa_responsavel?: string | null
          fotos?: Json | null
          id?: string
          municipio: string
          n_contrato?: string | null
          nome: string
          porcentagem_execucao?: number | null
          previsao_termino?: string | null
          secretaria_responsavel?: string | null
          status: string
          tipo: string
          updated_at?: string
          valor_aditivado?: number | null
          valor_executado?: number | null
          valor_total: number
        }
        Update: {
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          created_by?: string | null
          data_inicio?: string | null
          documentos?: Json | null
          empresa_responsavel?: string | null
          fotos?: Json | null
          id?: string
          municipio?: string
          n_contrato?: string | null
          nome?: string
          porcentagem_execucao?: number | null
          previsao_termino?: string | null
          secretaria_responsavel?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_aditivado?: number | null
          valor_executado?: number | null
          valor_total?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          sectors: Database["public"]["Enums"]["sector_type"][] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          sectors?: Database["public"]["Enums"]["sector_type"][] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          sectors?: Database["public"]["Enums"]["sector_type"][] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          material_id: string
          quantity: number
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          material_id: string
          quantity: number
          type: Database["public"]["Enums"]["movement_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          material_id?: string
          quantity?: number
          type?: Database["public"]["Enums"]["movement_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      travels: {
        Row: {
          created_at: string
          data_ida: string
          data_volta: string
          destino: string
          id: string
          motivo: string
          servidor: string
          ticket_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_ida: string
          data_volta: string
          destino: string
          id?: string
          motivo: string
          servidor: string
          ticket_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_ida?: string
          data_volta?: string
          destino?: string
          id?: string
          motivo?: string
          servidor?: string
          ticket_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travels_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: string
      }
      is_admin: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
    }
    Enums: {
      document_type: "project" | "fire-license" | "photos" | "report"
      extinguisher_status: "valid" | "expired" | "expiring-soon"
      extinguisher_type: "H2O" | "PQS" | "CO2" | "ABC"
      movement_type: "ENTRADA" | "SAIDA" | "DESCARTE"
      sector_type:
        | "manutencao"
        | "obra"
        | "preventivos"
        | "ar_condicionado"
        | "projetos"
      unit_type: "KG" | "M" | "LITRO" | "PC" | "CX"
      user_role: "admin" | "editor" | "viewer" | "manutencao" | "gm"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      document_type: ["project", "fire-license", "photos", "report"],
      extinguisher_status: ["valid", "expired", "expiring-soon"],
      extinguisher_type: ["H2O", "PQS", "CO2", "ABC"],
      movement_type: ["ENTRADA", "SAIDA", "DESCARTE"],
      sector_type: [
        "manutencao",
        "obra",
        "preventivos",
        "ar_condicionado",
        "projetos",
      ],
      unit_type: ["KG", "M", "LITRO", "PC", "CX"],
      user_role: ["admin", "editor", "viewer", "manutencao", "gm"],
    },
  },
} as const
