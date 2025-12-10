export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      aditivo_items: {
        Row: {
          aditivo_id: string
          created_at: string
          id: string
          item_code: string
          pct: number
          qtd: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aditivo_id: string
          created_at?: string
          id?: string
          item_code: string
          pct?: number
          qtd?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aditivo_id?: string
          created_at?: string
          id?: string
          item_code?: string
          pct?: number
          qtd?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aditivo_items_aditivo_id_fkey"
            columns: ["aditivo_id"]
            isOneToOne: false
            referencedRelation: "aditivo_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      aditivo_sessions: {
        Row: {
          created_at: string
          id: string
          obra_id: string
          sequencia: number
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          obra_id: string
          sequencia: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          obra_id?: string
          sequencia?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
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
      ata_polos: {
        Row: {
          ata_id: string
          created_at: string
          desconto: number | null
          empresa_id: string | null
          id: string
          polo: string
          regiao: string | null
          seq: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          ata_id: string
          created_at?: string
          desconto?: number | null
          empresa_id?: string | null
          id?: string
          polo: string
          regiao?: string | null
          seq?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          ata_id?: string
          created_at?: string
          desconto?: number | null
          empresa_id?: string | null
          id?: string
          polo?: string
          regiao?: string | null
          seq?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "ata_polos_ata_id_fkey"
            columns: ["ata_id"]
            isOneToOne: false
            referencedRelation: "atas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ata_polos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      atas: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          numero_ata: string
          pregao_eletronico: string | null
          protocolo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          numero_ata: string
          pregao_eletronico?: string | null
          protocolo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          numero_ata?: string
          pregao_eletronico?: string | null
          protocolo?: string | null
          updated_at?: string
        }
        Relationships: []
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
        }
        Relationships: []
      }
      contratos_licitacao: {
        Row: {
          created_at: string
          created_by: string | null
          desconto: number | null
          empresa_id: string | null
          id: string
          numero_contrato: string
          pregao_eletronico: string | null
          protocolo: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          desconto?: number | null
          empresa_id?: string | null
          id?: string
          numero_contrato: string
          pregao_eletronico?: string | null
          protocolo?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          desconto?: number | null
          empresa_id?: string | null
          id?: string
          numero_contrato?: string
          pregao_eletronico?: string | null
          protocolo?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_licitacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_financeiro: {
        Row: {
          created_at: string
          id: string
          nome: string
          obra_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome?: string
          obra_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          obra_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_financeiro_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_items: {
        Row: {
          created_at: string
          cronograma_id: string
          descricao: string
          id: string
          item_numero: number
          total_etapa: number
        }
        Insert: {
          created_at?: string
          cronograma_id: string
          descricao: string
          id?: string
          item_numero: number
          total_etapa?: number
        }
        Update: {
          created_at?: string
          cronograma_id?: string
          descricao?: string
          id?: string
          item_numero?: number
          total_etapa?: number
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_items_cronograma_id_fkey"
            columns: ["cronograma_id"]
            isOneToOne: false
            referencedRelation: "cronograma_financeiro"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_periodos: {
        Row: {
          created_at: string
          id: string
          item_id: string
          percentual: number
          periodo: number
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          percentual?: number
          periodo: number
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          percentual?: number
          periodo?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_periodos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cronograma_items"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "documents_nucleus_id_fkey"
            columns: ["nucleus_id"]
            isOneToOne: false
            referencedRelation: "nuclei_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          id: string
          is_active: boolean
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          is_active?: boolean
          nome_fantasia?: string | null
          razao_social: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          is_active?: boolean
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "fire_extinguishers_nucleus_id_fkey"
            columns: ["nucleus_id"]
            isOneToOne: false
            referencedRelation: "nuclei_secure"
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
          {
            foreignKeyName: "hydrants_nucleus_id_fkey"
            columns: ["nucleus_id"]
            isOneToOne: false
            referencedRelation: "nuclei_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_time: string
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
          user_identifier: string
        }
        Insert: {
          attempt_time?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_identifier: string
        }
        Update: {
          attempt_time?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_identifier?: string
        }
        Relationships: []
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
      medicao_items: {
        Row: {
          created_at: string
          id: string
          item_code: string
          medicao_id: string
          pct: number
          qtd: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_code: string
          medicao_id: string
          pct?: number
          qtd?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_code?: string
          medicao_id?: string
          pct?: number
          qtd?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicao_items_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "medicao_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      medicao_rdo_imports: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          id: string
          medicao_id: string
          obra_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          id?: string
          medicao_id: string
          obra_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          medicao_id?: string
          obra_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicao_rdo_imports_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "medicao_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      medicao_sessions: {
        Row: {
          created_at: string
          id: string
          obra_id: string
          sequencia: number
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          obra_id: string
          sequencia: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          obra_id?: string
          sequencia?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      medicoes: {
        Row: {
          ano_execucao: number
          created_at: string
          id: string
          mes_execucao: number
          numero_medicao: number
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
          numero_medicao?: number
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
          numero_medicao?: number
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
      modules: {
        Row: {
          created_at: string
          has_map: boolean | null
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          has_map?: boolean | null
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          has_map?: boolean | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      nuclei: {
        Row: {
          address: string
          auxiliar_coordenador: string | null
          city: string
          contact_email: string | null
          contact_phone: string | null
          coordenador_substituto: string | null
          coordinates_lat: number | null
          coordinates_lng: number | null
          created_at: string
          email: string | null
          fire_department_license_document_url: string | null
          fire_department_license_valid_until: string | null
          horario_atendimento: string | null
          id: string
          is_agent_mode: boolean
          membro_coordenador: string | null
          name: string
          telefone: string | null
          uf: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          auxiliar_coordenador?: string | null
          city: string
          contact_email?: string | null
          contact_phone?: string | null
          coordenador_substituto?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          email?: string | null
          fire_department_license_document_url?: string | null
          fire_department_license_valid_until?: string | null
          horario_atendimento?: string | null
          id?: string
          is_agent_mode?: boolean
          membro_coordenador?: string | null
          name: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          auxiliar_coordenador?: string | null
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          coordenador_substituto?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          email?: string | null
          fire_department_license_document_url?: string | null
          fire_department_license_valid_until?: string | null
          horario_atendimento?: string | null
          id?: string
          is_agent_mode?: boolean
          membro_coordenador?: string | null
          name?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      nucleo_module_visibility: {
        Row: {
          created_at: string
          id: string
          module_key: string
          nucleo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_key: string
          nucleo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_key?: string
          nucleo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nucleo_module_visibility_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "nucleo_module_visibility_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos_central"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nucleo_module_visibility_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos_central_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nucleo_module_visibility_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "vw_nucleos_public"
            referencedColumns: ["id"]
          },
        ]
      }
      nucleo_teletrabalho: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          motivo: string | null
          nucleo_id: string
          portaria: string | null
          portaria_file: string | null
          procedimento: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          motivo?: string | null
          nucleo_id: string
          portaria?: string | null
          portaria_file?: string | null
          procedimento: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          motivo?: string | null
          nucleo_id?: string
          portaria?: string | null
          portaria_file?: string | null
          procedimento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nucleo_teletrabalho_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos_central"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nucleo_teletrabalho_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos_central_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nucleo_teletrabalho_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "vw_nucleos_public"
            referencedColumns: ["id"]
          },
        ]
      }
      nucleos_central: {
        Row: {
          auxiliar_coordenador: string | null
          cidade: string
          coordenador_substituto: string | null
          created_at: string
          email: string | null
          endereco: string
          horario_atendimento: string | null
          id: string
          lat: number | null
          lng: number | null
          membro_coordenador: string | null
          nome: string
          telefone_auxiliar_coordenador: string | null
          telefone_coordenador_substituto: string | null
          telefone_membro_coordenador: string | null
          telefones: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auxiliar_coordenador?: string | null
          cidade: string
          coordenador_substituto?: string | null
          created_at?: string
          email?: string | null
          endereco: string
          horario_atendimento?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          membro_coordenador?: string | null
          nome: string
          telefone_auxiliar_coordenador?: string | null
          telefone_coordenador_substituto?: string | null
          telefone_membro_coordenador?: string | null
          telefones?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auxiliar_coordenador?: string | null
          cidade?: string
          coordenador_substituto?: string | null
          created_at?: string
          email?: string | null
          endereco?: string
          horario_atendimento?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          membro_coordenador?: string | null
          nome?: string
          telefone_auxiliar_coordenador?: string | null
          telefone_coordenador_substituto?: string | null
          telefone_membro_coordenador?: string | null
          telefones?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      obra_checklist_items: {
        Row: {
          created_at: string | null
          data_atualizacao: string | null
          descricao_atividade: string
          has_subtasks: boolean | null
          id: string
          informacao: string | null
          is_custom: boolean | null
          obra_id: string
          observacoes: string | null
          ordem: number
          parent_id: string | null
          situacao: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_atualizacao?: string | null
          descricao_atividade: string
          has_subtasks?: boolean | null
          id?: string
          informacao?: string | null
          is_custom?: boolean | null
          obra_id: string
          observacoes?: string | null
          ordem?: number
          parent_id?: string | null
          situacao?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_atualizacao?: string | null
          descricao_atividade?: string
          has_subtasks?: boolean | null
          id?: string
          informacao?: string | null
          is_custom?: boolean | null
          obra_id?: string
          observacoes?: string | null
          ordem?: number
          parent_id?: string | null
          situacao?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_checklist_items_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_checklist_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "obra_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          aditivo_prazo: number | null
          coordinates_lat: number | null
          coordinates_lng: number | null
          created_at: string
          created_by: string | null
          data_inicio: string | null
          data_prevista_inauguracao: string | null
          documentos: Json | null
          empresa_id: string | null
          empresa_responsavel: string | null
          fotos: Json | null
          id: string
          is_public: boolean
          municipio: string
          n_contrato: string | null
          nome: string
          obra_bloqueada: boolean | null
          percentual_desconto: number | null
          porcentagem_execucao: number | null
          previsao_termino: string | null
          regiao: string | null
          secretaria_responsavel: string | null
          sem_previsao_inauguracao: boolean | null
          status: string
          status_inauguracao: string | null
          tem_placa_inauguracao: boolean | null
          tempo_obra: number | null
          tipo: string
          updated_at: string
          valor_aditivado: number | null
          valor_executado: number | null
          valor_total: number
        }
        Insert: {
          aditivo_prazo?: number | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          created_by?: string | null
          data_inicio?: string | null
          data_prevista_inauguracao?: string | null
          documentos?: Json | null
          empresa_id?: string | null
          empresa_responsavel?: string | null
          fotos?: Json | null
          id?: string
          is_public?: boolean
          municipio: string
          n_contrato?: string | null
          nome: string
          obra_bloqueada?: boolean | null
          percentual_desconto?: number | null
          porcentagem_execucao?: number | null
          previsao_termino?: string | null
          regiao?: string | null
          secretaria_responsavel?: string | null
          sem_previsao_inauguracao?: boolean | null
          status: string
          status_inauguracao?: string | null
          tem_placa_inauguracao?: boolean | null
          tempo_obra?: number | null
          tipo: string
          updated_at?: string
          valor_aditivado?: number | null
          valor_executado?: number | null
          valor_total: number
        }
        Update: {
          aditivo_prazo?: number | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          created_by?: string | null
          data_inicio?: string | null
          data_prevista_inauguracao?: string | null
          documentos?: Json | null
          empresa_id?: string | null
          empresa_responsavel?: string | null
          fotos?: Json | null
          id?: string
          is_public?: boolean
          municipio?: string
          n_contrato?: string | null
          nome?: string
          obra_bloqueada?: boolean | null
          percentual_desconto?: number | null
          porcentagem_execucao?: number | null
          previsao_termino?: string | null
          regiao?: string | null
          secretaria_responsavel?: string | null
          sem_previsao_inauguracao?: boolean | null
          status?: string
          status_inauguracao?: string | null
          tem_placa_inauguracao?: boolean | null
          tempo_obra?: number | null
          tipo?: string
          updated_at?: string
          valor_aditivado?: number | null
          valor_executado?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "obras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_items: {
        Row: {
          aditivo_num: number | null
          banco: string
          codigo: string
          created_at: string
          descricao: string
          eh_administracao_local: boolean
          id: string
          item: string
          nivel: number
          obra_id: string
          ordem: number | null
          origem: string
          quantidade: number
          total_contrato: number
          unidade: string
          updated_at: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          aditivo_num?: number | null
          banco: string
          codigo: string
          created_at?: string
          descricao: string
          eh_administracao_local?: boolean
          id?: string
          item: string
          nivel?: number
          obra_id: string
          ordem?: number | null
          origem?: string
          quantidade?: number
          total_contrato?: number
          unidade: string
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          aditivo_num?: number | null
          banco?: string
          codigo?: string
          created_at?: string
          descricao?: string
          eh_administracao_local?: boolean
          id?: string
          item?: string
          nivel?: number
          obra_id?: string
          ordem?: number | null
          origem?: string
          quantidade?: number
          total_contrato?: number
          unidade?: string
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: []
      }
      password_resets: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          display_name: string | null
          email: string | null
          empresa_id: string | null
          force_password_change: boolean | null
          id: string
          is_active: boolean
          language: string | null
          phone: string | null
          position: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          sectors: Database["public"]["Enums"]["sector_type"][] | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          empresa_id?: string | null
          force_password_change?: boolean | null
          id?: string
          is_active?: boolean
          language?: string | null
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          sectors?: Database["public"]["Enums"]["sector_type"][] | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          empresa_id?: string | null
          force_password_change?: boolean | null
          id?: string
          is_active?: boolean
          language?: string | null
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          sectors?: Database["public"]["Enums"]["sector_type"][] | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          age: number | null
          built_area: number | null
          condition: string | null
          constraints: string | null
          created_at: string | null
          id: string
          kind: string
          land_area: number | null
          lat: number | null
          lon: number | null
          org_id: string | null
          quality: string | null
          updated_at: string | null
          zoning: string | null
        }
        Insert: {
          address: string
          age?: number | null
          built_area?: number | null
          condition?: string | null
          constraints?: string | null
          created_at?: string | null
          id?: string
          kind: string
          land_area?: number | null
          lat?: number | null
          lon?: number | null
          org_id?: string | null
          quality?: string | null
          updated_at?: string | null
          zoning?: string | null
        }
        Update: {
          address?: string
          age?: number | null
          built_area?: number | null
          condition?: string | null
          constraints?: string | null
          created_at?: string | null
          id?: string
          kind?: string
          land_area?: number | null
          lat?: number | null
          lon?: number | null
          org_id?: string | null
          quality?: string | null
          updated_at?: string | null
          zoning?: string | null
        }
        Relationships: []
      }
      rdo_activities: {
        Row: {
          created_at: string
          descricao: string
          executado_dia: number | null
          id: string
          item_code: string | null
          obra_id: string
          observacao: string | null
          orcamento_item_id: string | null
          progresso: number | null
          qtd: number | null
          quantidade_total: number | null
          report_id: string
          status: string | null
          tipo: string | null
          unidade: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          executado_dia?: number | null
          id?: string
          item_code?: string | null
          obra_id: string
          observacao?: string | null
          orcamento_item_id?: string | null
          progresso?: number | null
          qtd?: number | null
          quantidade_total?: number | null
          report_id: string
          status?: string | null
          tipo?: string | null
          unidade?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          executado_dia?: number | null
          id?: string
          item_code?: string | null
          obra_id?: string
          observacao?: string | null
          orcamento_item_id?: string | null
          progresso?: number | null
          qtd?: number | null
          quantidade_total?: number | null
          report_id?: string
          status?: string | null
          tipo?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rdo_activities_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_activities_orcamento_item_id_fkey"
            columns: ["orcamento_item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_activities_orcamento_item_id_fkey"
            columns: ["orcamento_item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_items_hierarquia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_activities_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "rdo_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_activity_notes: {
        Row: {
          activity_id: string
          created_at: string
          created_by: string | null
          id: string
          item_ref: string | null
          orcamento_item_id: string | null
          report_id: string
          source: string | null
          texto: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_ref?: string | null
          orcamento_item_id?: string | null
          report_id: string
          source?: string | null
          texto: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_ref?: string | null
          orcamento_item_id?: string | null
          report_id?: string
          source?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_activity_notes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "rdo_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_activity_notes_orcamento_item_id_fkey"
            columns: ["orcamento_item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_activity_notes_orcamento_item_id_fkey"
            columns: ["orcamento_item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_items_hierarquia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_activity_notes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "rdo_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_audit_log: {
        Row: {
          acao: string
          actor_id: string | null
          actor_nome: string | null
          created_at: string
          detalhes: Json | null
          id: string
          obra_id: string
          report_id: string
        }
        Insert: {
          acao: string
          actor_id?: string | null
          actor_nome?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          obra_id: string
          report_id: string
        }
        Update: {
          acao?: string
          actor_id?: string | null
          actor_nome?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          obra_id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_audit_log_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_audit_log_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "rdo_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_comments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          obra_id: string
          report_id: string
          texto: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          obra_id: string
          report_id: string
          texto: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          obra_id?: string
          report_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_comments_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "rdo_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_config: {
        Row: {
          chosen_by: string | null
          created_at: string
          locked_at: string
          modo_atividades: string
          obra_id: string
          updated_at: string
        }
        Insert: {
          chosen_by?: string | null
          created_at?: string
          locked_at?: string
          modo_atividades: string
          obra_id: string
          updated_at?: string
        }
        Update: {
          chosen_by?: string | null
          created_at?: string
          locked_at?: string
          modo_atividades?: string
          obra_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_config_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: true
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_dias_sem_expediente: {
        Row: {
          created_at: string
          data: string
          id: string
          marcado_por: string | null
          obra_id: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          marcado_por?: string | null
          obra_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          marcado_por?: string | null
          obra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_dias_sem_expediente_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_equipment: {
        Row: {
          created_at: string
          equipamento: string
          horas_trabalhadas: number | null
          id: string
          obra_id: string
          observacao: string | null
          proprio_ou_terceiro: string | null
          report_id: string
          situacao: string | null
        }
        Insert: {
          created_at?: string
          equipamento: string
          horas_trabalhadas?: number | null
          id?: string
          obra_id: string
          observacao?: string | null
          proprio_ou_terceiro?: string | null
          report_id: string
          situacao?: string | null
        }
        Update: {
          created_at?: string
          equipamento?: string
          horas_trabalhadas?: number | null
          id?: string
          obra_id?: string
          observacao?: string | null
          proprio_ou_terceiro?: string | null
          report_id?: string
          situacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rdo_equipment_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_equipment_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "rdo_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_media: {
        Row: {
          created_at: string
          descricao: string | null
          file_url: string
          id: string
          obra_id: string
          report_id: string
          thumb_url: string | null
          tipo: Database["public"]["Enums"]["rdo_media_type"]
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          file_url: string
          id?: string
          obra_id: string
          report_id: string
          thumb_url?: string | null
          tipo: Database["public"]["Enums"]["rdo_media_type"]
        }
        Update: {
          created_at?: string
          descricao?: string | null
          file_url?: string
          id?: string
          obra_id?: string
          report_id?: string
          thumb_url?: string | null
          tipo?: Database["public"]["Enums"]["rdo_media_type"]
        }
        Relationships: [
          {
            foreignKeyName: "rdo_media_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_media_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "rdo_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_occurrences: {
        Row: {
          acao_imediata: string | null
          created_at: string
          descricao: string | null
          gravidade: number | null
          id: string
          impacto_cronograma: boolean | null
          obra_id: string
          report_id: string
          titulo: string
        }
        Insert: {
          acao_imediata?: string | null
          created_at?: string
          descricao?: string | null
          gravidade?: number | null
          id?: string
          impacto_cronograma?: boolean | null
          obra_id: string
          report_id: string
          titulo: string
        }
        Update: {
          acao_imediata?: string | null
          created_at?: string
          descricao?: string | null
          gravidade?: number | null
          id?: string
          impacto_cronograma?: boolean | null
          obra_id?: string
          report_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_occurrences_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_occurrences_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "rdo_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_reports: {
        Row: {
          aprovacao_observacao: string | null
          assinatura_contratada_cargo: string | null
          assinatura_contratada_datetime: string | null
          assinatura_contratada_documento: string | null
          assinatura_contratada_nome: string | null
          assinatura_contratada_url: string | null
          assinatura_contratada_validado_em: string | null
          assinatura_empresa_url: string | null
          assinatura_fiscal_cargo: string | null
          assinatura_fiscal_datetime: string | null
          assinatura_fiscal_documento: string | null
          assinatura_fiscal_nome: string | null
          assinatura_fiscal_url: string | null
          assinatura_fiscal_validado_em: string | null
          clima_manha: string | null
          clima_noite: string | null
          clima_tarde: string | null
          cond_manha: string | null
          cond_noite: string | null
          cond_tarde: string | null
          contratada_concluido_em: string | null
          created_at: string
          created_by: string | null
          data: string
          fiscal_concluido_em: string | null
          hash_verificacao: string | null
          id: string
          modo_atividades: string | null
          numero_seq: number
          obra_id: string
          observacoes: string | null
          pdf_url: string | null
          pluviometria_mm: number | null
          status: Database["public"]["Enums"]["rdo_status"]
          template_id: string | null
          updated_at: string
        }
        Insert: {
          aprovacao_observacao?: string | null
          assinatura_contratada_cargo?: string | null
          assinatura_contratada_datetime?: string | null
          assinatura_contratada_documento?: string | null
          assinatura_contratada_nome?: string | null
          assinatura_contratada_url?: string | null
          assinatura_contratada_validado_em?: string | null
          assinatura_empresa_url?: string | null
          assinatura_fiscal_cargo?: string | null
          assinatura_fiscal_datetime?: string | null
          assinatura_fiscal_documento?: string | null
          assinatura_fiscal_nome?: string | null
          assinatura_fiscal_url?: string | null
          assinatura_fiscal_validado_em?: string | null
          clima_manha?: string | null
          clima_noite?: string | null
          clima_tarde?: string | null
          cond_manha?: string | null
          cond_noite?: string | null
          cond_tarde?: string | null
          contratada_concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          data: string
          fiscal_concluido_em?: string | null
          hash_verificacao?: string | null
          id?: string
          modo_atividades?: string | null
          numero_seq: number
          obra_id: string
          observacoes?: string | null
          pdf_url?: string | null
          pluviometria_mm?: number | null
          status?: Database["public"]["Enums"]["rdo_status"]
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          aprovacao_observacao?: string | null
          assinatura_contratada_cargo?: string | null
          assinatura_contratada_datetime?: string | null
          assinatura_contratada_documento?: string | null
          assinatura_contratada_nome?: string | null
          assinatura_contratada_url?: string | null
          assinatura_contratada_validado_em?: string | null
          assinatura_empresa_url?: string | null
          assinatura_fiscal_cargo?: string | null
          assinatura_fiscal_datetime?: string | null
          assinatura_fiscal_documento?: string | null
          assinatura_fiscal_nome?: string | null
          assinatura_fiscal_url?: string | null
          assinatura_fiscal_validado_em?: string | null
          clima_manha?: string | null
          clima_noite?: string | null
          clima_tarde?: string | null
          cond_manha?: string | null
          cond_noite?: string | null
          cond_tarde?: string | null
          contratada_concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          fiscal_concluido_em?: string | null
          hash_verificacao?: string | null
          id?: string
          modo_atividades?: string | null
          numero_seq?: number
          obra_id?: string
          observacoes?: string | null
          pdf_url?: string | null
          pluviometria_mm?: number | null
          status?: Database["public"]["Enums"]["rdo_status"]
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_reports_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "rdo_templates_atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_templates_atividades: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          itens: Json
          tipo_obra: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          itens?: Json
          tipo_obra?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          itens?: Json
          tipo_obra?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      rdo_ui_prefs: {
        Row: {
          created_at: string | null
          id: string
          last_section: string | null
          obra_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_section?: string | null
          obra_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_section?: string | null
          obra_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rdo_ui_prefs_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: true
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_visits: {
        Row: {
          assunto: string | null
          cargo: string | null
          created_at: string
          hora: string | null
          id: string
          instituicao: string | null
          obra_id: string
          report_id: string
          visitante: string
        }
        Insert: {
          assunto?: string | null
          cargo?: string | null
          created_at?: string
          hora?: string | null
          id?: string
          instituicao?: string | null
          obra_id: string
          report_id: string
          visitante: string
        }
        Update: {
          assunto?: string | null
          cargo?: string | null
          created_at?: string
          hora?: string | null
          id?: string
          instituicao?: string | null
          obra_id?: string
          report_id?: string
          visitante?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_visits_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_visits_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "rdo_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_workforce: {
        Row: {
          created_at: string
          funcao: string
          horas: number
          id: string
          obra_id: string
          observacao: string | null
          origem: string | null
          quantidade: number
          report_id: string
        }
        Insert: {
          created_at?: string
          funcao: string
          horas?: number
          id?: string
          obra_id: string
          observacao?: string | null
          origem?: string | null
          quantidade?: number
          report_id: string
        }
        Update: {
          created_at?: string
          funcao?: string
          horas?: number
          id?: string
          obra_id?: string
          observacao?: string | null
          origem?: string | null
          quantidade?: number
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_workforce_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_workforce_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "rdo_reports"
            referencedColumns: ["id"]
          },
        ]
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
      user_obra_access: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          obra_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          obra_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          obra_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_obra_access_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      medicao_acumulado_por_item: {
        Row: {
          item_code: string | null
          obra_id: string | null
          pct_sum: number | null
          qtd_sum: number | null
          total_sum: number | null
        }
        Relationships: []
      }
      medicao_contrato_atual_por_item: {
        Row: {
          contrato_total_atual: number | null
          item_code: string | null
          medicao_sequencia: number | null
          obra_id: string | null
        }
        Relationships: []
      }
      nuclei_secure: {
        Row: {
          address: string | null
          auxiliar_coordenador: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          coordenador_substituto: string | null
          coordinates_lat: number | null
          coordinates_lng: number | null
          created_at: string | null
          email: string | null
          fire_department_license_document_url: string | null
          fire_department_license_valid_until: string | null
          horario_atendimento: string | null
          id: string | null
          is_agent_mode: boolean | null
          membro_coordenador: string | null
          name: string | null
          telefone: string | null
          uf: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          auxiliar_coordenador?: string | null
          city?: string | null
          contact_email?: never
          contact_phone?: never
          coordenador_substituto?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string | null
          email?: never
          fire_department_license_document_url?: string | null
          fire_department_license_valid_until?: string | null
          horario_atendimento?: string | null
          id?: string | null
          is_agent_mode?: boolean | null
          membro_coordenador?: string | null
          name?: string | null
          telefone?: never
          uf?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          auxiliar_coordenador?: string | null
          city?: string | null
          contact_email?: never
          contact_phone?: never
          coordenador_substituto?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string | null
          email?: never
          fire_department_license_document_url?: string | null
          fire_department_license_valid_until?: string | null
          horario_atendimento?: string | null
          id?: string | null
          is_agent_mode?: boolean | null
          membro_coordenador?: string | null
          name?: string | null
          telefone?: never
          uf?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nucleos_central_public: {
        Row: {
          cidade: string | null
          created_at: string | null
          endereco: string | null
          horario_atendimento: string | null
          id: string | null
          lat: number | null
          lng: number | null
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string | null
          endereco?: string | null
          horario_atendimento?: string | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string | null
          endereco?: string | null
          horario_atendimento?: string | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      orcamento_items_hierarquia: {
        Row: {
          aditivo_num: number | null
          banco: string | null
          calculated_level: number | null
          codigo: string | null
          created_at: string | null
          descricao: string | null
          eh_administracao_local: boolean | null
          id: string | null
          is_macro: boolean | null
          item: string | null
          nivel: number | null
          obra_id: string | null
          ordem: number | null
          origem: string | null
          parent_code: string | null
          quantidade: number | null
          total_contrato: number | null
          unidade: string | null
          updated_at: string | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Relationships: []
      }
      profiles_secure: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          display_name: string | null
          email: string | null
          id: string | null
          language: string | null
          phone: string | null
          position: string | null
          theme: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string | null
          language?: string | null
          phone?: string | null
          position?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string | null
          language?: string | null
          phone?: string | null
          position?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rdo_activities_acumulado: {
        Row: {
          data: string | null
          executado_acumulado: number | null
          obra_id: string | null
          orcamento_item_id: string | null
          percentual_acumulado: number | null
          quantidade_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rdo_activities_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_activities_orcamento_item_id_fkey"
            columns: ["orcamento_item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_activities_orcamento_item_id_fkey"
            columns: ["orcamento_item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_items_hierarquia"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_nucleos_public: {
        Row: {
          cidade: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string | null
          lat: number | null
          lng: number | null
          nome: string | null
          telefones: string | null
          updated_at: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          nome?: string | null
          telefones?: string | null
          updated_at?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          nome?: string | null
          telefones?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vw_planilha_hierarquia: {
        Row: {
          aditivo_num: number | null
          ancestors: string[] | null
          ancestors_desc: string[] | null
          calculated_level: number | null
          codigo: string | null
          descricao: string | null
          id: string | null
          is_macro: boolean | null
          is_under_administracao: boolean | null
          item: string | null
          nivel: number | null
          obra_id: string | null
          ordem: number | null
          origem: string | null
          parent_code: string | null
          quantidade_total: number | null
          total_contrato: number | null
          unidade: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_edit: { Args: { user_uuid?: string }; Returns: boolean }
      can_edit_rdo: { Args: { user_uuid?: string }; Returns: boolean }
      can_view_sensitive_data: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      cleanup_expired_reset_codes: { Args: never; Returns: undefined }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      create_attachment: {
        Args: {
          p_kind: string
          p_meta_json?: Json
          p_owner_id: string
          p_owner_type: string
          p_url: string
        }
        Returns: string
      }
      create_comparable: {
        Args: {
          p_age?: number
          p_built_area?: number
          p_condition?: string
          p_date: string
          p_deal_type: string
          p_kind: string
          p_land_area?: number
          p_lat?: number
          p_lon?: number
          p_notes?: string
          p_price_total: number
          p_price_unit?: number
          p_quality?: string
          p_source: string
        }
        Returns: string
      }
      create_project: {
        Args: {
          p_approach: string
          p_base_date: string
          p_property_id?: string
          p_purpose: string
        }
        Returns: string
      }
      create_property: {
        Args: {
          p_address: string
          p_age?: number
          p_built_area?: number
          p_condition?: string
          p_constraints?: string
          p_kind: string
          p_land_area?: number
          p_lat?: number
          p_lon?: number
          p_quality?: string
          p_zoning?: string
        }
        Returns: string
      }
      create_report: {
        Args: {
          p_pdf_url: string
          p_project_id: string
          p_signature_hash: string
        }
        Returns: string
      }
      delete_project: { Args: { project_id: string }; Returns: boolean }
      get_comparables: {
        Args: never
        Returns: {
          age: number
          attachments: Json
          built_area: number
          condition: string
          created_at: string
          date: string
          deal_type: string
          exposure_time: number
          id: string
          kind: string
          land_area: number
          lat: number
          lon: number
          notes: string
          org_id: string
          payment_terms: string
          price_total: number
          price_unit: number
          quality: string
          source: string
        }[]
      }
      get_project_by_id: {
        Args: { project_id: string }
        Returns: {
          approach: string
          base_date: string
          created_at: string
          created_by: string
          id: string
          org_id: string
          property_id: string
          purpose: string
          status: string
          updated_at: string
        }[]
      }
      get_project_reports: {
        Args: { project_id: string }
        Returns: {
          id: string
          pdf_url: string
          published_at: string
          signature_hash: string
          version: number
        }[]
      }
      get_projects: {
        Args: never
        Returns: {
          approach: string
          base_date: string
          created_at: string
          created_by: string
          id: string
          org_id: string
          property_id: string
          purpose: string
          status: string
          updated_at: string
        }[]
      }
      get_properties: {
        Args: never
        Returns: {
          address: string
          age: number
          built_area: number
          condition: string
          constraints: string
          created_at: string
          id: string
          kind: string
          land_area: number
          lat: number
          lon: number
          org_id: string
          quality: string
          updated_at: string
          zoning: string
        }[]
      }
      get_user_role: { Args: { user_uuid: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_uuid?: string }; Returns: boolean }
      is_contratada: { Args: { user_uuid?: string }; Returns: boolean }
      log_login_attempt: {
        Args: {
          p_identifier: string
          p_ip_address?: unknown
          p_success: boolean
          p_user_agent?: string
        }
        Returns: undefined
      }
      unaccent: { Args: { "": string }; Returns: string }
      update_project: {
        Args: {
          p_approach?: string
          p_base_date?: string
          p_purpose?: string
          p_status?: string
          project_id: string
        }
        Returns: boolean
      }
      update_property: {
        Args: {
          p_address?: string
          p_age?: number
          p_built_area?: number
          p_condition?: string
          p_constraints?: string
          p_kind?: string
          p_land_area?: number
          p_lat?: number
          p_lon?: number
          p_quality?: string
          p_zoning?: string
          property_id: string
        }
        Returns: {
          address: string
          age: number
          built_area: number
          condition: string
          constraints: string
          created_at: string
          id: string
          kind: string
          land_area: number
          lat: number
          lon: number
          org_id: string
          quality: string
          updated_at: string
          zoning: string
        }[]
      }
      user_has_obra_access: {
        Args: { obra_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      document_type: "project" | "fire-license" | "photos" | "report"
      extinguisher_status: "valid" | "expired" | "expiring-soon"
      extinguisher_type: "H2O" | "PQS" | "CO2" | "ABC"
      movement_type: "ENTRADA" | "SAIDA" | "DESCARTE"
      rdo_media_type: "foto" | "video"
      rdo_status:
        | "rascunho"
        | "preenchendo"
        | "concluido"
        | "aprovado"
        | "reprovado"
      sector_type:
        | "manutencao"
        | "obra"
        | "preventivos"
        | "ar_condicionado"
        | "projetos"
        | "almoxarifado"
        | "nucleos"
        | "nucleos_central"
      unit_type: "KG" | "M" | "LITRO" | "PC" | "CX"
      user_role:
        | "admin"
        | "editor"
        | "viewer"
        | "manutencao"
        | "gm"
        | "prestadora"
        | "contratada"
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
      rdo_media_type: ["foto", "video"],
      rdo_status: [
        "rascunho",
        "preenchendo",
        "concluido",
        "aprovado",
        "reprovado",
      ],
      sector_type: [
        "manutencao",
        "obra",
        "preventivos",
        "ar_condicionado",
        "projetos",
        "almoxarifado",
        "nucleos",
        "nucleos_central",
      ],
      unit_type: ["KG", "M", "LITRO", "PC", "CX"],
      user_role: [
        "admin",
        "editor",
        "viewer",
        "manutencao",
        "gm",
        "prestadora",
        "contratada",
      ],
    },
  },
} as const
