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
    PostgrestVersion: "12.2.3"
  }
  public: {
    Tables: {
      addons: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          key: string
          nome: string
          quantidade: number
          tipo: string
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          key: string
          nome: string
          quantidade: number
          tipo: string
          unidade: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          key?: string
          nome?: string
          quantidade?: number
          tipo?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          valor_unitario: number | null
          valor_unitario_bruto: number | null
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
          valor_unitario?: number | null
          valor_unitario_bruto?: number | null
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
          valor_unitario?: number | null
          valor_unitario_bruto?: number | null
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
          nova_data_termino: string | null
          numero_art: string | null
          obra_id: string
          observacao: string | null
          prazo_dias: number | null
          sequencia: number
          status: string
          tipo_aditivo: string | null
          updated_at: string
          user_id: string | null
          valor_acrescimo: number | null
          valor_supressao: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          nova_data_termino?: string | null
          numero_art?: string | null
          obra_id: string
          observacao?: string | null
          prazo_dias?: number | null
          sequencia: number
          status?: string
          tipo_aditivo?: string | null
          updated_at?: string
          user_id?: string | null
          valor_acrescimo?: number | null
          valor_supressao?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          nova_data_termino?: string | null
          numero_art?: string | null
          obra_id?: string
          observacao?: string | null
          prazo_dias?: number | null
          sequencia?: number
          status?: string
          tipo_aditivo?: string | null
          updated_at?: string
          user_id?: string | null
          valor_acrescimo?: number | null
          valor_supressao?: number | null
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
      arbitration_policies: {
        Row: {
          codigo: string
          created_at: string
          id: string
          organization_id: string | null
          origem: string
          percentual_inferior: number
          percentual_superior: number
          status: string
          versao: number
        }
        Insert: {
          codigo: string
          created_at?: string
          id?: string
          organization_id?: string | null
          origem?: string
          percentual_inferior: number
          percentual_superior: number
          status?: string
          versao: number
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          origem?: string
          percentual_inferior?: number
          percentual_superior?: number
          status?: string
          versao?: number
        }
        Relationships: []
      }
      ata_polos: {
        Row: {
          ata_id: string
          created_at: string
          desconto: number | null
          empresa_id: string | null
          id: string
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "ata_polos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      atas: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          numero_ata: string
          organization_id: string | null
          pregao_eletronico: string | null
          protocolo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          numero_ata: string
          organization_id?: string | null
          pregao_eletronico?: string | null
          protocolo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          numero_ata?: string
          organization_id?: string | null
          pregao_eletronico?: string | null
          protocolo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      atributos_imobiliarios: {
        Row: {
          ativo: boolean
          categoria: string
          codigo: string
          created_at: string
          data_type: string
          id: string
          modelable: boolean
          nome: string
          opcoes: Json | null
          ordem: number
          organization_id: string | null
          unidade: string | null
        }
        Insert: {
          ativo?: boolean
          categoria: string
          codigo: string
          created_at?: string
          data_type: string
          id?: string
          modelable?: boolean
          nome: string
          opcoes?: Json | null
          ordem?: number
          organization_id?: string | null
          unidade?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          codigo?: string
          created_at?: string
          data_type?: string
          id?: string
          modelable?: boolean
          nome?: string
          opcoes?: Json | null
          ordem?: number
          organization_id?: string | null
          unidade?: string | null
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          actor_id: string | null
          avaliacao_id: string | null
          created_at: string
          details_json: Json
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          organization_id: string
        }
        Insert: {
          actor_id?: string | null
          avaliacao_id?: string | null
          created_at?: string
          details_json?: Json
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          organization_id: string
        }
        Update: {
          actor_id?: string | null
          avaliacao_id?: string | null
          created_at?: string
          details_json?: Json
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          record_id?: string
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      aval_impact_rules: {
        Row: {
          campo: string
          descricao: string
          entity_type: string
          nivel: string
        }
        Insert: {
          campo: string
          descricao: string
          entity_type: string
          nivel: string
        }
        Update: {
          campo?: string
          descricao?: string
          entity_type?: string
          nivel?: string
        }
        Relationships: []
      }
      avaliacao_ai_conteudos: {
        Row: {
          alertas: Json
          approved_at: string | null
          approved_by: string | null
          approved_text: string | null
          avaliacao_id: string
          base_text: string | null
          context_hash: string | null
          context_id: string | null
          context_json: Json
          context_type: string
          created_at: string
          created_by: string | null
          generated_text: string
          id: string
          model: string
          modo: string
          organization_id: string
          prompt_version: string
          purpose: string
          status: string
        }
        Insert: {
          alertas?: Json
          approved_at?: string | null
          approved_by?: string | null
          approved_text?: string | null
          avaliacao_id: string
          base_text?: string | null
          context_hash?: string | null
          context_id?: string | null
          context_json: Json
          context_type: string
          created_at?: string
          created_by?: string | null
          generated_text: string
          id?: string
          model: string
          modo?: string
          organization_id: string
          prompt_version: string
          purpose: string
          status?: string
        }
        Update: {
          alertas?: Json
          approved_at?: string | null
          approved_by?: string | null
          approved_text?: string | null
          avaliacao_id?: string
          base_text?: string | null
          context_hash?: string | null
          context_id?: string | null
          context_json?: Json
          context_type?: string
          created_at?: string
          created_by?: string | null
          generated_text?: string
          id?: string
          model?: string
          modo?: string
          organization_id?: string
          prompt_version?: string
          purpose?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_ai_conteudos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_amostra_snapshots: {
        Row: {
          amostra_id: string
          avaliacao_id: string
          conjunto_id: string
          created_at: string
          dado_id: string
          dados: Json
          hash: string
          id: string
          imovel_id: string
          organization_id: string
        }
        Insert: {
          amostra_id: string
          avaliacao_id: string
          conjunto_id: string
          created_at?: string
          dado_id: string
          dados: Json
          hash: string
          id?: string
          imovel_id: string
          organization_id: string
        }
        Update: {
          amostra_id?: string
          avaliacao_id?: string
          conjunto_id?: string
          created_at?: string
          dado_id?: string
          dados?: Json
          hash?: string
          id?: string
          imovel_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_amostra_snapshots_amostra_id_fkey"
            columns: ["amostra_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_amostras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_amostra_snapshots_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_amostra_snapshots_conjunto_id_fkey"
            columns: ["conjunto_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_conjuntos_dados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_amostra_snapshots_dado_id_fkey"
            columns: ["dado_id"]
            isOneToOne: false
            referencedRelation: "dados_mercado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_amostra_snapshots_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_amostras: {
        Row: {
          avaliacao_id: string
          created_at: string
          dado_id: string
          habilitada_modelo: boolean
          id: string
          importada_de_amostra_id: string | null
          motivo_desabilitacao: string | null
          motivo_inclusao: string | null
          organization_id: string
          origem_inclusao: string
          origem_territorial: string
          selecionada: boolean
          snapshot_chave: string | null
          snapshot_em: string | null
          snapshot_fonte: string | null
          snapshot_inclusao: Json | null
          updated_at: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          dado_id: string
          habilitada_modelo?: boolean
          id?: string
          importada_de_amostra_id?: string | null
          motivo_desabilitacao?: string | null
          motivo_inclusao?: string | null
          organization_id: string
          origem_inclusao?: string
          origem_territorial?: string
          selecionada?: boolean
          snapshot_chave?: string | null
          snapshot_em?: string | null
          snapshot_fonte?: string | null
          snapshot_inclusao?: Json | null
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          dado_id?: string
          habilitada_modelo?: boolean
          id?: string
          importada_de_amostra_id?: string | null
          motivo_desabilitacao?: string | null
          motivo_inclusao?: string | null
          organization_id?: string
          origem_inclusao?: string
          origem_territorial?: string
          selecionada?: boolean
          snapshot_chave?: string | null
          snapshot_em?: string | null
          snapshot_fonte?: string | null
          snapshot_inclusao?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_amostras_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_amostras_dado_id_fkey"
            columns: ["dado_id"]
            isOneToOne: false
            referencedRelation: "dados_mercado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_amostras_importada_de_amostra_id_fkey"
            columns: ["importada_de_amostra_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_amostras"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_arbitrio_caracteristicas: {
        Row: {
          arbitrio_id: string
          avaliacao_id: string
          caracteristica_id: string
          id: string
          organization_id: string
        }
        Insert: {
          arbitrio_id: string
          avaliacao_id: string
          caracteristica_id: string
          id?: string
          organization_id: string
        }
        Update: {
          arbitrio_id?: string
          avaliacao_id?: string
          caracteristica_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_arbitrio_caracteristicas_arbitrio_id_fkey"
            columns: ["arbitrio_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_arbitrios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_arbitrio_caracteristicas_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_arbitrio_caracteristicas_caracteristica_id_fkey"
            columns: ["caracteristica_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_caracteristicas_relevantes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_arbitrios: {
        Row: {
          aplicar: boolean
          avaliacao_id: string
          campo_inferior: number
          campo_superior: number
          centro: string
          created_at: string
          created_by: string | null
          id: string
          justificativa: string | null
          organization_id: string
          policy_id: string
          projecao_id: string
          valor_arbitrado: number | null
        }
        Insert: {
          aplicar?: boolean
          avaliacao_id: string
          campo_inferior: number
          campo_superior: number
          centro: string
          created_at?: string
          created_by?: string | null
          id?: string
          justificativa?: string | null
          organization_id: string
          policy_id: string
          projecao_id: string
          valor_arbitrado?: number | null
        }
        Update: {
          aplicar?: boolean
          avaliacao_id?: string
          campo_inferior?: number
          campo_superior?: number
          centro?: string
          created_at?: string
          created_by?: string | null
          id?: string
          justificativa?: string | null
          organization_id?: string
          policy_id?: string
          projecao_id?: string
          valor_arbitrado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_arbitrios_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_arbitrios_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "arbitration_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_arbitrios_projecao_id_fkey"
            columns: ["projecao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_projecoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_caracteristicas_relevantes: {
        Row: {
          avaliacao_id: string
          created_at: string
          descricao: string
          efeito: string
          id: string
          modelada: boolean
          observacao: string | null
          organization_id: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          descricao: string
          efeito?: string
          id?: string
          modelada?: boolean
          observacao?: string | null
          organization_id: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          descricao?: string
          efeito?: string
          id?: string
          modelada?: boolean
          observacao?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_caracteristicas_relevantes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_compatibilidades: {
        Row: {
          avaliacao_id: string
          created_at: string
          diferenca_absoluta: number
          diferenca_percentual: number
          direcao: string
          id: string
          organization_id: string
          posicao_campo: string
          posicao_ic: string
          resultado_id: string
          tipo_valor: string
          valor_administrativo_id: string
          valor_comparado: number
          valor_referencia: number
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          diferenca_absoluta: number
          diferenca_percentual: number
          direcao: string
          id?: string
          organization_id: string
          posicao_campo: string
          posicao_ic: string
          resultado_id: string
          tipo_valor: string
          valor_administrativo_id: string
          valor_comparado: number
          valor_referencia: number
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          diferenca_absoluta?: number
          diferenca_percentual?: number
          direcao?: string
          id?: string
          organization_id?: string
          posicao_campo?: string
          posicao_ic?: string
          resultado_id?: string
          tipo_valor?: string
          valor_administrativo_id?: string
          valor_comparado?: number
          valor_referencia?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_compatibilidades_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_compatibilidades_resultado_id_fkey"
            columns: ["resultado_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_resultado_economico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_compatibilidades_valor_administrativo_id_fkey"
            columns: ["valor_administrativo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_valores_administrativos"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_conjunto_amostras: {
        Row: {
          amostra_id: string
          avaliacao_id: string
          conjunto_id: string
          dado_id: string
          habilitada_modelo: boolean
          id: string
          organization_id: string
        }
        Insert: {
          amostra_id: string
          avaliacao_id: string
          conjunto_id: string
          dado_id: string
          habilitada_modelo?: boolean
          id?: string
          organization_id: string
        }
        Update: {
          amostra_id?: string
          avaliacao_id?: string
          conjunto_id?: string
          dado_id?: string
          habilitada_modelo?: boolean
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_conjunto_amostras_amostra_id_fkey"
            columns: ["amostra_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_amostras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_conjunto_amostras_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_conjunto_amostras_conjunto_id_fkey"
            columns: ["conjunto_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_conjuntos_dados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_conjunto_amostras_dado_id_fkey"
            columns: ["dado_id"]
            isOneToOne: false
            referencedRelation: "dados_mercado"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_conjuntos_dados: {
        Row: {
          avaliacao_id: string
          congelado_em: string | null
          congelado_por: string | null
          created_at: string
          created_by: string | null
          id: string
          observacao: string | null
          organization_id: string
          status: string
          versao: number
        }
        Insert: {
          avaliacao_id: string
          congelado_em?: string | null
          congelado_por?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          observacao?: string | null
          organization_id: string
          status?: string
          versao: number
        }
        Update: {
          avaliacao_id?: string
          congelado_em?: string | null
          congelado_por?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          observacao?: string | null
          organization_id?: string
          status?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_conjuntos_dados_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_documentos: {
        Row: {
          avaliacao_id: string
          categoria: string
          created_at: string
          created_by: string | null
          id: string
          nome_arquivo: string | null
          organization_id: string
          storage_ref: string
          tamanho_bytes: number | null
          titulo: string
        }
        Insert: {
          avaliacao_id: string
          categoria?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome_arquivo?: string | null
          organization_id: string
          storage_ref: string
          tamanho_bytes?: number | null
          titulo: string
        }
        Update: {
          avaliacao_id?: string
          categoria?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome_arquivo?: string | null
          organization_id?: string
          storage_ref?: string
          tamanho_bytes?: number | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_documentos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_espaco_transformacoes: {
        Row: {
          avaliacao_id: string
          espaco_id: string
          id: string
          organization_id: string
          power: number | null
          transformacao: string
          variavel_id: string
        }
        Insert: {
          avaliacao_id: string
          espaco_id: string
          id?: string
          organization_id: string
          power?: number | null
          transformacao: string
          variavel_id: string
        }
        Update: {
          avaliacao_id?: string
          espaco_id?: string
          id?: string
          organization_id?: string
          power?: number | null
          transformacao?: string
          variavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_espaco_transformacoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_espaco_transformacoes_espaco_id_fkey"
            columns: ["espaco_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_espacos_modelagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_espaco_transformacoes_transformacao_fkey"
            columns: ["transformacao"]
            isOneToOne: false
            referencedRelation: "stat_transformations"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "avaliacao_espaco_transformacoes_variavel_id_fkey"
            columns: ["variavel_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_variaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_espaco_variaveis: {
        Row: {
          avaliacao_id: string
          espaco_id: string
          id: string
          obrigatoria: boolean
          organization_id: string
          relacao_esperada: string
          variavel_id: string
        }
        Insert: {
          avaliacao_id: string
          espaco_id: string
          id?: string
          obrigatoria?: boolean
          organization_id: string
          relacao_esperada?: string
          variavel_id: string
        }
        Update: {
          avaliacao_id?: string
          espaco_id?: string
          id?: string
          obrigatoria?: boolean
          organization_id?: string
          relacao_esperada?: string
          variavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_espaco_variaveis_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_espaco_variaveis_espaco_id_fkey"
            columns: ["espaco_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_espacos_modelagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_espaco_variaveis_variavel_id_fkey"
            columns: ["variavel_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_variaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_espacos_modelagem: {
        Row: {
          avaliacao_id: string
          candidatos_estimados: number | null
          conjunto_id: string
          created_at: string
          created_by: string | null
          dependente_variavel_id: string
          id: string
          modo: string
          organization_id: string
          status: string
          transformacoes_dependente: string[]
        }
        Insert: {
          avaliacao_id: string
          candidatos_estimados?: number | null
          conjunto_id: string
          created_at?: string
          created_by?: string | null
          dependente_variavel_id: string
          id?: string
          modo?: string
          organization_id: string
          status?: string
          transformacoes_dependente?: string[]
        }
        Update: {
          avaliacao_id?: string
          candidatos_estimados?: number | null
          conjunto_id?: string
          created_at?: string
          created_by?: string | null
          dependente_variavel_id?: string
          id?: string
          modo?: string
          organization_id?: string
          status?: string
          transformacoes_dependente?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_espacos_modelagem_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_espacos_modelagem_conjunto_id_fkey"
            columns: ["conjunto_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_conjuntos_dados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_espacos_modelagem_dependente_variavel_id_fkey"
            columns: ["dependente_variavel_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_variaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_fonte_fatos: {
        Row: {
          aprovado: boolean
          aprovado_em: string | null
          aprovado_por: string | null
          avaliacao_id: string
          created_at: string
          fato: string
          fonte_id: string
          id: string
          organization_id: string
        }
        Insert: {
          aprovado?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          avaliacao_id: string
          created_at?: string
          fato: string
          fonte_id: string
          id?: string
          organization_id: string
        }
        Update: {
          aprovado?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          avaliacao_id?: string
          created_at?: string
          fato?: string
          fonte_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_fonte_fatos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_fonte_fatos_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_fontes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_fonte_usos: {
        Row: {
          avaliacao_id: string
          created_at: string
          fato_id: string
          id: string
          laudo_secao_id: string
          organization_id: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          fato_id: string
          id?: string
          laudo_secao_id: string
          organization_id: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          fato_id?: string
          id?: string
          laudo_secao_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_fonte_usos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_fonte_usos_fato_id_fkey"
            columns: ["fato_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_fonte_fatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_fonte_usos_laudo_secao_id_fkey"
            columns: ["laudo_secao_id"]
            isOneToOne: false
            referencedRelation: "laudo_secoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_fontes: {
        Row: {
          avaliacao_id: string
          created_at: string
          created_by: string | null
          data_consulta: string
          documento_ref: string | null
          id: string
          organization_id: string
          titulo: string
          url: string | null
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          created_by?: string | null
          data_consulta?: string
          documento_ref?: string | null
          id?: string
          organization_id: string
          titulo: string
          url?: string | null
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          created_by?: string | null
          data_consulta?: string
          documento_ref?: string | null
          id?: string
          organization_id?: string
          titulo?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_fontes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_imoveis: {
        Row: {
          avaliacao_id: string
          created_at: string
          id: string
          imovel_id: string
          organization_id: string
          papel: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          id?: string
          imovel_id: string
          organization_id: string
          papel?: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          id?: string
          imovel_id?: string
          organization_id?: string
          papel?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_imoveis_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_imoveis_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_membros: {
        Row: {
          ativo: boolean
          avaliacao_id: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          papel: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          avaliacao_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          papel: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          avaliacao_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          papel?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_membros_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_metodos: {
        Row: {
          avaliacao_id: string
          created_at: string
          id: string
          metodo: string
          organization_id: string
          principal: boolean
          status: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          id?: string
          metodo?: string
          organization_id: string
          principal?: boolean
          status?: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          id?: string
          metodo?: string
          organization_id?: string
          principal?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_metodos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_model_generation_runs: {
        Row: {
          arquivada: boolean
          arquivada_em: string | null
          arquivada_por: string | null
          avaliacao_id: string
          conjunto_id: string
          created_at: string
          created_by: string | null
          id: string
          modo: string
          numero: number
          organization_id: string
          parametros: Json
          qtd_calculada: number
          qtd_criada: number
          qtd_erro: number
          qtd_estimada: number
          qtd_existente: number
          updated_at: string
        }
        Insert: {
          arquivada?: boolean
          arquivada_em?: string | null
          arquivada_por?: string | null
          avaliacao_id: string
          conjunto_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          modo: string
          numero: number
          organization_id: string
          parametros?: Json
          qtd_calculada?: number
          qtd_criada?: number
          qtd_erro?: number
          qtd_estimada?: number
          qtd_existente?: number
          updated_at?: string
        }
        Update: {
          arquivada?: boolean
          arquivada_em?: string | null
          arquivada_por?: string | null
          avaliacao_id?: string
          conjunto_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modo?: string
          numero?: number
          organization_id?: string
          parametros?: Json
          qtd_calculada?: number
          qtd_criada?: number
          qtd_erro?: number
          qtd_estimada?: number
          qtd_existente?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_model_generation_runs_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_model_generation_runs_conjunto_id_fkey"
            columns: ["conjunto_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_conjuntos_dados"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_model_run_modelos: {
        Row: {
          avaliacao_id: string
          created_at: string
          modelo_id: string
          organization_id: string
          run_id: string
          situacao: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          modelo_id: string
          organization_id: string
          run_id: string
          situacao: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          modelo_id?: string
          organization_id?: string
          run_id?: string
          situacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_model_run_modelos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_model_run_modelos_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_model_run_modelos_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_model_generation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_modeling_settings: {
        Row: {
          assisted_candidate_soft_limit: number
          cook_regra: Json | null
          exploration_candidate_soft_limit: number
          hard_limit: number | null
          id: string
          organization_id: string | null
          origem: string
          require_confirmation_over: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assisted_candidate_soft_limit?: number
          cook_regra?: Json | null
          exploration_candidate_soft_limit?: number
          hard_limit?: number | null
          id?: string
          organization_id?: string | null
          origem?: string
          require_confirmation_over?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assisted_candidate_soft_limit?: number
          cook_regra?: Json | null
          exploration_candidate_soft_limit?: number
          hard_limit?: number | null
          id?: string
          organization_id?: string | null
          origem?: string
          require_confirmation_over?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_modeling_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_modelo_execucoes: {
        Row: {
          avaliacao_id: string
          concluido_em: string
          created_at: string
          engine_name: string
          engine_version: string
          erro_codigo: string | null
          executado_por: string | null
          id: string
          iniciado_em: string
          input_hash: string
          input_snapshot_json: Json
          modelo_id: string
          organization_id: string
          output_hash: string | null
          output_json: Json | null
          status: string
        }
        Insert: {
          avaliacao_id: string
          concluido_em: string
          created_at?: string
          engine_name: string
          engine_version: string
          erro_codigo?: string | null
          executado_por?: string | null
          id?: string
          iniciado_em: string
          input_hash: string
          input_snapshot_json: Json
          modelo_id: string
          organization_id: string
          output_hash?: string | null
          output_json?: Json | null
          status: string
        }
        Update: {
          avaliacao_id?: string
          concluido_em?: string
          created_at?: string
          engine_name?: string
          engine_version?: string
          erro_codigo?: string | null
          executado_por?: string | null
          id?: string
          iniciado_em?: string
          input_hash?: string
          input_snapshot_json?: Json
          modelo_id?: string
          organization_id?: string
          output_hash?: string | null
          output_json?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_modelo_execucoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_modelo_execucoes_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_modelo_variaveis: {
        Row: {
          avaliacao_id: string
          id: string
          modelo_id: string
          ordem: number
          organization_id: string
          power: number | null
          transformacao: string
          variavel_id: string
        }
        Insert: {
          avaliacao_id: string
          id?: string
          modelo_id: string
          ordem?: number
          organization_id: string
          power?: number | null
          transformacao: string
          variavel_id: string
        }
        Update: {
          avaliacao_id?: string
          id?: string
          modelo_id?: string
          ordem?: number
          organization_id?: string
          power?: number | null
          transformacao?: string
          variavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_modelo_variaveis_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_modelo_variaveis_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_modelo_variaveis_transformacao_fkey"
            columns: ["transformacao"]
            isOneToOne: false
            referencedRelation: "stat_transformations"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "avaliacao_modelo_variaveis_variavel_id_fkey"
            columns: ["variavel_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_variaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_modelos: {
        Row: {
          amostras_excluidas: string[]
          arquivado: boolean
          arquivado_em: string | null
          arquivado_por: string | null
          assinatura: string | null
          avaliacao_id: string
          candidato: boolean
          conjunto_id: string
          created_at: string
          created_by: string | null
          dependente_power: number | null
          dependente_transformacao: string
          dependente_variavel_id: string
          espaco_id: string | null
          favorito: boolean
          id: string
          modelo_origem_id: string | null
          nivel_confianca: number
          nome: string
          numero: number
          organization_id: string
          origem_tipo: string
          stale: boolean
          stale_em: string | null
          stale_motivo: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amostras_excluidas?: string[]
          arquivado?: boolean
          arquivado_em?: string | null
          arquivado_por?: string | null
          assinatura?: string | null
          avaliacao_id: string
          candidato?: boolean
          conjunto_id: string
          created_at?: string
          created_by?: string | null
          dependente_power?: number | null
          dependente_transformacao: string
          dependente_variavel_id: string
          espaco_id?: string | null
          favorito?: boolean
          id?: string
          modelo_origem_id?: string | null
          nivel_confianca?: number
          nome: string
          numero: number
          organization_id: string
          origem_tipo?: string
          stale?: boolean
          stale_em?: string | null
          stale_motivo?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amostras_excluidas?: string[]
          arquivado?: boolean
          arquivado_em?: string | null
          arquivado_por?: string | null
          assinatura?: string | null
          avaliacao_id?: string
          candidato?: boolean
          conjunto_id?: string
          created_at?: string
          created_by?: string | null
          dependente_power?: number | null
          dependente_transformacao?: string
          dependente_variavel_id?: string
          espaco_id?: string | null
          favorito?: boolean
          id?: string
          modelo_origem_id?: string | null
          nivel_confianca?: number
          nome?: string
          numero?: number
          organization_id?: string
          origem_tipo?: string
          stale?: boolean
          stale_em?: string | null
          stale_motivo?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_modelos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_modelos_conjunto_id_fkey"
            columns: ["conjunto_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_conjuntos_dados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_modelos_dependente_transformacao_fkey"
            columns: ["dependente_transformacao"]
            isOneToOne: false
            referencedRelation: "stat_transformations"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "avaliacao_modelos_dependente_variavel_id_fkey"
            columns: ["dependente_variavel_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_variaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_modelos_espaco_id_fkey"
            columns: ["espaco_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_espacos_modelagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_modelos_modelo_origem_id_fkey"
            columns: ["modelo_origem_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_municipios_comparaveis: {
        Row: {
          avaliacao_id: string
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          id: string
          justificativa: string | null
          municipio_ibge: string | null
          municipio_nome: string
          organization_id: string
          status: string
          uf: string
          updated_at: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          justificativa?: string | null
          municipio_ibge?: string | null
          municipio_nome: string
          organization_id: string
          status?: string
          uf: string
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          justificativa?: string | null
          municipio_ibge?: string | null
          municipio_nome?: string
          organization_id?: string
          status?: string
          uf?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_municipios_comparaveis_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_papel_permissoes: {
        Row: {
          papel: string
          permissao: string
        }
        Insert: {
          papel: string
          permissao: string
        }
        Update: {
          papel?: string
          permissao?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_papel_permissoes_permissao_fkey"
            columns: ["permissao"]
            isOneToOne: false
            referencedRelation: "avaliacao_permissoes"
            referencedColumns: ["codigo"]
          },
        ]
      }
      avaliacao_permissoes: {
        Row: {
          categoria: string
          codigo: string
          descricao: string
        }
        Insert: {
          categoria: string
          codigo: string
          descricao: string
        }
        Update: {
          categoria?: string
          codigo?: string
          descricao?: string
        }
        Relationships: []
      }
      avaliacao_projecao_centros: {
        Row: {
          amplitude_pct: number
          avaliacao_id: string
          centro: string
          grau_precisao: string | null
          id: string
          limite_inferior: number
          limite_superior: number
          organization_id: string
          projecao_id: string
          valor: number
        }
        Insert: {
          amplitude_pct: number
          avaliacao_id: string
          centro: string
          grau_precisao?: string | null
          id?: string
          limite_inferior: number
          limite_superior: number
          organization_id: string
          projecao_id: string
          valor: number
        }
        Update: {
          amplitude_pct?: number
          avaliacao_id?: string
          centro?: string
          grau_precisao?: string | null
          id?: string
          limite_inferior?: number
          limite_superior?: number
          organization_id?: string
          projecao_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_projecao_centros_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_projecao_centros_projecao_id_fkey"
            columns: ["projecao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_projecoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_projecoes: {
        Row: {
          acceptance_id: string
          avaliacao_id: string
          avaliando_json: Json
          created_at: string
          created_by: string | null
          engine_version: string
          execucao_id: string
          extrapolacao: Json
          id: string
          intervalo_predicao_status: string
          log_response: boolean
          modelo_id: string
          nivel_confianca: number
          organization_id: string
          se_media: number
          stale: boolean
          t_critico: number
          z0: number
        }
        Insert: {
          acceptance_id: string
          avaliacao_id: string
          avaliando_json: Json
          created_at?: string
          created_by?: string | null
          engine_version: string
          execucao_id: string
          extrapolacao: Json
          id?: string
          intervalo_predicao_status?: string
          log_response: boolean
          modelo_id: string
          nivel_confianca: number
          organization_id: string
          se_media: number
          stale?: boolean
          t_critico: number
          z0: number
        }
        Update: {
          acceptance_id?: string
          avaliacao_id?: string
          avaliando_json?: Json
          created_at?: string
          created_by?: string | null
          engine_version?: string
          execucao_id?: string
          extrapolacao?: Json
          id?: string
          intervalo_predicao_status?: string
          log_response?: boolean
          modelo_id?: string
          nivel_confianca?: number
          organization_id?: string
          se_media?: number
          stale?: boolean
          t_critico?: number
          z0?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_projecoes_acceptance_id_fkey"
            columns: ["acceptance_id"]
            isOneToOne: false
            referencedRelation: "model_acceptances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_projecoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_projecoes_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_projecoes_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_resultado_economico: {
        Row: {
          avaliacao_id: string
          centro: string
          conclusao: string
          conclusao_texto: string | null
          confirmado_em: string
          confirmado_por: string
          id: string
          organization_id: string
          projecao_id: string
          stale: boolean
          status: string
          valor_adotado_id: string
        }
        Insert: {
          avaliacao_id: string
          centro: string
          conclusao: string
          conclusao_texto?: string | null
          confirmado_em?: string
          confirmado_por: string
          id?: string
          organization_id: string
          projecao_id: string
          stale?: boolean
          status?: string
          valor_adotado_id: string
        }
        Update: {
          avaliacao_id?: string
          centro?: string
          conclusao?: string
          conclusao_texto?: string | null
          confirmado_em?: string
          confirmado_por?: string
          id?: string
          organization_id?: string
          projecao_id?: string
          stale?: boolean
          status?: string
          valor_adotado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_resultado_economico_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_resultado_economico_projecao_id_fkey"
            columns: ["projecao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_projecoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_resultado_economico_valor_adotado_id_fkey"
            columns: ["valor_adotado_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_valores_adotados"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_resultado_snapshots: {
        Row: {
          avaliacao_id: string
          created_at: string
          dados: Json
          hash: string
          id: string
          organization_id: string
          resultado_id: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          dados: Json
          hash: string
          id?: string
          organization_id: string
          resultado_id: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          dados?: Json
          hash?: string
          id?: string
          organization_id?: string
          resultado_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_resultado_snapshots_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_resultado_snapshots_resultado_id_fkey"
            columns: ["resultado_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_resultado_economico"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_valores_administrativos: {
        Row: {
          ativo: boolean
          avaliacao_id: string
          created_at: string
          created_by: string | null
          data_referencia: string | null
          documento_origem_id: string | null
          id: string
          observacao: string | null
          organization_id: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          avaliacao_id: string
          created_at?: string
          created_by?: string | null
          data_referencia?: string | null
          documento_origem_id?: string | null
          id?: string
          observacao?: string | null
          organization_id: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          ativo?: boolean
          avaliacao_id?: string
          created_at?: string
          created_by?: string | null
          data_referencia?: string | null
          documento_origem_id?: string | null
          id?: string
          observacao?: string | null
          organization_id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_valores_administrativos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_valores_adotados: {
        Row: {
          arbitrio_id: string | null
          avaliacao_id: string
          centro_id: string
          created_at: string
          id: string
          organization_id: string
          origem: string
          projecao_id: string
          rounding_policy_id: string | null
          unidade: string
          valor_adotado_bruto: number
          valor_final_apresentacao: number
        }
        Insert: {
          arbitrio_id?: string | null
          avaliacao_id: string
          centro_id: string
          created_at?: string
          id?: string
          organization_id: string
          origem: string
          projecao_id: string
          rounding_policy_id?: string | null
          unidade?: string
          valor_adotado_bruto: number
          valor_final_apresentacao: number
        }
        Update: {
          arbitrio_id?: string | null
          avaliacao_id?: string
          centro_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          origem?: string
          projecao_id?: string
          rounding_policy_id?: string | null
          unidade?: string
          valor_adotado_bruto?: number
          valor_final_apresentacao?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_valores_adotados_arbitrio_id_fkey"
            columns: ["arbitrio_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_arbitrios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_valores_adotados_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_valores_adotados_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_projecao_centros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_valores_adotados_projecao_id_fkey"
            columns: ["projecao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_projecoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_valores_adotados_rounding_policy_id_fkey"
            columns: ["rounding_policy_id"]
            isOneToOne: false
            referencedRelation: "rounding_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_variaveis: {
        Row: {
          ativo: boolean
          atributo_id: string | null
          avaliacao_id: string
          campo_origem: string | null
          categorica: boolean | null
          codigo: string
          created_at: string
          id: string
          nome: string
          obrigatoria: boolean
          organization_id: string
          origem_tipo: string
          papel: string
          relacao_esperada: string
          tipo_variavel: string
          transformacoes_autorizadas: string[]
          unidade: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          atributo_id?: string | null
          avaliacao_id: string
          campo_origem?: string | null
          categorica?: boolean | null
          codigo: string
          created_at?: string
          id?: string
          nome: string
          obrigatoria?: boolean
          organization_id: string
          origem_tipo?: string
          papel?: string
          relacao_esperada?: string
          tipo_variavel?: string
          transformacoes_autorizadas?: string[]
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          atributo_id?: string | null
          avaliacao_id?: string
          campo_origem?: string | null
          categorica?: boolean | null
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          obrigatoria?: boolean
          organization_id?: string
          origem_tipo?: string
          papel?: string
          relacao_esperada?: string
          tipo_variavel?: string
          transformacoes_autorizadas?: string[]
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_variaveis_atributo_id_fkey"
            columns: ["atributo_id"]
            isOneToOne: false
            referencedRelation: "atributos_imobiliarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_variaveis_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_variavel_valores: {
        Row: {
          amostra_id: string | null
          avaliacao_id: string
          id: string
          organization_id: string
          origem: string | null
          scope_type: string
          updated_at: string
          valor: number | null
          valor_texto: string | null
          variavel_id: string
        }
        Insert: {
          amostra_id?: string | null
          avaliacao_id: string
          id?: string
          organization_id: string
          origem?: string | null
          scope_type: string
          updated_at?: string
          valor?: number | null
          valor_texto?: string | null
          variavel_id: string
        }
        Update: {
          amostra_id?: string | null
          avaliacao_id?: string
          id?: string
          organization_id?: string
          origem?: string | null
          scope_type?: string
          updated_at?: string
          valor?: number | null
          valor_texto?: string | null
          variavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_variavel_valores_amostra_id_fkey"
            columns: ["amostra_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_amostras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_variavel_valores_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_variavel_valores_variavel_id_fkey"
            columns: ["variavel_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_variaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_versoes: {
        Row: {
          avaliacao_id: string
          created_at: string
          created_by: string | null
          emitida_em: string | null
          id: string
          motivo: string | null
          organization_id: string
          revisao: number
          status: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          created_by?: string | null
          emitida_em?: string | null
          id?: string
          motivo?: string | null
          organization_id: string
          revisao: number
          status?: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          created_by?: string | null
          emitida_em?: string | null
          id?: string
          motivo?: string | null
          organization_id?: string
          revisao?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_versoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          ano: number
          cancelado_em: string | null
          cancelado_motivo: string | null
          cancelado_por: string | null
          codigo: string
          created_at: string
          created_by: string | null
          data_proposta: string | null
          id: string
          indice_reajuste: string | null
          municipio_ibge: string | null
          municipio_nome: string
          numero: number
          numero_contrato: string | null
          observacao: string | null
          organization_id: string
          percentual_reajuste: number | null
          processo_administrativo: string | null
          responsavel_tecnico_id: string | null
          stage: string
          status: string
          tipo: string
          tipo_imovel: string
          uf: string
          updated_at: string
          versao_atual: number
        }
        Insert: {
          ano: number
          cancelado_em?: string | null
          cancelado_motivo?: string | null
          cancelado_por?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          data_proposta?: string | null
          id?: string
          indice_reajuste?: string | null
          municipio_ibge?: string | null
          municipio_nome: string
          numero: number
          numero_contrato?: string | null
          observacao?: string | null
          organization_id: string
          percentual_reajuste?: number | null
          processo_administrativo?: string | null
          responsavel_tecnico_id?: string | null
          stage?: string
          status?: string
          tipo: string
          tipo_imovel: string
          uf: string
          updated_at?: string
          versao_atual?: number
        }
        Update: {
          ano?: number
          cancelado_em?: string | null
          cancelado_motivo?: string | null
          cancelado_por?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          data_proposta?: string | null
          id?: string
          indice_reajuste?: string | null
          municipio_ibge?: string | null
          municipio_nome?: string
          numero?: number
          numero_contrato?: string | null
          observacao?: string | null
          organization_id?: string
          percentual_reajuste?: number | null
          processo_administrativo?: string | null
          responsavel_tecnico_id?: string | null
          stage?: string
          status?: string
          tipo?: string
          tipo_imovel?: string
          uf?: string
          updated_at?: string
          versao_atual?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      base_composicoes: {
        Row: {
          codigo: string
          composicao_itens: Json | null
          created_at: string
          created_by: string | null
          descricao: string
          eh_mao_de_obra: boolean | null
          estado: string | null
          fonte: string
          grupo: string | null
          id: string
          observacao: string | null
          organization_id: string
          preco_unitario: number
          tipo: string
          unidade: string
          updated_at: string
          versao: string | null
        }
        Insert: {
          codigo: string
          composicao_itens?: Json | null
          created_at?: string
          created_by?: string | null
          descricao: string
          eh_mao_de_obra?: boolean | null
          estado?: string | null
          fonte?: string
          grupo?: string | null
          id?: string
          observacao?: string | null
          organization_id?: string
          preco_unitario?: number
          tipo: string
          unidade: string
          updated_at?: string
          versao?: string | null
        }
        Update: {
          codigo?: string
          composicao_itens?: Json | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          eh_mao_de_obra?: boolean | null
          estado?: string | null
          fonte?: string
          grupo?: string | null
          id?: string
          observacao?: string | null
          organization_id?: string
          preco_unitario?: number
          tipo?: string
          unidade?: string
          updated_at?: string
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "base_composicoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_servicos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          escopo: string
          id: string
          keywords: string[]
          macro: string
          obra_id: string | null
          ordem: number
          organization_id: string | null
          servico: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          escopo?: string
          id?: string
          keywords?: string[]
          macro: string
          obra_id?: string | null
          ordem?: number
          organization_id?: string | null
          servico: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          escopo?: string
          id?: string
          keywords?: string[]
          macro?: string
          obra_id?: string | null
          ordem?: number
          organization_id?: string | null
          servico?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_servicos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_servicos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_verificacoes: {
        Row: {
          ativo: boolean
          created_at: string
          default_aplicavel: boolean
          descricao: string
          id: string
          ordem: number
          organization_id: string | null
          servico_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          default_aplicavel?: boolean
          descricao: string
          id?: string
          ordem?: number
          organization_id?: string | null
          servico_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          default_aplicavel?: boolean
          descricao?: string
          id?: string
          ordem?: number
          organization_id?: string | null
          servico_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_verificacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_verificacoes_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_sistemas_servicos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          texto_documento: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          texto_documento: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          texto_documento?: string
          updated_at?: string
        }
        Relationships: []
      }
      checklist_ambientes: {
        Row: {
          created_at: string
          id: string
          nome: string
          obra_id: string
          organization_id: string | null
          pagina: number
          pdf_id: string
          pos_h: number
          pos_w: number
          pos_x: number
          pos_y: number
          shape_data: Json | null
          shape_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          obra_id: string
          organization_id?: string | null
          pagina?: number
          pdf_id: string
          pos_h?: number
          pos_w?: number
          pos_x?: number
          pos_y?: number
          shape_data?: Json | null
          shape_type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          obra_id?: string
          organization_id?: string | null
          pagina?: number
          pdf_id?: string
          pos_h?: number
          pos_w?: number
          pos_x?: number
          pos_y?: number
          shape_data?: Json | null
          shape_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_ambientes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_ambientes_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "checklist_pdfs"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_ocorrencias: {
        Row: {
          avaliado_por: string | null
          created_at: string
          data_avaliacao: string | null
          descricao: string | null
          foto_correcao_pin: Json | null
          foto_correcao_url: string | null
          foto_reprovacao_pin: Json | null
          foto_reprovacao_url: string | null
          gravidade: string | null
          id: string
          location_pin: Json | null
          obra_id: string
          observacao: string | null
          ordem: number
          organization_id: string | null
          servico_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avaliado_por?: string | null
          created_at?: string
          data_avaliacao?: string | null
          descricao?: string | null
          foto_correcao_pin?: Json | null
          foto_correcao_url?: string | null
          foto_reprovacao_pin?: Json | null
          foto_reprovacao_url?: string | null
          gravidade?: string | null
          id?: string
          location_pin?: Json | null
          obra_id: string
          observacao?: string | null
          ordem?: number
          organization_id?: string | null
          servico_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avaliado_por?: string | null
          created_at?: string
          data_avaliacao?: string | null
          descricao?: string | null
          foto_correcao_pin?: Json | null
          foto_correcao_url?: string | null
          foto_reprovacao_pin?: Json | null
          foto_reprovacao_url?: string | null
          gravidade?: string | null
          id?: string
          location_pin?: Json | null
          obra_id?: string
          observacao?: string | null
          ordem?: number
          organization_id?: string | null
          servico_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_ocorrencias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_ocorrencias_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "checklist_servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_pdfs: {
        Row: {
          created_at: string
          id: string
          nome_arquivo: string
          obra_id: string
          organization_id: string | null
          pdf_url: string
          prazo_correcao: number | null
          total_paginas: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome_arquivo: string
          obra_id: string
          organization_id?: string | null
          pdf_url: string
          prazo_correcao?: number | null
          total_paginas?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome_arquivo?: string
          obra_id?: string
          organization_id?: string | null
          pdf_url?: string
          prazo_correcao?: number | null
          total_paginas?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_pdfs_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_pdfs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_servicos: {
        Row: {
          ambiente_id: string
          avaliado_por: string | null
          created_at: string
          data_avaliacao: string | null
          descricao: string
          foto_correcao_pin: Json | null
          foto_correcao_url: string | null
          foto_reprovacao_pin: Json | null
          foto_reprovacao_url: string | null
          gravidade: string | null
          id: string
          is_padrao: boolean
          location_pin: Json | null
          obra_id: string
          observacao: string | null
          ordem: number
          organization_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ambiente_id: string
          avaliado_por?: string | null
          created_at?: string
          data_avaliacao?: string | null
          descricao: string
          foto_correcao_pin?: Json | null
          foto_correcao_url?: string | null
          foto_reprovacao_pin?: Json | null
          foto_reprovacao_url?: string | null
          gravidade?: string | null
          id?: string
          is_padrao?: boolean
          location_pin?: Json | null
          obra_id: string
          observacao?: string | null
          ordem?: number
          organization_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ambiente_id?: string
          avaliado_por?: string | null
          created_at?: string
          data_avaliacao?: string | null
          descricao?: string
          foto_correcao_pin?: Json | null
          foto_correcao_url?: string | null
          foto_reprovacao_pin?: Json | null
          foto_reprovacao_url?: string | null
          gravidade?: string | null
          id?: string
          is_padrao?: boolean
          location_pin?: Json | null
          obra_id?: string
          observacao?: string | null
          ordem?: number
          organization_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_servicos_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "checklist_ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_servicos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_leads: {
        Row: {
          addon_keys: string[] | null
          cnpj: string | null
          contato_nome: string
          created_at: string
          email: string
          id: string
          mensagem: string | null
          module_tier_keys: string[] | null
          nome_orgao: string
          notas_internas: string | null
          plan_key: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          addon_keys?: string[] | null
          cnpj?: string | null
          contato_nome: string
          created_at?: string
          email: string
          id?: string
          mensagem?: string | null
          module_tier_keys?: string[] | null
          nome_orgao: string
          notas_internas?: string | null
          plan_key?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          addon_keys?: string[] | null
          cnpj?: string | null
          contato_nome?: string
          created_at?: string
          email?: string
          id?: string
          mensagem?: string | null
          module_tier_keys?: string[] | null
          nome_orgao?: string
          notas_internas?: string | null
          plan_key?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commercial_modules: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          key: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          key: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          key?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      config_institucional: {
        Row: {
          cidade: string
          cnpj: string | null
          created_at: string
          endereco: string | null
          id: string
          organization_id: string
          razao_social: string
          updated_at: string
        }
        Insert: {
          cidade?: string
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          organization_id?: string
          razao_social?: string
          updated_at?: string
        }
        Update: {
          cidade?: string
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          organization_id?: string
          razao_social?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_institucional_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_licitacao: {
        Row: {
          created_at: string
          created_by: string | null
          desconto: number | null
          empresa_id: string | null
          id: string
          numero_contrato: string
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
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
          {
            foreignKeyName: "contratos_licitacao_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      dados_mercado: {
        Row: {
          anuncio_id: string | null
          contrato_publico: Json | null
          created_at: string
          created_by: string | null
          data_confirmacao: string | null
          data_observacao: string | null
          descricao: string | null
          id: string
          imovel_id: string
          natureza_dado: string
          organization_id: string
          periodicidade: string
          status: string
          tipo_negocio: string
          updated_at: string
          url_anuncio: string | null
          valor_negociado: number | null
          valor_ofertado: number | null
          valor_unitario: number | null
          valor_utilizado: number | null
        }
        Insert: {
          anuncio_id?: string | null
          contrato_publico?: Json | null
          created_at?: string
          created_by?: string | null
          data_confirmacao?: string | null
          data_observacao?: string | null
          descricao?: string | null
          id?: string
          imovel_id: string
          natureza_dado?: string
          organization_id: string
          periodicidade?: string
          status?: string
          tipo_negocio?: string
          updated_at?: string
          url_anuncio?: string | null
          valor_negociado?: number | null
          valor_ofertado?: number | null
          valor_unitario?: number | null
          valor_utilizado?: number | null
        }
        Update: {
          anuncio_id?: string | null
          contrato_publico?: Json | null
          created_at?: string
          created_by?: string | null
          data_confirmacao?: string | null
          data_observacao?: string | null
          descricao?: string | null
          id?: string
          imovel_id?: string
          natureza_dado?: string
          organization_id?: string
          periodicidade?: string
          status?: string
          tipo_negocio?: string
          updated_at?: string
          url_anuncio?: string | null
          valor_negociado?: number | null
          valor_ofertado?: number | null
          valor_unitario?: number | null
          valor_utilizado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dados_mercado_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_mercado_confirmacoes: {
        Row: {
          created_at: string
          created_by: string | null
          dado_id: string
          data_confirmacao: string
          id: string
          meio: string | null
          observacao: string | null
          organization_id: string
          resultado: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dado_id: string
          data_confirmacao: string
          id?: string
          meio?: string | null
          observacao?: string | null
          organization_id: string
          resultado?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dado_id?: string
          data_confirmacao?: string
          id?: string
          meio?: string | null
          observacao?: string | null
          organization_id?: string
          resultado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dados_mercado_confirmacoes_dado_id_fkey"
            columns: ["dado_id"]
            isOneToOne: false
            referencedRelation: "dados_mercado"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_mercado_evidencias: {
        Row: {
          capturado_em: string
          created_at: string
          dado_id: string
          descricao: string | null
          id: string
          organization_id: string
          storage_ref: string | null
          tipo: string
          url: string | null
        }
        Insert: {
          capturado_em?: string
          created_at?: string
          dado_id: string
          descricao?: string | null
          id?: string
          organization_id: string
          storage_ref?: string | null
          tipo?: string
          url?: string | null
        }
        Update: {
          capturado_em?: string
          created_at?: string
          dado_id?: string
          descricao?: string | null
          id?: string
          organization_id?: string
          storage_ref?: string | null
          tipo?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dados_mercado_evidencias_dado_id_fkey"
            columns: ["dado_id"]
            isOneToOne: false
            referencedRelation: "dados_mercado"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_mercado_fontes: {
        Row: {
          contato_id: string | null
          created_at: string
          dado_id: string
          fonte_id: string
          id: string
          organization_id: string
          principal: boolean
        }
        Insert: {
          contato_id?: string | null
          created_at?: string
          dado_id: string
          fonte_id: string
          id?: string
          organization_id: string
          principal?: boolean
        }
        Update: {
          contato_id?: string | null
          created_at?: string
          dado_id?: string
          fonte_id?: string
          id?: string
          organization_id?: string
          principal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "dados_mercado_fontes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "fonte_mercado_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_mercado_fontes_dado_id_fkey"
            columns: ["dado_id"]
            isOneToOne: false
            referencedRelation: "dados_mercado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_mercado_fontes_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes_mercado"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_mercado_historico: {
        Row: {
          alterado_por: string | null
          anterior: Json
          created_at: string
          dado_id: string
          id: string
          novo: Json
          organization_id: string
        }
        Insert: {
          alterado_por?: string | null
          anterior: Json
          created_at?: string
          dado_id: string
          id?: string
          novo: Json
          organization_id: string
        }
        Update: {
          alterado_por?: string | null
          anterior?: Json
          created_at?: string
          dado_id?: string
          id?: string
          novo?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dados_mercado_historico_dado_id_fkey"
            columns: ["dado_id"]
            isOneToOne: false
            referencedRelation: "dados_mercado"
            referencedColumns: ["id"]
          },
        ]
      }
      dimensionamento_calhas: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          nome: string
          obra_id: string | null
          observacoes: string | null
          organization_id: string | null
          resultados: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inputs?: Json
          nome: string
          obra_id?: string | null
          observacoes?: string | null
          organization_id?: string | null
          resultados?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          nome?: string
          obra_id?: string | null
          observacoes?: string | null
          organization_id?: string | null
          resultados?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimensionamento_calhas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dimensionamento_calhas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dimensionamento_intensidades_pluviometricas: {
        Row: {
          cidade: string
          created_at: string
          duracao_min: number
          fonte: string
          id: string
          intensidade_mm_h: number
          is_system: boolean
          observacoes: string | null
          tempo_retorno_anos: number
          uf: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cidade: string
          created_at?: string
          duracao_min: number
          fonte: string
          id?: string
          intensidade_mm_h: number
          is_system?: boolean
          observacoes?: string | null
          tempo_retorno_anos: number
          uf: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cidade?: string
          created_at?: string
          duracao_min?: number
          fonte?: string
          id?: string
          intensidade_mm_h?: number
          is_system?: boolean
          observacoes?: string | null
          tempo_retorno_anos?: number
          uf?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      document_tokens: {
        Row: {
          codigo: string
          critico: boolean
          descricao: string
        }
        Insert: {
          codigo: string
          critico?: boolean
          descricao: string
        }
        Update: {
          codigo?: string
          critico?: boolean
          descricao?: string
        }
        Relationships: []
      }
      documento_assinantes: {
        Row: {
          bloco: string
          cargo: string | null
          complementos: Json | null
          cpf: string | null
          created_at: string
          documento_id: string
          id: string
          nome: string
          ordem: number
          organization_id: string | null
        }
        Insert: {
          bloco: string
          cargo?: string | null
          complementos?: Json | null
          cpf?: string | null
          created_at?: string
          documento_id: string
          id?: string
          nome: string
          ordem?: number
          organization_id?: string | null
        }
        Update: {
          bloco?: string
          cargo?: string | null
          complementos?: Json | null
          cpf?: string | null
          created_at?: string
          documento_id?: string
          id?: string
          nome?: string
          ordem?: number
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_assinantes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_encerramento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_assinantes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_encerramento: {
        Row: {
          arquivo_docx_path: string | null
          arquivo_hash: string | null
          arquivo_pdf_path: string | null
          created_at: string
          data_emissao: string
          data_recebimento: string | null
          gerado_por: string | null
          gerado_por_nome: string | null
          id: string
          justificativa_excecao: string | null
          obra_id: string
          organization_id: string | null
          snapshot_dados: Json
          status: string
          tipo: string
          versao: number
        }
        Insert: {
          arquivo_docx_path?: string | null
          arquivo_hash?: string | null
          arquivo_pdf_path?: string | null
          created_at?: string
          data_emissao?: string
          data_recebimento?: string | null
          gerado_por?: string | null
          gerado_por_nome?: string | null
          id?: string
          justificativa_excecao?: string | null
          obra_id: string
          organization_id?: string | null
          snapshot_dados: Json
          status?: string
          tipo: string
          versao?: number
        }
        Update: {
          arquivo_docx_path?: string | null
          arquivo_hash?: string | null
          arquivo_pdf_path?: string | null
          created_at?: string
          data_emissao?: string
          data_recebimento?: string | null
          gerado_por?: string | null
          gerado_por_nome?: string | null
          id?: string
          justificativa_excecao?: string | null
          obra_id?: string
          organization_id?: string | null
          snapshot_dados?: Json
          status?: string
          tipo?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "documentos_encerramento_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_encerramento_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            referencedRelation: "nuclei_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_nucleus_id_fkey"
            columns: ["nucleus_id"]
            isOneToOne: false
            referencedRelation: "nuclei_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dpg_gestao: {
        Row: {
          assinatura_url: string | null
          ativo: boolean
          cargo: string
          condicao: string
          cpf: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          observacoes: string | null
          organization_id: string | null
          texto_cargo_documento: string
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          assinatura_url?: string | null
          ativo?: boolean
          cargo?: string
          condicao?: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          organization_id?: string | null
          texto_cargo_documento: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          assinatura_url?: string | null
          ativo?: boolean
          cargo?: string
          condicao?: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          organization_id?: string | null
          texto_cargo_documento?: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "dpg_gestao_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          conselho_numero: string | null
          conselho_tipo: string | null
          conselho_uf: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          id: string
          is_active: boolean
          nome_fantasia: string | null
          numero: string | null
          organization_id: string
          razao_social: string
          representante_legal_cargo: string | null
          representante_legal_cpf: string | null
          representante_legal_nome: string | null
          responsavel_tecnico_cpf: string | null
          responsavel_tecnico_nome: string | null
          responsavel_tecnico_profissao: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          conselho_numero?: string | null
          conselho_tipo?: string | null
          conselho_uf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          is_active?: boolean
          nome_fantasia?: string | null
          numero?: string | null
          organization_id?: string
          razao_social: string
          representante_legal_cargo?: string | null
          representante_legal_cpf?: string | null
          representante_legal_nome?: string | null
          responsavel_tecnico_cpf?: string | null
          responsavel_tecnico_nome?: string | null
          responsavel_tecnico_profissao?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          conselho_numero?: string | null
          conselho_tipo?: string | null
          conselho_uf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          is_active?: boolean
          nome_fantasia?: string | null
          numero?: string | null
          organization_id?: string
          razao_social?: string
          representante_legal_cargo?: string | null
          representante_legal_cpf?: string | null
          representante_legal_nome?: string | null
          responsavel_tecnico_cpf?: string | null
          responsavel_tecnico_nome?: string | null
          responsavel_tecnico_profissao?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_ambiente_grupos: {
        Row: {
          ambiente_id: string
          ativo: boolean
          biblioteca_grupo_id: string | null
          created_at: string
          created_by: string | null
          entrega_id: string
          grupo_snapshot: string
          id: string
          obra_id: string
          ordem: number
          organization_id: string | null
          responsabilidade_padrao: string
          updated_at: string
        }
        Insert: {
          ambiente_id: string
          ativo?: boolean
          biblioteca_grupo_id?: string | null
          created_at?: string
          created_by?: string | null
          entrega_id: string
          grupo_snapshot: string
          id?: string
          obra_id: string
          ordem?: number
          organization_id?: string | null
          responsabilidade_padrao?: string
          updated_at?: string
        }
        Update: {
          ambiente_id?: string
          ativo?: boolean
          biblioteca_grupo_id?: string | null
          created_at?: string
          created_by?: string | null
          entrega_id?: string
          grupo_snapshot?: string
          id?: string
          obra_id?: string
          ordem?: number
          organization_id?: string | null
          responsabilidade_padrao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_ambiente_grupos_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "entrega_ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_ambiente_grupos_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entrega_vistorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_ambiente_grupos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_ambientes: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          entrega_id: string
          id: string
          nome: string
          obra_id: string
          observacoes: string | null
          ordem: number
          organization_id: string | null
          pavimento: string | null
          recebimento_ambiente_id: string | null
          tipo_modelo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          entrega_id: string
          id?: string
          nome: string
          obra_id: string
          observacoes?: string | null
          ordem?: number
          organization_id?: string | null
          pavimento?: string | null
          recebimento_ambiente_id?: string | null
          tipo_modelo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          entrega_id?: string
          id?: string
          nome?: string
          obra_id?: string
          observacoes?: string | null
          ordem?: number
          organization_id?: string | null
          pavimento?: string | null
          recebimento_ambiente_id?: string | null
          tipo_modelo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_ambientes_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entrega_vistorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_ambientes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_biblioteca_grupos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          organization_id: string | null
          responsabilidade_padrao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          organization_id?: string | null
          responsabilidade_padrao?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          organization_id?: string | null
          responsabilidade_padrao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_biblioteca_grupos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_biblioteca_verificacoes: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          grupo_id: string
          id: string
          ordem: number
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          grupo_id: string
          id?: string
          ordem?: number
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          grupo_id?: string
          id?: string
          ordem?: number
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_biblioteca_verificacoes_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "entrega_biblioteca_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_biblioteca_verificacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_fotos: {
        Row: {
          ambiente_id: string | null
          autor: string | null
          created_at: string
          entrega_id: string
          historico_id: string | null
          id: string
          legenda: string | null
          obra_id: string
          organization_id: string | null
          pendencia_id: string | null
          reinspecao_id: string | null
          storage_path: string
          tipo: string
        }
        Insert: {
          ambiente_id?: string | null
          autor?: string | null
          created_at?: string
          entrega_id: string
          historico_id?: string | null
          id?: string
          legenda?: string | null
          obra_id: string
          organization_id?: string | null
          pendencia_id?: string | null
          reinspecao_id?: string | null
          storage_path: string
          tipo?: string
        }
        Update: {
          ambiente_id?: string | null
          autor?: string | null
          created_at?: string
          entrega_id?: string
          historico_id?: string | null
          id?: string
          legenda?: string | null
          obra_id?: string
          organization_id?: string | null
          pendencia_id?: string | null
          reinspecao_id?: string | null
          storage_path?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_fotos_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "entrega_ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_fotos_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entrega_vistorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_fotos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_fotos_pendencia_id_fkey"
            columns: ["pendencia_id"]
            isOneToOne: false
            referencedRelation: "entrega_pendencias"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_participantes: {
        Row: {
          created_at: string
          entrega_id: string
          funcao_snapshot: string | null
          id: string
          nome_snapshot: string
          obra_id: string
          organization_id: string | null
          papel: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entrega_id: string
          funcao_snapshot?: string | null
          id?: string
          nome_snapshot: string
          obra_id: string
          organization_id?: string | null
          papel?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entrega_id?: string
          funcao_snapshot?: string | null
          id?: string
          nome_snapshot?: string
          obra_id?: string
          organization_id?: string | null
          papel?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entrega_participantes_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entrega_vistorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_participantes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_pendencia_historico: {
        Row: {
          autor: string | null
          autor_nome: string | null
          created_at: string
          entrega_id: string
          evento: string
          id: string
          obra_id: string
          observacao: string | null
          organization_id: string | null
          pendencia_id: string
          reinspecao_id: string | null
          situacao_anterior: string | null
          situacao_nova: string | null
        }
        Insert: {
          autor?: string | null
          autor_nome?: string | null
          created_at?: string
          entrega_id: string
          evento: string
          id?: string
          obra_id: string
          observacao?: string | null
          organization_id?: string | null
          pendencia_id: string
          reinspecao_id?: string | null
          situacao_anterior?: string | null
          situacao_nova?: string | null
        }
        Update: {
          autor?: string | null
          autor_nome?: string | null
          created_at?: string
          entrega_id?: string
          evento?: string
          id?: string
          obra_id?: string
          observacao?: string | null
          organization_id?: string | null
          pendencia_id?: string
          reinspecao_id?: string | null
          situacao_anterior?: string | null
          situacao_nova?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entrega_pendencia_historico_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_pendencia_historico_pendencia_id_fkey"
            columns: ["pendencia_id"]
            isOneToOne: false
            referencedRelation: "entrega_pendencias"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_pendencias: {
        Row: {
          ambiente_grupo_id: string | null
          ambiente_id: string | null
          cancelada_em: string | null
          cancelada_por: string | null
          created_at: string
          criada_por: string | null
          descricao: string | null
          entrega_id: string
          id: string
          impacto: string
          motivo_cancelamento: string | null
          obra_id: string
          organization_id: string | null
          prazo_correcao: string | null
          responsabilidade: string
          responsavel_terceiro: string | null
          sanada_em: string | null
          sanada_por: string | null
          situacao: string
          titulo: string
          updated_at: string
          verificacao_id: string | null
        }
        Insert: {
          ambiente_grupo_id?: string | null
          ambiente_id?: string | null
          cancelada_em?: string | null
          cancelada_por?: string | null
          created_at?: string
          criada_por?: string | null
          descricao?: string | null
          entrega_id: string
          id?: string
          impacto?: string
          motivo_cancelamento?: string | null
          obra_id: string
          organization_id?: string | null
          prazo_correcao?: string | null
          responsabilidade?: string
          responsavel_terceiro?: string | null
          sanada_em?: string | null
          sanada_por?: string | null
          situacao?: string
          titulo: string
          updated_at?: string
          verificacao_id?: string | null
        }
        Update: {
          ambiente_grupo_id?: string | null
          ambiente_id?: string | null
          cancelada_em?: string | null
          cancelada_por?: string | null
          created_at?: string
          criada_por?: string | null
          descricao?: string | null
          entrega_id?: string
          id?: string
          impacto?: string
          motivo_cancelamento?: string | null
          obra_id?: string
          organization_id?: string | null
          prazo_correcao?: string | null
          responsabilidade?: string
          responsavel_terceiro?: string | null
          sanada_em?: string | null
          sanada_por?: string | null
          situacao?: string
          titulo?: string
          updated_at?: string
          verificacao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entrega_pendencias_ambiente_grupo_id_fkey"
            columns: ["ambiente_grupo_id"]
            isOneToOne: false
            referencedRelation: "entrega_ambiente_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_pendencias_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "entrega_ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_pendencias_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entrega_vistorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_pendencias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_pendencias_verificacao_id_fkey"
            columns: ["verificacao_id"]
            isOneToOne: false
            referencedRelation: "entrega_verificacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_reinspecao_itens: {
        Row: {
          avaliado_em: string | null
          avaliado_por: string | null
          created_at: string
          id: string
          obra_id: string
          observacao: string | null
          organization_id: string | null
          pendencia_id: string
          reinspecao_id: string
          resultado: string | null
        }
        Insert: {
          avaliado_em?: string | null
          avaliado_por?: string | null
          created_at?: string
          id?: string
          obra_id: string
          observacao?: string | null
          organization_id?: string | null
          pendencia_id: string
          reinspecao_id: string
          resultado?: string | null
        }
        Update: {
          avaliado_em?: string | null
          avaliado_por?: string | null
          created_at?: string
          id?: string
          obra_id?: string
          observacao?: string | null
          organization_id?: string | null
          pendencia_id?: string
          reinspecao_id?: string
          resultado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entrega_reinspecao_itens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_reinspecao_itens_pendencia_id_fkey"
            columns: ["pendencia_id"]
            isOneToOne: false
            referencedRelation: "entrega_pendencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_reinspecao_itens_reinspecao_id_fkey"
            columns: ["reinspecao_id"]
            isOneToOne: false
            referencedRelation: "entrega_reinspecoes"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_reinspecoes: {
        Row: {
          concluida_em: string | null
          created_at: string
          data: string
          entrega_id: string
          id: string
          obra_id: string
          observacoes: string | null
          organization_id: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          sequencia: number
          status: string
          updated_at: string
        }
        Insert: {
          concluida_em?: string | null
          created_at?: string
          data?: string
          entrega_id: string
          id?: string
          obra_id: string
          observacoes?: string | null
          organization_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          sequencia?: number
          status?: string
          updated_at?: string
        }
        Update: {
          concluida_em?: string | null
          created_at?: string
          data?: string
          entrega_id?: string
          id?: string
          obra_id?: string
          observacoes?: string | null
          organization_id?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          sequencia?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_reinspecoes_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entrega_vistorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_reinspecoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_template_grupos: {
        Row: {
          created_at: string
          grupo_id: string
          id: string
          ordem: number
          organization_id: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          grupo_id: string
          id?: string
          ordem?: number
          organization_id?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          grupo_id?: string
          id?: string
          ordem?: number
          organization_id?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_template_grupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "entrega_biblioteca_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_template_grupos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_template_grupos_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "entrega_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_templates: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          organization_id: string | null
          tipo_modelo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          organization_id?: string | null
          tipo_modelo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          organization_id?: string | null
          tipo_modelo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_verificacoes: {
        Row: {
          ambiente_grupo_id: string
          ambiente_id: string
          ativo: boolean
          biblioteca_verificacao_id: string | null
          created_at: string
          descricao_snapshot: string
          entrega_id: string
          id: string
          obra_id: string
          observacao: string | null
          ordem: number
          organization_id: string | null
          respondido_em: string | null
          respondido_por: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ambiente_grupo_id: string
          ambiente_id: string
          ativo?: boolean
          biblioteca_verificacao_id?: string | null
          created_at?: string
          descricao_snapshot: string
          entrega_id: string
          id?: string
          obra_id: string
          observacao?: string | null
          ordem?: number
          organization_id?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ambiente_grupo_id?: string
          ambiente_id?: string
          ativo?: boolean
          biblioteca_verificacao_id?: string | null
          created_at?: string
          descricao_snapshot?: string
          entrega_id?: string
          id?: string
          obra_id?: string
          observacao?: string | null
          ordem?: number
          organization_id?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_verificacoes_ambiente_grupo_id_fkey"
            columns: ["ambiente_grupo_id"]
            isOneToOne: false
            referencedRelation: "entrega_ambiente_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_verificacoes_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "entrega_ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_verificacoes_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entrega_vistorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_verificacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_vistorias: {
        Row: {
          cancelada_em: string | null
          cancelada_por: string | null
          ciencia_em: string | null
          ciencia_observacoes: string | null
          ciencia_por: string | null
          created_at: string
          data: string
          id: string
          iniciado_em: string
          iniciado_por: string | null
          motivo_cancelamento: string | null
          obra_id: string
          observacoes: string | null
          organization_id: string | null
          recebimento_definitivo_data: string | null
          recebimento_definitivo_id: string | null
          resultado_congelado: string | null
          resultado_resumo: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          cancelada_em?: string | null
          cancelada_por?: string | null
          ciencia_em?: string | null
          ciencia_observacoes?: string | null
          ciencia_por?: string | null
          created_at?: string
          data?: string
          id?: string
          iniciado_em?: string
          iniciado_por?: string | null
          motivo_cancelamento?: string | null
          obra_id: string
          observacoes?: string | null
          organization_id?: string | null
          recebimento_definitivo_data?: string | null
          recebimento_definitivo_id?: string | null
          resultado_congelado?: string | null
          resultado_resumo?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancelada_em?: string | null
          cancelada_por?: string | null
          ciencia_em?: string | null
          ciencia_observacoes?: string | null
          ciencia_por?: string | null
          created_at?: string
          data?: string
          id?: string
          iniciado_em?: string
          iniciado_por?: string | null
          motivo_cancelamento?: string | null
          obra_id?: string
          observacoes?: string | null
          organization_id?: string | null
          recebimento_definitivo_data?: string | null
          recebimento_definitivo_id?: string | null
          resultado_congelado?: string | null
          resultado_resumo?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_vistorias_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_vistorias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_vistorias_recebimento_definitivo_id_fkey"
            columns: ["recebimento_definitivo_id"]
            isOneToOne: false
            referencedRelation: "recebimento_vistorias"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            referencedRelation: "nuclei_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fire_extinguishers_nucleus_id_fkey"
            columns: ["nucleus_id"]
            isOneToOne: false
            referencedRelation: "nuclei_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fire_extinguishers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fonte_mercado_contatos: {
        Row: {
          created_at: string
          email: string | null
          fonte_id: string
          id: string
          nome: string | null
          organization_id: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          fonte_id: string
          id?: string
          nome?: string | null
          organization_id: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          fonte_id?: string
          id?: string
          nome?: string | null
          organization_id?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fonte_mercado_contatos_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes_mercado"
            referencedColumns: ["id"]
          },
        ]
      }
      fontes_mercado: {
        Row: {
          created_at: string
          id: string
          nome: string
          observacao: string | null
          organization_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          observacao?: string | null
          organization_id: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          observacao?: string | null
          organization_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            referencedRelation: "nuclei_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hydrants_nucleus_id_fkey"
            columns: ["nucleus_id"]
            isOneToOne: false
            referencedRelation: "nuclei_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hydrants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      imoveis: {
        Row: {
          anuncio_id: string | null
          anuncio_url: string | null
          area_construida: number | null
          area_terreno: number | null
          bairro: string | null
          cep: string | null
          complemento: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          endereco: string | null
          endereco_normalizado: string | null
          foto_hashes: string[]
          id: string
          municipio_ibge: string | null
          municipio_nome: string | null
          numero: string | null
          organization_id: string
          padrao: string | null
          tipo_imovel: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          anuncio_id?: string | null
          anuncio_url?: string | null
          area_construida?: number | null
          area_terreno?: number | null
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          endereco?: string | null
          endereco_normalizado?: string | null
          foto_hashes?: string[]
          id?: string
          municipio_ibge?: string | null
          municipio_nome?: string | null
          numero?: string | null
          organization_id: string
          padrao?: string | null
          tipo_imovel: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          anuncio_id?: string | null
          anuncio_url?: string | null
          area_construida?: number | null
          area_terreno?: number | null
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          endereco?: string | null
          endereco_normalizado?: string | null
          foto_hashes?: string[]
          id?: string
          municipio_ibge?: string | null
          municipio_nome?: string | null
          numero?: string | null
          organization_id?: string
          padrao?: string | null
          tipo_imovel?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      imovel_ambientes: {
        Row: {
          area: number | null
          created_at: string
          id: string
          imovel_id: string
          nome: string | null
          observacao: string | null
          organization_id: string
          quantidade: number
          tipo: string
        }
        Insert: {
          area?: number | null
          created_at?: string
          id?: string
          imovel_id: string
          nome?: string | null
          observacao?: string | null
          organization_id: string
          quantidade?: number
          tipo: string
        }
        Update: {
          area?: number | null
          created_at?: string
          id?: string
          imovel_id?: string
          nome?: string | null
          observacao?: string | null
          organization_id?: string
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_ambientes_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_atributos: {
        Row: {
          atributo_id: string
          fonte: string | null
          id: string
          imovel_id: string
          organization_id: string
          updated_at: string
          valor_bool: boolean | null
          valor_category: string | null
          valor_numeric: number | null
          valor_status: string | null
          valor_text: string | null
        }
        Insert: {
          atributo_id: string
          fonte?: string | null
          id?: string
          imovel_id: string
          organization_id: string
          updated_at?: string
          valor_bool?: boolean | null
          valor_category?: string | null
          valor_numeric?: number | null
          valor_status?: string | null
          valor_text?: string | null
        }
        Update: {
          atributo_id?: string
          fonte?: string | null
          id?: string
          imovel_id?: string
          organization_id?: string
          updated_at?: string
          valor_bool?: boolean | null
          valor_category?: string | null
          valor_numeric?: number | null
          valor_status?: string | null
          valor_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imovel_atributos_atributo_id_fkey"
            columns: ["atributo_id"]
            isOneToOne: false
            referencedRelation: "atributos_imobiliarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_atributos_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_componentes: {
        Row: {
          componente: string
          created_at: string
          estado: string | null
          id: string
          imovel_id: string
          observacao: string | null
          organization_id: string
        }
        Insert: {
          componente: string
          created_at?: string
          estado?: string | null
          id?: string
          imovel_id: string
          observacao?: string | null
          organization_id: string
        }
        Update: {
          componente?: string
          created_at?: string
          estado?: string | null
          id?: string
          imovel_id?: string
          observacao?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_componentes_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_documentos: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          imovel_id: string
          organization_id: string
          storage_ref: string
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          imovel_id: string
          organization_id: string
          storage_ref: string
          tipo?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          imovel_id?: string
          organization_id?: string
          storage_ref?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_documentos_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_infraestrutura: {
        Row: {
          created_at: string
          id: string
          imovel_id: string
          item: string
          observacao: string | null
          organization_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          imovel_id: string
          item: string
          observacao?: string | null
          organization_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          imovel_id?: string
          item?: string
          observacao?: string | null
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_infraestrutura_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_localizacao: {
        Row: {
          fonte: string | null
          id: string
          imovel_id: string
          latitude: number | null
          longitude: number | null
          observacao: string | null
          organization_id: string
          precisao: string
          updated_at: string
        }
        Insert: {
          fonte?: string | null
          id?: string
          imovel_id: string
          latitude?: number | null
          longitude?: number | null
          observacao?: string | null
          organization_id: string
          precisao?: string
          updated_at?: string
        }
        Update: {
          fonte?: string | null
          id?: string
          imovel_id?: string
          latitude?: number | null
          longitude?: number | null
          observacao?: string | null
          organization_id?: string
          precisao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_localizacao_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: true
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_midias: {
        Row: {
          created_at: string
          created_by: string | null
          hash: string | null
          id: string
          imovel_id: string
          legenda: string | null
          organization_id: string
          storage_ref: string
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hash?: string | null
          id?: string
          imovel_id: string
          legenda?: string | null
          organization_id: string
          storage_ref: string
          tipo?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hash?: string | null
          id?: string
          imovel_id?: string
          legenda?: string | null
          organization_id?: string
          storage_ref?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_midias_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_snapshots: {
        Row: {
          avaliacao_id: string | null
          created_at: string
          created_by: string | null
          dados: Json
          hash: string
          id: string
          imovel_id: string
          motivo: string
          organization_id: string
        }
        Insert: {
          avaliacao_id?: string | null
          created_at?: string
          created_by?: string | null
          dados: Json
          hash: string
          id?: string
          imovel_id: string
          motivo: string
          organization_id: string
        }
        Update: {
          avaliacao_id?: string | null
          created_at?: string
          created_by?: string | null
          dados?: Json
          hash?: string
          id?: string
          imovel_id?: string
          motivo?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_snapshots_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_snapshots_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_vistoria_itens: {
        Row: {
          avaliacao_id: string
          created_at: string
          id: string
          item: string
          observacao: string | null
          organization_id: string
          situacao: string | null
          vistoria_id: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          id?: string
          item: string
          observacao?: string | null
          organization_id: string
          situacao?: string | null
          vistoria_id: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          id?: string
          item?: string
          observacao?: string | null
          organization_id?: string
          situacao?: string | null
          vistoria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_vistoria_itens_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_vistoria_itens_vistoria_id_fkey"
            columns: ["vistoria_id"]
            isOneToOne: false
            referencedRelation: "imovel_vistorias"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_vistoria_midias: {
        Row: {
          avaliacao_id: string
          created_at: string
          id: string
          legenda: string | null
          organization_id: string
          storage_ref: string
          vistoria_id: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          id?: string
          legenda?: string | null
          organization_id: string
          storage_ref: string
          vistoria_id: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          id?: string
          legenda?: string | null
          organization_id?: string
          storage_ref?: string
          vistoria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_vistoria_midias_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_vistoria_midias_vistoria_id_fkey"
            columns: ["vistoria_id"]
            isOneToOne: false
            referencedRelation: "imovel_vistorias"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_vistorias: {
        Row: {
          avaliacao_id: string
          created_at: string
          data_vistoria: string
          estado_conservacao: string | null
          id: string
          imovel_id: string
          observacao: string | null
          organization_id: string
          responsavel_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          data_vistoria: string
          estado_conservacao?: string | null
          id?: string
          imovel_id: string
          observacao?: string | null
          organization_id: string
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          data_vistoria?: string
          estado_conservacao?: string | null
          id?: string
          imovel_id?: string
          observacao?: string | null
          organization_id?: string
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_vistorias_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_vistorias_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_anexos: {
        Row: {
          avaliacao_id: string
          id: string
          incluido: boolean
          laudo_versao_id: string
          numero: string
          opcional: boolean
          organization_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          avaliacao_id: string
          id?: string
          incluido?: boolean
          laudo_versao_id: string
          numero: string
          opcional?: boolean
          organization_id: string
          tipo: string
          titulo: string
        }
        Update: {
          avaliacao_id?: string
          id?: string
          incluido?: boolean
          laudo_versao_id?: string
          numero?: string
          opcional?: boolean
          organization_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudo_anexos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudo_anexos_laudo_versao_id_fkey"
            columns: ["laudo_versao_id"]
            isOneToOne: false
            referencedRelation: "laudo_versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_arquivos_emitidos: {
        Row: {
          avaliacao_id: string
          created_at: string
          created_by: string | null
          display_filename: string | null
          emissao_id: string
          file_size: number | null
          file_type: string | null
          formato: string
          hash: string | null
          id: string
          mime_type: string | null
          organization_id: string
          sha256: string | null
          storage_bucket: string | null
          storage_path: string | null
          storage_ref: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          created_by?: string | null
          display_filename?: string | null
          emissao_id: string
          file_size?: number | null
          file_type?: string | null
          formato: string
          hash?: string | null
          id?: string
          mime_type?: string | null
          organization_id: string
          sha256?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          storage_ref: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          created_by?: string | null
          display_filename?: string | null
          emissao_id?: string
          file_size?: number | null
          file_type?: string | null
          formato?: string
          hash?: string | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          sha256?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          storage_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudo_arquivos_emitidos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudo_arquivos_emitidos_emissao_id_fkey"
            columns: ["emissao_id"]
            isOneToOne: false
            referencedRelation: "laudo_emissoes"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_blocos: {
        Row: {
          avaliacao_id: string
          config: Json
          conteudo: string | null
          created_at: string
          id: string
          ordem: number
          organization_id: string
          secao_id: string
          tipo: string
        }
        Insert: {
          avaliacao_id: string
          config?: Json
          conteudo?: string | null
          created_at?: string
          id?: string
          ordem?: number
          organization_id: string
          secao_id: string
          tipo: string
        }
        Update: {
          avaliacao_id?: string
          config?: Json
          conteudo?: string | null
          created_at?: string
          id?: string
          ordem?: number
          organization_id?: string
          secao_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudo_blocos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudo_blocos_secao_id_fkey"
            columns: ["secao_id"]
            isOneToOne: false
            referencedRelation: "laudo_secoes"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_emissao_snapshots: {
        Row: {
          avaliacao_id: string
          created_at: string
          dados: Json
          emissao_id: string
          hash: string
          id: string
          organization_id: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          dados: Json
          emissao_id: string
          hash: string
          id?: string
          organization_id: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          dados?: Json
          emissao_id?: string
          hash?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudo_emissao_snapshots_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudo_emissao_snapshots_emissao_id_fkey"
            columns: ["emissao_id"]
            isOneToOne: true
            referencedRelation: "laudo_emissoes"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_emissoes: {
        Row: {
          avaliacao_id: string
          codigo: string
          emitido_em: string
          emitido_por: string
          hash: string
          id: string
          laudo_versao_id: string
          organization_id: string
          preflight_run_id: string
          revisao: number
        }
        Insert: {
          avaliacao_id: string
          codigo: string
          emitido_em?: string
          emitido_por: string
          hash: string
          id?: string
          laudo_versao_id: string
          organization_id: string
          preflight_run_id: string
          revisao: number
        }
        Update: {
          avaliacao_id?: string
          codigo?: string
          emitido_em?: string
          emitido_por?: string
          hash?: string
          id?: string
          laudo_versao_id?: string
          organization_id?: string
          preflight_run_id?: string
          revisao?: number
        }
        Relationships: [
          {
            foreignKeyName: "laudo_emissoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudo_emissoes_laudo_versao_id_fkey"
            columns: ["laudo_versao_id"]
            isOneToOne: true
            referencedRelation: "laudo_versoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudo_emissoes_preflight_run_id_fkey"
            columns: ["preflight_run_id"]
            isOneToOne: false
            referencedRelation: "laudo_preflight_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_preflight_results: {
        Row: {
          avaliacao_id: string
          codigo: string
          id: string
          mensagem: string
          organization_id: string
          run_id: string
          status: string
        }
        Insert: {
          avaliacao_id: string
          codigo: string
          id?: string
          mensagem: string
          organization_id: string
          run_id: string
          status: string
        }
        Update: {
          avaliacao_id?: string
          codigo?: string
          id?: string
          mensagem?: string
          organization_id?: string
          run_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudo_preflight_results_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudo_preflight_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "laudo_preflight_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_preflight_runs: {
        Row: {
          avaliacao_id: string
          created_at: string
          executado_por: string | null
          id: string
          laudo_versao_id: string
          organization_id: string
          resultado: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          executado_por?: string | null
          id?: string
          laudo_versao_id: string
          organization_id: string
          resultado: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          executado_por?: string | null
          id?: string
          laudo_versao_id?: string
          organization_id?: string
          resultado?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudo_preflight_runs_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudo_preflight_runs_laudo_versao_id_fkey"
            columns: ["laudo_versao_id"]
            isOneToOne: false
            referencedRelation: "laudo_versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_secoes: {
        Row: {
          aprovada_em: string | null
          aprovada_por: string | null
          avaliacao_id: string
          blocos_sistema: string[]
          codigo: string
          conteudo: string
          id: string
          laudo_versao_id: string
          numerada: boolean
          obrigatoria: boolean
          ordem: number
          organization_id: string
          stale: boolean
          status: string
          titulo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aprovada_em?: string | null
          aprovada_por?: string | null
          avaliacao_id: string
          blocos_sistema?: string[]
          codigo: string
          conteudo?: string
          id?: string
          laudo_versao_id: string
          numerada?: boolean
          obrigatoria?: boolean
          ordem: number
          organization_id: string
          stale?: boolean
          status?: string
          titulo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aprovada_em?: string | null
          aprovada_por?: string | null
          avaliacao_id?: string
          blocos_sistema?: string[]
          codigo?: string
          conteudo?: string
          id?: string
          laudo_versao_id?: string
          numerada?: boolean
          obrigatoria?: boolean
          ordem?: number
          organization_id?: string
          stale?: boolean
          status?: string
          titulo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "laudo_secoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudo_secoes_laudo_versao_id_fkey"
            columns: ["laudo_versao_id"]
            isOneToOne: false
            referencedRelation: "laudo_versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_template_blocks: {
        Row: {
          config: Json
          id: string
          ordem: number
          section_id: string
          tipo: string
        }
        Insert: {
          config?: Json
          id?: string
          ordem: number
          section_id: string
          tipo: string
        }
        Update: {
          config?: Json
          id?: string
          ordem?: number
          section_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudo_template_blocks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "laudo_template_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_template_sections: {
        Row: {
          blocos_sistema: string[]
          codigo: string
          conteudo_padrao: string
          id: string
          numerada: boolean
          obrigatoria: boolean
          ordem: number
          template_version_id: string
          titulo: string
        }
        Insert: {
          blocos_sistema?: string[]
          codigo: string
          conteudo_padrao?: string
          id?: string
          numerada?: boolean
          obrigatoria?: boolean
          ordem: number
          template_version_id: string
          titulo: string
        }
        Update: {
          blocos_sistema?: string[]
          codigo?: string
          conteudo_padrao?: string
          id?: string
          numerada?: boolean
          obrigatoria?: boolean
          ordem?: number
          template_version_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudo_template_sections_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "laudo_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_template_versions: {
        Row: {
          created_at: string
          id: string
          status: string
          template_id: string
          versao: number
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          template_id: string
          versao: number
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          template_id?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "laudo_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "laudo_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_templates: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          nome: string
          organization_id: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          nome: string
          organization_id?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          organization_id?: string | null
        }
        Relationships: []
      }
      laudo_texto_versoes: {
        Row: {
          avaliacao_id: string
          conteudo: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          secao_id: string
        }
        Insert: {
          avaliacao_id: string
          conteudo: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          secao_id: string
        }
        Update: {
          avaliacao_id?: string
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          secao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudo_texto_versoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudo_texto_versoes_secao_id_fkey"
            columns: ["secao_id"]
            isOneToOne: false
            referencedRelation: "laudo_secoes"
            referencedColumns: ["id"]
          },
        ]
      }
      laudo_versoes: {
        Row: {
          avaliacao_id: string
          avaliacao_versao_id: string
          created_at: string
          created_by: string | null
          id: string
          laudo_id: string
          motivo_revisao: string | null
          organization_id: string
          revisao: number
          status: string
        }
        Insert: {
          avaliacao_id: string
          avaliacao_versao_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          laudo_id: string
          motivo_revisao?: string | null
          organization_id: string
          revisao: number
          status?: string
        }
        Update: {
          avaliacao_id?: string
          avaliacao_versao_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          laudo_id?: string
          motivo_revisao?: string | null
          organization_id?: string
          revisao?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudo_versoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudo_versoes_avaliacao_versao_id_fkey"
            columns: ["avaliacao_versao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_versoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudo_versoes_laudo_id_fkey"
            columns: ["laudo_id"]
            isOneToOne: false
            referencedRelation: "laudos"
            referencedColumns: ["id"]
          },
        ]
      }
      laudos: {
        Row: {
          avaliacao_id: string
          created_at: string
          id: string
          organization_id: string
          template_version_id: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          id?: string
          organization_id: string
          template_version_id: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          template_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "laudos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: true
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laudos_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "laudo_template_versions"
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
      maintenance_inbound_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          note: string | null
          organization_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          note?: string | null
          organization_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_inbound_addresses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_managers: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          id: string
          nome: string
          ordem: number
          organization_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          ordem?: number
          organization_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          ordem?: number
          organization_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_managers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_ticket_email_outbox: {
        Row: {
          attempts: number
          created_at: string
          id: string
          kind: string
          last_error: string | null
          organization_id: string | null
          payload: Json | null
          scheduled_for: string
          sent_at: string | null
          status: string
          ticket_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          kind: string
          last_error?: string | null
          organization_id?: string | null
          payload?: Json | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          ticket_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          organization_id?: string | null
          payload?: Json | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_ticket_email_outbox_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_email_outbox_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_ticket_emails: {
        Row: {
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          created_at: string
          direction: string
          from_addr: string | null
          id: string
          in_reply_to: string | null
          message_id: string | null
          meta: Json | null
          organization_id: string | null
          received_at: string
          subject: string | null
          ticket_id: string
          to_addrs: string[] | null
        }
        Insert: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          direction: string
          from_addr?: string | null
          id?: string
          in_reply_to?: string | null
          message_id?: string | null
          meta?: Json | null
          organization_id?: string | null
          received_at?: string
          subject?: string | null
          ticket_id: string
          to_addrs?: string[] | null
        }
        Update: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          direction?: string
          from_addr?: string | null
          id?: string
          in_reply_to?: string | null
          message_id?: string | null
          meta?: Json | null
          organization_id?: string | null
          received_at?: string
          subject?: string | null
          ticket_id?: string
          to_addrs?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_ticket_emails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_emails_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_ticket_impediments: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          motivo: string
          organization_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_name: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          motivo: string
          organization_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          motivo?: string
          organization_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_name?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_ticket_impediments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_impediments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_ticket_services: {
        Row: {
          completed: boolean
          created_at: string
          custom_assignment: boolean
          description: string | null
          envolve_viagem: boolean
          execution_photos: Json
          id: string
          location: string | null
          manager_id: string | null
          manager_ids: string[]
          materials: Json
          nucleo_id: string | null
          order_index: number
          organization_id: string | null
          reference_photos: Json
          scheduled_date: string | null
          status: string
          ticket_id: string
          title: string
          travel_cidade: string | null
          travel_data_ida: string | null
          travel_data_volta: string | null
          travel_diarias: number | null
          travel_id: string | null
          travel_is_linked: boolean
          travel_sem_previsao: boolean
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          custom_assignment?: boolean
          description?: string | null
          envolve_viagem?: boolean
          execution_photos?: Json
          id?: string
          location?: string | null
          manager_id?: string | null
          manager_ids?: string[]
          materials?: Json
          nucleo_id?: string | null
          order_index?: number
          organization_id?: string | null
          reference_photos?: Json
          scheduled_date?: string | null
          status?: string
          ticket_id: string
          title: string
          travel_cidade?: string | null
          travel_data_ida?: string | null
          travel_data_volta?: string | null
          travel_diarias?: number | null
          travel_id?: string | null
          travel_is_linked?: boolean
          travel_sem_previsao?: boolean
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          custom_assignment?: boolean
          description?: string | null
          envolve_viagem?: boolean
          execution_photos?: Json
          id?: string
          location?: string | null
          manager_id?: string | null
          manager_ids?: string[]
          materials?: Json
          nucleo_id?: string | null
          order_index?: number
          organization_id?: string | null
          reference_photos?: Json
          scheduled_date?: string | null
          status?: string
          ticket_id?: string
          title?: string
          travel_cidade?: string | null
          travel_data_ida?: string | null
          travel_data_volta?: string | null
          travel_diarias?: number | null
          travel_id?: string | null
          travel_is_linked?: boolean
          travel_sem_previsao?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_ticket_services_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "maintenance_ticket_services_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "maintenance_ticket_services_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos_central"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_services_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos_central_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_services_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "vw_nucleos_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_services_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_services_travel_id_fkey"
            columns: ["travel_id"]
            isOneToOne: false
            referencedRelation: "travels"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_ticket_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_name: string | null
          from_status: string | null
          id: string
          organization_id: string | null
          ticket_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          from_status?: string | null
          id?: string
          organization_id?: string | null
          ticket_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          from_status?: string | null
          id?: string
          organization_id?: string | null
          ticket_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_ticket_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_ticket_status_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          archive_pdf_url: string | null
          assignee: string
          completed_at: string | null
          confirmation_file_name: string | null
          confirmation_file_url: string | null
          confirmation_reminder_sent_at: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          confirmed_source: string | null
          created_at: string
          finalization_note: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          inbound_message_id: string | null
          is_draft: boolean
          location: string
          manager_id: string | null
          manager_ids: string[]
          materials: Json | null
          nucleo_id: string | null
          observations: string[] | null
          organization_id: string
          priority: string
          process_number: string | null
          raw_email: Json | null
          reference_photos: Json
          reference_videos: Json
          request_type: string | null
          requested_at: string
          requester_email: string | null
          services: Json | null
          source: string
          status: string
          ticket_number: number
          title: string
          travel_id: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archive_pdf_url?: string | null
          assignee: string
          completed_at?: string | null
          confirmation_file_name?: string | null
          confirmation_file_url?: string | null
          confirmation_reminder_sent_at?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          confirmed_source?: string | null
          created_at?: string
          finalization_note?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          inbound_message_id?: string | null
          is_draft?: boolean
          location: string
          manager_id?: string | null
          manager_ids?: string[]
          materials?: Json | null
          nucleo_id?: string | null
          observations?: string[] | null
          organization_id?: string
          priority: string
          process_number?: string | null
          raw_email?: Json | null
          reference_photos?: Json
          reference_videos?: Json
          request_type?: string | null
          requested_at?: string
          requester_email?: string | null
          services?: Json | null
          source?: string
          status: string
          ticket_number?: number
          title: string
          travel_id?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archive_pdf_url?: string | null
          assignee?: string
          completed_at?: string | null
          confirmation_file_name?: string | null
          confirmation_file_url?: string | null
          confirmation_reminder_sent_at?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          confirmed_source?: string | null
          created_at?: string
          finalization_note?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          inbound_message_id?: string | null
          is_draft?: boolean
          location?: string
          manager_id?: string | null
          manager_ids?: string[]
          materials?: Json | null
          nucleo_id?: string | null
          observations?: string[] | null
          organization_id?: string
          priority?: string
          process_number?: string | null
          raw_email?: Json | null
          reference_photos?: Json
          reference_videos?: Json
          request_type?: string | null
          requested_at?: string
          requester_email?: string | null
          services?: Json | null
          source?: string
          status?: string
          ticket_number?: number
          title?: string
          travel_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos_central"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos_central_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "vw_nucleos_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_travel_id_fkey"
            columns: ["travel_id"]
            isOneToOne: false
            referencedRelation: "travels"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_types: {
        Row: {
          ativo: boolean
          created_at: string
          icone: string
          id: string
          nome: string
          ordem: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          icone?: string
          id?: string
          nome: string
          ordem?: number
          organization_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          icone?: string
          id?: string
          nome?: string
          ordem?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          unit?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      medicao_items: {
        Row: {
          congelado_em: string | null
          created_at: string
          id: string
          item_code: string
          medicao_id: string
          pct: number
          pct_congelado: number | null
          qtd: number
          qtd_congelado: number | null
          total: number
          total_congelado: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          congelado_em?: string | null
          created_at?: string
          id?: string
          item_code: string
          medicao_id: string
          pct?: number
          pct_congelado?: number | null
          qtd?: number
          qtd_congelado?: number | null
          total?: number
          total_congelado?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          congelado_em?: string | null
          created_at?: string
          id?: string
          item_code?: string
          medicao_id?: string
          pct?: number
          pct_congelado?: number | null
          qtd?: number
          qtd_congelado?: number | null
          total?: number
          total_congelado?: number | null
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
          data_relatorio: string | null
          data_vistoria: string | null
          id: string
          obra_id: string
          periodo_fim: string | null
          periodo_inicio: string | null
          sequencia: number
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_relatorio?: string | null
          data_vistoria?: string | null
          id?: string
          obra_id: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          sequencia: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_relatorio?: string | null
          data_vistoria?: string | null
          id?: string
          obra_id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
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
      model_acceptances: {
        Row: {
          accepted_at: string
          accepted_by: string
          avaliacao_id: string
          execucao_id: string
          id: string
          invalidado_em: string | null
          invalidado_motivo: string | null
          justificativa: string | null
          modelo_id: string
          organization_id: string
          status: string
          validation_id: string
        }
        Insert: {
          accepted_at?: string
          accepted_by: string
          avaliacao_id: string
          execucao_id: string
          id?: string
          invalidado_em?: string | null
          invalidado_motivo?: string | null
          justificativa?: string | null
          modelo_id: string
          organization_id: string
          status?: string
          validation_id: string
        }
        Update: {
          accepted_at?: string
          accepted_by?: string
          avaliacao_id?: string
          execucao_id?: string
          id?: string
          invalidado_em?: string | null
          invalidado_motivo?: string | null
          justificativa?: string | null
          modelo_id?: string
          organization_id?: string
          status?: string
          validation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_acceptances_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_acceptances_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_acceptances_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_acceptances_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "model_validations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_validation_results: {
        Row: {
          avaliacao_id: string
          bloqueante: boolean
          codigo: string
          dados: Json | null
          detalhe: string | null
          grau: string | null
          id: string
          modo: string
          nome: string
          numero: number
          organization_id: string
          origem: string
          revisado: boolean
          status: string
          validation_id: string
          valor: number | null
        }
        Insert: {
          avaliacao_id: string
          bloqueante?: boolean
          codigo: string
          dados?: Json | null
          detalhe?: string | null
          grau?: string | null
          id?: string
          modo: string
          nome: string
          numero: number
          organization_id: string
          origem: string
          revisado?: boolean
          status: string
          validation_id: string
          valor?: number | null
        }
        Update: {
          avaliacao_id?: string
          bloqueante?: boolean
          codigo?: string
          dados?: Json | null
          detalhe?: string | null
          grau?: string | null
          id?: string
          modo?: string
          nome?: string
          numero?: number
          organization_id?: string
          origem?: string
          revisado?: boolean
          status?: string
          validation_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_validation_results_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_validation_results_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "model_validations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_validations: {
        Row: {
          amplitude_pct: number | null
          avaliacao_id: string
          created_at: string
          created_by: string | null
          execucao_id: string
          fundamentacao_grau: string | null
          id: string
          modelo_id: string
          organization_id: string
          overall_status: string
          policy_id: string
          precisao_grau: string | null
          resumo_json: Json
          stale: boolean
        }
        Insert: {
          amplitude_pct?: number | null
          avaliacao_id: string
          created_at?: string
          created_by?: string | null
          execucao_id: string
          fundamentacao_grau?: string | null
          id?: string
          modelo_id: string
          organization_id: string
          overall_status: string
          policy_id: string
          precisao_grau?: string | null
          resumo_json: Json
          stale?: boolean
        }
        Update: {
          amplitude_pct?: number | null
          avaliacao_id?: string
          created_at?: string
          created_by?: string | null
          execucao_id?: string
          fundamentacao_grau?: string | null
          id?: string
          modelo_id?: string
          organization_id?: string
          overall_status?: string
          policy_id?: string
          precisao_grau?: string | null
          resumo_json?: Json
          stale?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "model_validations_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_validations_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_validations_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_validations_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "validation_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_anova: {
        Row: {
          avaliacao_id: string
          created_at: string
          execucao_id: string
          f: number | null
          fonte: string
          gl: number
          id: string
          modelo_id: string
          mq: number
          ordem: number
          organization_id: string
          significancia: number | null
          sq: number
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          execucao_id: string
          f?: number | null
          fonte: string
          gl: number
          id?: string
          modelo_id: string
          mq: number
          ordem: number
          organization_id: string
          significancia?: number | null
          sq: number
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          execucao_id?: string
          f?: number | null
          fonte?: string
          gl?: number
          id?: string
          modelo_id?: string
          mq?: number
          ordem?: number
          organization_id?: string
          significancia?: number | null
          sq?: number
        }
        Relationships: [
          {
            foreignKeyName: "modelo_anova_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_anova_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_anova_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_anova_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_coeficientes: {
        Row: {
          avaliacao_id: string
          beta: number
          codigo: string
          erro_padrao: number
          execucao_id: string
          id: string
          ordem: number
          organization_id: string
          sig: number
          t: number
          transformacao: string | null
        }
        Insert: {
          avaliacao_id: string
          beta: number
          codigo: string
          erro_padrao: number
          execucao_id: string
          id?: string
          ordem: number
          organization_id: string
          sig: number
          t: number
          transformacao?: string | null
        }
        Update: {
          avaliacao_id?: string
          beta?: number
          codigo?: string
          erro_padrao?: number
          execucao_id?: string
          id?: string
          ordem?: number
          organization_id?: string
          sig?: number
          t?: number
          transformacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modelo_coeficientes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_coeficientes_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_correlacoes: {
        Row: {
          avaliacao_id: string
          correlacao: number | null
          created_at: string
          escala: string
          execucao_id: string
          id: string
          modelo_id: string
          organization_id: string
          variavel_a: string
          variavel_b: string
        }
        Insert: {
          avaliacao_id: string
          correlacao?: number | null
          created_at?: string
          escala?: string
          execucao_id: string
          id?: string
          modelo_id: string
          organization_id: string
          variavel_a: string
          variavel_b: string
        }
        Update: {
          avaliacao_id?: string
          correlacao?: number | null
          created_at?: string
          escala?: string
          execucao_id?: string
          id?: string
          modelo_id?: string
          organization_id?: string
          variavel_a?: string
          variavel_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelo_correlacoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_correlacoes_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_correlacoes_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_correlacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_estatisticas_variaveis: {
        Row: {
          amplitude: number
          avaliacao_id: string
          created_at: string
          desvio_padrao: number
          desvio_padrao_transformado: number
          execucao_id: string
          id: string
          maximo: number
          maximo_transformado: number
          media: number
          media_transformada: number
          minimo: number
          minimo_transformado: number
          modelo_id: string
          n: number
          organization_id: string
          papel: string
          transformacao: string
          variavel: string
        }
        Insert: {
          amplitude: number
          avaliacao_id: string
          created_at?: string
          desvio_padrao: number
          desvio_padrao_transformado: number
          execucao_id: string
          id?: string
          maximo: number
          maximo_transformado: number
          media: number
          media_transformada: number
          minimo: number
          minimo_transformado: number
          modelo_id: string
          n: number
          organization_id: string
          papel: string
          transformacao: string
          variavel: string
        }
        Update: {
          amplitude?: number
          avaliacao_id?: string
          created_at?: string
          desvio_padrao?: number
          desvio_padrao_transformado?: number
          execucao_id?: string
          id?: string
          maximo?: number
          maximo_transformado?: number
          media?: number
          media_transformada?: number
          minimo?: number
          minimo_transformado?: number
          modelo_id?: string
          n?: number
          organization_id?: string
          papel?: string
          transformacao?: string
          variavel?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelo_estatisticas_variaveis_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_estatisticas_variaveis_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_estatisticas_variaveis_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_estatisticas_variaveis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_execucao_erros: {
        Row: {
          avaliacao_id: string
          codigo: string
          created_at: string
          detalhe: Json
          execucao_id: string
          id: string
          organization_id: string
        }
        Insert: {
          avaliacao_id: string
          codigo: string
          created_at?: string
          detalhe?: Json
          execucao_id: string
          id?: string
          organization_id: string
        }
        Update: {
          avaliacao_id?: string
          codigo?: string
          created_at?: string
          detalhe?: Json
          execucao_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelo_execucao_erros_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_execucao_erros_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_extrapolacoes: {
        Row: {
          avaliacao_id: string
          created_at: string
          execucao_id: string
          id: string
          inside: boolean
          max_amostra: number
          min_amostra: number
          modelo_id: string
          organization_id: string
          valor_avaliando: number
          variavel: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          execucao_id: string
          id?: string
          inside: boolean
          max_amostra: number
          min_amostra: number
          modelo_id: string
          organization_id: string
          valor_avaliando: number
          variavel: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          execucao_id?: string
          id?: string
          inside?: boolean
          max_amostra?: number
          min_amostra?: number
          modelo_id?: string
          organization_id?: string
          valor_avaliando?: number
          variavel?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelo_extrapolacoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_extrapolacoes_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_extrapolacoes_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_extrapolacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_normalidade: {
        Row: {
          avaliacao_id: string
          created_at: string
          criterio: string | null
          execucao_id: string
          id: string
          limite_inferior: number | null
          limite_superior: number | null
          modelo_id: string
          observado: number
          organization_id: string
          policy_id: string | null
          referencia: number | null
          status: string
          tolerancia: number | null
          z: number
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          criterio?: string | null
          execucao_id: string
          id?: string
          limite_inferior?: number | null
          limite_superior?: number | null
          modelo_id: string
          observado: number
          organization_id: string
          policy_id?: string | null
          referencia?: number | null
          status: string
          tolerancia?: number | null
          z: number
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          criterio?: string | null
          execucao_id?: string
          id?: string
          limite_inferior?: number | null
          limite_superior?: number | null
          modelo_id?: string
          observado?: number
          organization_id?: string
          policy_id?: string | null
          referencia?: number | null
          status?: string
          tolerancia?: number | null
          z?: number
        }
        Relationships: [
          {
            foreignKeyName: "modelo_normalidade_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_normalidade_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_normalidade_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_normalidade_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_normalidade_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "validation_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_residuos: {
        Row: {
          amostra_id: string
          avaliacao_id: string
          cook: number
          created_at: string
          estimado_original: number
          estimado_transformado: number
          execucao_id: string
          id: string
          leverage: number
          modelo_id: string
          observado_original: number
          observado_transformado: number
          ordem: number
          organization_id: string
          residuo: number
          residuo_dp: number
          residuo_relativo: number | null
        }
        Insert: {
          amostra_id: string
          avaliacao_id: string
          cook: number
          created_at?: string
          estimado_original: number
          estimado_transformado: number
          execucao_id: string
          id?: string
          leverage: number
          modelo_id: string
          observado_original: number
          observado_transformado: number
          ordem: number
          organization_id: string
          residuo: number
          residuo_dp: number
          residuo_relativo?: number | null
        }
        Update: {
          amostra_id?: string
          avaliacao_id?: string
          cook?: number
          created_at?: string
          estimado_original?: number
          estimado_transformado?: number
          execucao_id?: string
          id?: string
          leverage?: number
          modelo_id?: string
          observado_original?: number
          observado_transformado?: number
          ordem?: number
          organization_id?: string
          residuo?: number
          residuo_dp?: number
          residuo_relativo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modelo_residuos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_residuos_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_residuos_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_residuos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_resultado_resumo: {
        Row: {
          amplitude_pct: number | null
          avaliacao_id: string
          centro_preliminar: number | null
          created_at: string
          execucao_id: string
          extrapola: boolean | null
          f: number | null
          grau_precisao: string | null
          id: string
          k: number
          modelo_id: string
          n: number
          organization_id: string
          pior_sig_regressor: number | null
          r2: number | null
          r2_ajustado: number | null
          sig_f: number | null
        }
        Insert: {
          amplitude_pct?: number | null
          avaliacao_id: string
          centro_preliminar?: number | null
          created_at?: string
          execucao_id: string
          extrapola?: boolean | null
          f?: number | null
          grau_precisao?: string | null
          id?: string
          k: number
          modelo_id: string
          n: number
          organization_id: string
          pior_sig_regressor?: number | null
          r2?: number | null
          r2_ajustado?: number | null
          sig_f?: number | null
        }
        Update: {
          amplitude_pct?: number | null
          avaliacao_id?: string
          centro_preliminar?: number | null
          created_at?: string
          execucao_id?: string
          extrapola?: boolean | null
          f?: number | null
          grau_precisao?: string | null
          id?: string
          k?: number
          modelo_id?: string
          n?: number
          organization_id?: string
          pior_sig_regressor?: number | null
          r2?: number | null
          r2_ajustado?: number | null
          sig_f?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modelo_resultado_resumo_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_resultado_resumo_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: true
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_resultado_resumo_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      modelo_snapshots: {
        Row: {
          avaliacao_id: string
          created_at: string
          dados: Json
          execucao_id: string
          hash: string
          id: string
          modelo_id: string
          organization_id: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          dados: Json
          execucao_id: string
          hash: string
          id?: string
          modelo_id: string
          organization_id: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          dados?: Json
          execucao_id?: string
          hash?: string
          id?: string
          modelo_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelo_snapshots_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_snapshots_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelo_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelo_snapshots_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      module_tiers: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          includes_tier_id: string | null
          key: string
          module_id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          includes_tier_id?: string | null
          key: string
          module_id: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          includes_tier_id?: string | null
          key?: string
          module_id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_tiers_includes_tier_id_fkey"
            columns: ["includes_tier_id"]
            isOneToOne: false
            referencedRelation: "module_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_tiers_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "commercial_modules"
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nuclei_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nucleo_module_visibility: {
        Row: {
          created_at: string
          id: string
          module_key: string
          nucleo_id: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          module_key: string
          nucleo_id: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          module_key?: string
          nucleo_id?: string
          organization_id?: string | null
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
          {
            foreignKeyName: "nucleo_module_visibility_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "nucleo_teletrabalho_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          telefone_auxiliar_coordenador?: string | null
          telefone_coordenador_substituto?: string | null
          telefone_membro_coordenador?: string | null
          telefones?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nucleos_central_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_action_logs: {
        Row: {
          action_description: string
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          obra_id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          obra_id: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          obra_id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_action_logs_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_arts: {
        Row: {
          aditivo_session_id: string | null
          created_at: string
          id: string
          numero_art: string
          obra_id: string
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          aditivo_session_id?: string | null
          created_at?: string
          id?: string
          numero_art: string
          obra_id: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          aditivo_session_id?: string | null
          created_at?: string
          id?: string
          numero_art?: string
          obra_id?: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_arts_aditivo_session_id_fkey"
            columns: ["aditivo_session_id"]
            isOneToOne: false
            referencedRelation: "aditivo_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_arts_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
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
      obra_fiscal_substitutos: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          obra_id: string
          substitute_user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          obra_id: string
          substitute_user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          obra_id?: string
          substitute_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_fiscal_substitutos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_inicio_alteracoes: {
        Row: {
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          data_anterior: string | null
          data_nova: string
          documento_url: string | null
          id: string
          motivo: string
          obra_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          data_anterior?: string | null
          data_nova: string
          documento_url?: string | null
          id?: string
          motivo: string
          obra_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          data_anterior?: string | null
          data_nova?: string
          documento_url?: string | null
          id?: string
          motivo?: string
          obra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_inicio_alteracoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          aditivo_prazo: number | null
          area_interferencia_m2: number | null
          condicao_imovel: string | null
          condicao_imovel_custom: string | null
          configuracao_edificacao: string | null
          coordinates_lat: number | null
          coordinates_lng: number | null
          created_at: string
          created_by: string | null
          data_inicio: string | null
          data_inicio_prevista: string | null
          data_prevista_inauguracao: string | null
          data_recebimento_definitivo: string | null
          data_recebimento_provisorio: string | null
          data_termino_real: string | null
          descricao_edificacao_custom: string | null
          descricao_imovel: string | null
          descricao_tecnica_imovel: string | null
          documentos: Json | null
          empresa_id: string | null
          empresa_responsavel: string | null
          endereco_completo: string | null
          fiscal_id: string | null
          fotos: Json | null
          id: string
          is_demo: boolean
          is_public: boolean
          municipio: string
          n_contrato: string | null
          nome: string
          nucleo_nome: string | null
          numero_art_execucao: string | null
          objeto_contrato: string | null
          obra_bloqueada: boolean | null
          organization_id: string
          percentual_desconto: number | null
          porcentagem_execucao: number | null
          prazo_observacao_dias: number | null
          previsao_termino: string | null
          rdo_habilitado: boolean
          regiao: string | null
          responsavel_projeto_id: string | null
          secretaria_responsavel: string | null
          sei_numero: string | null
          sem_previsao_inauguracao: boolean | null
          sistemas_servicos_ids: string[] | null
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
          area_interferencia_m2?: number | null
          condicao_imovel?: string | null
          condicao_imovel_custom?: string | null
          configuracao_edificacao?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          created_by?: string | null
          data_inicio?: string | null
          data_inicio_prevista?: string | null
          data_prevista_inauguracao?: string | null
          data_recebimento_definitivo?: string | null
          data_recebimento_provisorio?: string | null
          data_termino_real?: string | null
          descricao_edificacao_custom?: string | null
          descricao_imovel?: string | null
          descricao_tecnica_imovel?: string | null
          documentos?: Json | null
          empresa_id?: string | null
          empresa_responsavel?: string | null
          endereco_completo?: string | null
          fiscal_id?: string | null
          fotos?: Json | null
          id?: string
          is_demo?: boolean
          is_public?: boolean
          municipio: string
          n_contrato?: string | null
          nome: string
          nucleo_nome?: string | null
          numero_art_execucao?: string | null
          objeto_contrato?: string | null
          obra_bloqueada?: boolean | null
          organization_id?: string
          percentual_desconto?: number | null
          porcentagem_execucao?: number | null
          prazo_observacao_dias?: number | null
          previsao_termino?: string | null
          rdo_habilitado?: boolean
          regiao?: string | null
          responsavel_projeto_id?: string | null
          secretaria_responsavel?: string | null
          sei_numero?: string | null
          sem_previsao_inauguracao?: boolean | null
          sistemas_servicos_ids?: string[] | null
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
          area_interferencia_m2?: number | null
          condicao_imovel?: string | null
          condicao_imovel_custom?: string | null
          configuracao_edificacao?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          created_by?: string | null
          data_inicio?: string | null
          data_inicio_prevista?: string | null
          data_prevista_inauguracao?: string | null
          data_recebimento_definitivo?: string | null
          data_recebimento_provisorio?: string | null
          data_termino_real?: string | null
          descricao_edificacao_custom?: string | null
          descricao_imovel?: string | null
          descricao_tecnica_imovel?: string | null
          documentos?: Json | null
          empresa_id?: string | null
          empresa_responsavel?: string | null
          endereco_completo?: string | null
          fiscal_id?: string | null
          fotos?: Json | null
          id?: string
          is_demo?: boolean
          is_public?: boolean
          municipio?: string
          n_contrato?: string | null
          nome?: string
          nucleo_nome?: string | null
          numero_art_execucao?: string | null
          objeto_contrato?: string | null
          obra_bloqueada?: boolean | null
          organization_id?: string
          percentual_desconto?: number | null
          porcentagem_execucao?: number | null
          prazo_observacao_dias?: number | null
          previsao_termino?: string | null
          rdo_habilitado?: boolean
          regiao?: string | null
          responsavel_projeto_id?: string | null
          secretaria_responsavel?: string | null
          sei_numero?: string | null
          sem_previsao_inauguracao?: boolean | null
          sistemas_servicos_ids?: string[] | null
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
          {
            foreignKeyName: "obras_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          valor_total_sem_desconto: number | null
          valor_unitario: number
          valor_unitario_bruto: number | null
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
          valor_total_sem_desconto?: number | null
          valor_unitario?: number
          valor_unitario_bruto?: number | null
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
          valor_total_sem_desconto?: number | null
          valor_unitario?: number
          valor_unitario_bruto?: number | null
        }
        Relationships: []
      }
      orcamento_itens: {
        Row: {
          bdi_personalizado: number | null
          codigo: string | null
          codigo_base: string | null
          created_at: string
          descricao: string
          eh_mao_de_obra: boolean | null
          encargo_personalizado: number | null
          fonte: string | null
          id: string
          item_numero: string
          nivel: number
          orcamento_id: string
          ordem: number
          organization_id: string
          parent_id: string | null
          preco_unitario_base: number | null
          preco_unitario_com_bdi: number | null
          quantidade: number | null
          tipo: string
          unidade: string | null
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          bdi_personalizado?: number | null
          codigo?: string | null
          codigo_base?: string | null
          created_at?: string
          descricao: string
          eh_mao_de_obra?: boolean | null
          encargo_personalizado?: number | null
          fonte?: string | null
          id?: string
          item_numero: string
          nivel?: number
          orcamento_id: string
          ordem?: number
          organization_id?: string
          parent_id?: string | null
          preco_unitario_base?: number | null
          preco_unitario_com_bdi?: number | null
          quantidade?: number | null
          tipo: string
          unidade?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          bdi_personalizado?: number | null
          codigo?: string | null
          codigo_base?: string | null
          created_at?: string
          descricao?: string
          eh_mao_de_obra?: boolean | null
          encargo_personalizado?: number | null
          fonte?: string | null
          id?: string
          item_numero?: string
          nivel?: number
          orcamento_id?: string
          ordem?: number
          organization_id?: string
          parent_id?: string | null
          preco_unitario_base?: number | null
          preco_unitario_com_bdi?: number | null
          quantidade?: number | null
          tipo?: string
          unidade?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "orcamento_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          arredondamento: string | null
          bases_referencia: Json | null
          bdi_incidencia: string | null
          bdi_manual: number | null
          bdi_percentual: number | null
          categoria: string | null
          cliente: string | null
          codigo: string
          created_at: string
          created_by: string | null
          data_abertura_licitacao: string | null
          data_criacao: string
          encargos_sociais_percentual: number | null
          id: string
          is_licitacao: boolean | null
          nome: string
          numero_processo_licitacao: string | null
          organization_id: string
          prazo_entrega: string | null
          status: string | null
          tipo_encargo: string | null
          tipo_licitacao: string | null
          updated_at: string
          valor_total: number | null
          valor_total_bdi: number | null
          valor_total_sem_bdi: number | null
        }
        Insert: {
          arredondamento?: string | null
          bases_referencia?: Json | null
          bdi_incidencia?: string | null
          bdi_manual?: number | null
          bdi_percentual?: number | null
          categoria?: string | null
          cliente?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          data_abertura_licitacao?: string | null
          data_criacao?: string
          encargos_sociais_percentual?: number | null
          id?: string
          is_licitacao?: boolean | null
          nome: string
          numero_processo_licitacao?: string | null
          organization_id?: string
          prazo_entrega?: string | null
          status?: string | null
          tipo_encargo?: string | null
          tipo_licitacao?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_total_bdi?: number | null
          valor_total_sem_bdi?: number | null
        }
        Update: {
          arredondamento?: string | null
          bases_referencia?: Json | null
          bdi_incidencia?: string | null
          bdi_manual?: number | null
          bdi_percentual?: number | null
          categoria?: string | null
          cliente?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          data_abertura_licitacao?: string | null
          data_criacao?: string
          encargos_sociais_percentual?: number | null
          id?: string
          is_licitacao?: boolean | null
          nome?: string
          numero_processo_licitacao?: string | null
          organization_id?: string
          prazo_entrega?: string | null
          status?: string | null
          tipo_encargo?: string | null
          tipo_licitacao?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_total_bdi?: number | null
          valor_total_sem_bdi?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_entitlement_overrides: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          key: string
          motivo: string
          organization_id: string
          updated_at: string
          valid_from: string
          valid_to: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          key: string
          motivo: string
          organization_id: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          key?: string
          motivo?: string
          organization_id?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_entitlement_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_entitlements: {
        Row: {
          api_enabled: boolean
          can_use_manutencao: boolean
          can_use_obras: boolean
          can_use_preventivos: boolean
          can_use_rdo: boolean
          computed_at: string
          external_users_limit: number | null
          internal_users_limit: number | null
          organization_id: string
          personalizacao_institucional: boolean
          priority_support: boolean
          sso_enabled: boolean
          storage_limit_bytes: number | null
        }
        Insert: {
          api_enabled?: boolean
          can_use_manutencao?: boolean
          can_use_obras?: boolean
          can_use_preventivos?: boolean
          can_use_rdo?: boolean
          computed_at?: string
          external_users_limit?: number | null
          internal_users_limit?: number | null
          organization_id: string
          personalizacao_institucional?: boolean
          priority_support?: boolean
          sso_enabled?: boolean
          storage_limit_bytes?: number | null
        }
        Update: {
          api_enabled?: boolean
          can_use_manutencao?: boolean
          can_use_obras?: boolean
          can_use_preventivos?: boolean
          can_use_rdo?: boolean
          computed_at?: string
          external_users_limit?: number | null
          internal_users_limit?: number | null
          organization_id?: string
          personalizacao_institucional?: boolean
          priority_support?: boolean
          sso_enabled?: boolean
          storage_limit_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          activated_at: string | null
          created_at: string
          id: string
          invited_at: string | null
          member_type: string
          organization_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          member_type?: string
          organization_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          member_type?: string
          organization_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_sequences: {
        Row: {
          ano: number
          id: string
          last_value: number
          organization_id: string
          scope: string
          updated_at: string
        }
        Insert: {
          ano: number
          id?: string
          last_value?: number
          organization_id: string
          scope: string
          updated_at?: string
        }
        Update: {
          ano?: number
          id?: string
          last_value?: number
          organization_id?: string
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_usage_counters: {
        Row: {
          external_users_count: number
          internal_users_count: number
          organization_id: string
          storage_bytes_used: number
          storage_counted_at: string | null
          users_counted_at: string
        }
        Insert: {
          external_users_count?: number
          internal_users_count?: number
          organization_id: string
          storage_bytes_used?: number
          storage_counted_at?: string | null
          users_counted_at?: string
        }
        Update: {
          external_users_count?: number
          internal_users_count?: number
          organization_id?: string
          storage_bytes_used?: number
          storage_counted_at?: string | null
          users_counted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_usage_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_validation_policy: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          policy_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          policy_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_validation_policy_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_validation_policy_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "validation_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          abrangencia_geografica: string | null
          cnpj: string | null
          created_at: string
          id: string
          maintenance_allowed_domains: string[]
          maintenance_inbound_alias: string | null
          maintenance_inbound_enabled: boolean
          maintenance_sender_policy: string
          municipio_ibge: string | null
          municipio_nome: string | null
          nome: string
          slug: string
          status: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          abrangencia_geografica?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          maintenance_allowed_domains?: string[]
          maintenance_inbound_alias?: string | null
          maintenance_inbound_enabled?: boolean
          maintenance_sender_policy?: string
          municipio_ibge?: string | null
          municipio_nome?: string | null
          nome: string
          slug: string
          status?: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          abrangencia_geografica?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          maintenance_allowed_domains?: string[]
          maintenance_inbound_alias?: string | null
          maintenance_inbound_enabled?: boolean
          maintenance_sender_policy?: string
          municipio_ibge?: string | null
          municipio_nome?: string | null
          nome?: string
          slug?: string
          status?: string
          uf?: string | null
          updated_at?: string
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
      pesquisa_mercado_fontes: {
        Row: {
          avaliacao_id: string
          created_at: string
          fonte_id: string
          id: string
          observacao: string | null
          organization_id: string
          pesquisa_id: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          fonte_id: string
          id?: string
          observacao?: string | null
          organization_id: string
          pesquisa_id: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          fonte_id?: string
          id?: string
          observacao?: string | null
          organization_id?: string
          pesquisa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesquisa_mercado_fontes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisa_mercado_fontes_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes_mercado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisa_mercado_fontes_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas_mercado"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisas_mercado: {
        Row: {
          abrangencia: string | null
          avaliacao_id: string
          created_at: string
          id: string
          observacao: string | null
          organization_id: string
          periodo_fim: string | null
          periodo_inicio: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          abrangencia?: string | null
          avaliacao_id: string
          created_at?: string
          id?: string
          observacao?: string | null
          organization_id: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          abrangencia?: string | null
          avaliacao_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
          organization_id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesquisas_mercado_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_versions: {
        Row: {
          api_enabled: boolean
          created_at: string
          external_users_limit: number
          id: string
          internal_users_limit: number
          personalizacao_institucional: boolean
          plan_id: string
          priority_support: boolean
          sso_enabled: boolean
          storage_limit_bytes: number
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          api_enabled?: boolean
          created_at?: string
          external_users_limit: number
          id?: string
          internal_users_limit: number
          personalizacao_institucional?: boolean
          plan_id: string
          priority_support?: boolean
          sso_enabled?: boolean
          storage_limit_bytes: number
          updated_at?: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          api_enabled?: boolean
          created_at?: string
          external_users_limit?: number
          id?: string
          internal_users_limit?: number
          personalizacao_institucional?: boolean
          plan_id?: string
          priority_support?: boolean
          sso_enabled?: boolean
          storage_limit_bytes?: number
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_expansao_historico: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          id: string
          meta_id: string
          organization_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          id?: string
          meta_id: string
          organization_id?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          id?: string
          meta_id?: string
          organization_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_expansao_historico_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "plano_expansao_metas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_expansao_historico_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_expansao_metas: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          data_inclusao: string | null
          data_retirada: string | null
          documento_ref: string | null
          estagio_econucleo: number | null
          etapa_atual: string | null
          etapa_index: number
          id: string
          jornada: string
          justificativa: string | null
          motivo_atencao: string | null
          municipio: string
          nivel_atencao: string
          nucleo_nome: string | null
          obra_id: string | null
          observacoes: string | null
          ordem: number
          organization_id: string
          previsao_conclusao: string | null
          progresso: number
          revisao_id: string | null
          sei_numero: string | null
          situacao: string
          status_plano: string
          tipo_intervencao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          data_inclusao?: string | null
          data_retirada?: string | null
          documento_ref?: string | null
          estagio_econucleo?: number | null
          etapa_atual?: string | null
          etapa_index?: number
          id?: string
          jornada?: string
          justificativa?: string | null
          motivo_atencao?: string | null
          municipio: string
          nivel_atencao?: string
          nucleo_nome?: string | null
          obra_id?: string | null
          observacoes?: string | null
          ordem?: number
          organization_id?: string
          previsao_conclusao?: string | null
          progresso?: number
          revisao_id?: string | null
          sei_numero?: string | null
          situacao?: string
          status_plano?: string
          tipo_intervencao?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          data_inclusao?: string | null
          data_retirada?: string | null
          documento_ref?: string | null
          estagio_econucleo?: number | null
          etapa_atual?: string | null
          etapa_index?: number
          id?: string
          jornada?: string
          justificativa?: string | null
          motivo_atencao?: string | null
          municipio?: string
          nivel_atencao?: string
          nucleo_nome?: string | null
          obra_id?: string | null
          observacoes?: string | null
          ordem?: number
          organization_id?: string
          previsao_conclusao?: string | null
          progresso?: number
          revisao_id?: string | null
          sei_numero?: string | null
          situacao?: string
          status_plano?: string
          tipo_intervencao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_expansao_metas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_expansao_metas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_expansao_metas_revisao_id_fkey"
            columns: ["revisao_id"]
            isOneToOne: false
            referencedRelation: "plano_expansao_revisoes"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_expansao_revisoes: {
        Row: {
          ano_vigencia: string
          created_at: string
          id: string
          nome: string
          observacao: string | null
          organization_id: string
          updated_at: string
          vigente: boolean
        }
        Insert: {
          ano_vigencia: string
          created_at?: string
          id?: string
          nome: string
          observacao?: string | null
          organization_id?: string
          updated_at?: string
          vigente?: boolean
        }
        Update: {
          ano_vigencia?: string
          created_at?: string
          id?: string
          nome?: string
          observacao?: string | null
          organization_id?: string
          updated_at?: string
          vigente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "plano_expansao_revisoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          key: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          key: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          key?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      price_items: {
        Row: {
          addon_id: string | null
          amount_cents: number
          created_at: string
          currency: string
          id: string
          module_tier_id: string | null
          plan_id: string | null
          price_table_id: string
          updated_at: string
        }
        Insert: {
          addon_id?: string | null
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          module_tier_id?: string | null
          plan_id?: string | null
          price_table_id: string
          updated_at?: string
        }
        Update: {
          addon_id?: string | null
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          module_tier_id?: string | null
          plan_id?: string | null
          price_table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_items_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_items_module_tier_id_fkey"
            columns: ["module_tier_id"]
            isOneToOne: false
            referencedRelation: "module_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_items_price_table_id_fkey"
            columns: ["price_table_id"]
            isOneToOne: false
            referencedRelation: "price_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      price_tables: {
        Row: {
          created_at: string
          id: string
          nome: string
          status: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          status?: string
          updated_at?: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          status?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          crea_cau: string | null
          created_at: string
          department: string | null
          display_name: string | null
          email: string | null
          empresa_id: string | null
          force_password_change: boolean | null
          id: string
          is_active: boolean
          is_maintenance_responsible: boolean
          language: string | null
          phone: string | null
          position: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          sectors: Database["public"]["Enums"]["sector_type"][] | null
          setores_atuantes: string[] | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          crea_cau?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          empresa_id?: string | null
          force_password_change?: boolean | null
          id?: string
          is_active?: boolean
          is_maintenance_responsible?: boolean
          language?: string | null
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          sectors?: Database["public"]["Enums"]["sector_type"][] | null
          setores_atuantes?: string[] | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          crea_cau?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          empresa_id?: string | null
          force_password_change?: boolean | null
          id?: string
          is_active?: boolean
          is_maintenance_responsible?: boolean
          language?: string | null
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          sectors?: Database["public"]["Enums"]["sector_type"][] | null
          setores_atuantes?: string[] | null
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "rdo_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          deleted_at: string | null
          deleted_by: string | null
          edited_at: string | null
          edited_by: string | null
          id: string
          item_ref: string | null
          orcamento_item_id: string | null
          original_texto: string | null
          report_id: string
          source: string | null
          texto: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          item_ref?: string | null
          orcamento_item_id?: string | null
          original_texto?: string | null
          report_id: string
          source?: string | null
          texto: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          item_ref?: string | null
          orcamento_item_id?: string | null
          original_texto?: string | null
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
          organization_id: string | null
          report_id: string
          texto: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          obra_id: string
          organization_id?: string | null
          report_id: string
          texto: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          obra_id?: string
          organization_id?: string | null
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
            foreignKeyName: "rdo_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          oculto_resumo: boolean
          organization_id: string | null
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
          oculto_resumo?: boolean
          organization_id?: string | null
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
          oculto_resumo?: boolean
          organization_id?: string | null
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
            foreignKeyName: "rdo_media_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      rdo_notificacoes_enviadas: {
        Row: {
          data_referencia: string
          destinatarios: string[]
          enviado_em: string
          id: string
          obra_id: string
        }
        Insert: {
          data_referencia: string
          destinatarios: string[]
          enviado_em?: string
          id?: string
          obra_id: string
        }
        Update: {
          data_referencia?: string
          destinatarios?: string[]
          enviado_em?: string
          id?: string
          obra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_notificacoes_enviadas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "rdo_occurrences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          numero_seq?: number
          obra_id: string
          observacoes?: string | null
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "rdo_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          tipo_obra?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_templates_atividades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      recebimento_ambiente_servicos: {
        Row: {
          ambiente_id: string
          ativo: boolean
          biblioteca_servico_id: string | null
          created_at: string
          created_by: string | null
          id: string
          macro_snapshot: string
          obra_id: string
          ordem: number
          organization_id: string | null
          servico_snapshot: string
          updated_at: string
          vistoria_id: string
        }
        Insert: {
          ambiente_id: string
          ativo?: boolean
          biblioteca_servico_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          macro_snapshot: string
          obra_id: string
          ordem?: number
          organization_id?: string | null
          servico_snapshot: string
          updated_at?: string
          vistoria_id: string
        }
        Update: {
          ambiente_id?: string
          ativo?: boolean
          biblioteca_servico_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          macro_snapshot?: string
          obra_id?: string
          ordem?: number
          organization_id?: string | null
          servico_snapshot?: string
          updated_at?: string
          vistoria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recebimento_ambiente_servicos_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "recebimento_ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_ambiente_servicos_biblioteca_servico_id_fkey"
            columns: ["biblioteca_servico_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_ambiente_servicos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_ambiente_servicos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_ambiente_servicos_vistoria_id_fkey"
            columns: ["vistoria_id"]
            isOneToOne: false
            referencedRelation: "recebimento_vistorias"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimento_ambientes: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          nome: string
          obra_id: string
          observacoes: string | null
          ordem: number
          organization_id: string | null
          pavimento: string | null
          tipo_modelo: string | null
          updated_at: string
          vistoria_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          obra_id: string
          observacoes?: string | null
          ordem?: number
          organization_id?: string | null
          pavimento?: string | null
          tipo_modelo?: string | null
          updated_at?: string
          vistoria_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          obra_id?: string
          observacoes?: string | null
          ordem?: number
          organization_id?: string | null
          pavimento?: string | null
          tipo_modelo?: string | null
          updated_at?: string
          vistoria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recebimento_ambientes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_ambientes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_ambientes_vistoria_id_fkey"
            columns: ["vistoria_id"]
            isOneToOne: false
            referencedRelation: "recebimento_vistorias"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimento_fotos: {
        Row: {
          ambiente_id: string | null
          autor: string | null
          created_at: string
          historico_id: string | null
          id: string
          legenda: string | null
          obra_id: string
          organization_id: string | null
          pendencia_id: string | null
          storage_path: string
          tipo: string
          vistoria_id: string | null
        }
        Insert: {
          ambiente_id?: string | null
          autor?: string | null
          created_at?: string
          historico_id?: string | null
          id?: string
          legenda?: string | null
          obra_id: string
          organization_id?: string | null
          pendencia_id?: string | null
          storage_path: string
          tipo?: string
          vistoria_id?: string | null
        }
        Update: {
          ambiente_id?: string | null
          autor?: string | null
          created_at?: string
          historico_id?: string | null
          id?: string
          legenda?: string | null
          obra_id?: string
          organization_id?: string | null
          pendencia_id?: string | null
          storage_path?: string
          tipo?: string
          vistoria_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recebimento_fotos_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "recebimento_ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_fotos_historico_id_fkey"
            columns: ["historico_id"]
            isOneToOne: false
            referencedRelation: "recebimento_pendencia_historico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_fotos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_fotos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_fotos_pendencia_id_fkey"
            columns: ["pendencia_id"]
            isOneToOne: false
            referencedRelation: "recebimento_pendencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_fotos_vistoria_id_fkey"
            columns: ["vistoria_id"]
            isOneToOne: false
            referencedRelation: "recebimento_vistorias"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimento_pendencia_historico: {
        Row: {
          autor: string | null
          created_at: string
          evento: string
          id: string
          obra_id: string
          observacao: string | null
          organization_id: string | null
          pendencia_id: string
          situacao_anterior: string | null
          situacao_nova: string | null
          vistoria_id: string | null
        }
        Insert: {
          autor?: string | null
          created_at?: string
          evento: string
          id?: string
          obra_id: string
          observacao?: string | null
          organization_id?: string | null
          pendencia_id: string
          situacao_anterior?: string | null
          situacao_nova?: string | null
          vistoria_id?: string | null
        }
        Update: {
          autor?: string | null
          created_at?: string
          evento?: string
          id?: string
          obra_id?: string
          observacao?: string | null
          organization_id?: string | null
          pendencia_id?: string
          situacao_anterior?: string | null
          situacao_nova?: string | null
          vistoria_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recebimento_pendencia_historico_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_pendencia_historico_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_pendencia_historico_pendencia_id_fkey"
            columns: ["pendencia_id"]
            isOneToOne: false
            referencedRelation: "recebimento_pendencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_pendencia_historico_vistoria_id_fkey"
            columns: ["vistoria_id"]
            isOneToOne: false
            referencedRelation: "recebimento_vistorias"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimento_pendencias: {
        Row: {
          ambiente_id: string | null
          cancelada_em: string | null
          cancelada_por: string | null
          classificacao: string
          created_at: string
          criada_por: string | null
          descricao: string | null
          id: string
          motivo_cancelamento: string | null
          obra_id: string
          organization_id: string | null
          prazo_correcao: string | null
          sanada_em: string | null
          sanada_por: string | null
          situacao: string
          titulo: string
          updated_at: string
          verificacao_id: string | null
          vistoria_origem_id: string | null
        }
        Insert: {
          ambiente_id?: string | null
          cancelada_em?: string | null
          cancelada_por?: string | null
          classificacao?: string
          created_at?: string
          criada_por?: string | null
          descricao?: string | null
          id?: string
          motivo_cancelamento?: string | null
          obra_id: string
          organization_id?: string | null
          prazo_correcao?: string | null
          sanada_em?: string | null
          sanada_por?: string | null
          situacao?: string
          titulo: string
          updated_at?: string
          verificacao_id?: string | null
          vistoria_origem_id?: string | null
        }
        Update: {
          ambiente_id?: string | null
          cancelada_em?: string | null
          cancelada_por?: string | null
          classificacao?: string
          created_at?: string
          criada_por?: string | null
          descricao?: string | null
          id?: string
          motivo_cancelamento?: string | null
          obra_id?: string
          organization_id?: string | null
          prazo_correcao?: string | null
          sanada_em?: string | null
          sanada_por?: string | null
          situacao?: string
          titulo?: string
          updated_at?: string
          verificacao_id?: string | null
          vistoria_origem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recebimento_pendencias_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "recebimento_ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_pendencias_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_pendencias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_pendencias_verificacao_id_fkey"
            columns: ["verificacao_id"]
            isOneToOne: false
            referencedRelation: "recebimento_verificacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_pendencias_vistoria_origem_id_fkey"
            columns: ["vistoria_origem_id"]
            isOneToOne: false
            referencedRelation: "recebimento_vistorias"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimento_template_servicos: {
        Row: {
          biblioteca_servico_id: string
          created_at: string
          id: string
          ordem: number
          organization_id: string | null
          template_id: string
        }
        Insert: {
          biblioteca_servico_id: string
          created_at?: string
          id?: string
          ordem?: number
          organization_id?: string | null
          template_id: string
        }
        Update: {
          biblioteca_servico_id?: string
          created_at?: string
          id?: string
          ordem?: number
          organization_id?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recebimento_template_servicos_biblioteca_servico_id_fkey"
            columns: ["biblioteca_servico_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_template_servicos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_template_servicos_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recebimento_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimento_templates: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          escopo: string
          id: string
          nome: string
          obra_id: string | null
          ordem: number
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          escopo?: string
          id?: string
          nome: string
          obra_id?: string | null
          ordem?: number
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          escopo?: string
          id?: string
          nome?: string
          obra_id?: string | null
          ordem?: number
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recebimento_templates_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimento_verificacoes: {
        Row: {
          ambiente_id: string
          ambiente_servico_id: string
          ativo: boolean
          biblioteca_verificacao_id: string | null
          created_at: string
          descricao_snapshot: string
          id: string
          obra_id: string
          observacao: string | null
          ordem: number
          organization_id: string | null
          respondido_em: string | null
          respondido_por: string | null
          status: string
          updated_at: string
          vistoria_id: string
        }
        Insert: {
          ambiente_id: string
          ambiente_servico_id: string
          ativo?: boolean
          biblioteca_verificacao_id?: string | null
          created_at?: string
          descricao_snapshot: string
          id?: string
          obra_id: string
          observacao?: string | null
          ordem?: number
          organization_id?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          status?: string
          updated_at?: string
          vistoria_id: string
        }
        Update: {
          ambiente_id?: string
          ambiente_servico_id?: string
          ativo?: boolean
          biblioteca_verificacao_id?: string | null
          created_at?: string
          descricao_snapshot?: string
          id?: string
          obra_id?: string
          observacao?: string | null
          ordem?: number
          organization_id?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          status?: string
          updated_at?: string
          vistoria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recebimento_verificacoes_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "recebimento_ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_verificacoes_ambiente_servico_id_fkey"
            columns: ["ambiente_servico_id"]
            isOneToOne: false
            referencedRelation: "recebimento_ambiente_servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_verificacoes_biblioteca_verificacao_id_fkey"
            columns: ["biblioteca_verificacao_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_verificacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_verificacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_verificacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_verificacoes_vistoria_id_fkey"
            columns: ["vistoria_id"]
            isOneToOne: false
            referencedRelation: "recebimento_vistorias"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimento_vistorias: {
        Row: {
          cancelada_em: string | null
          cancelada_por: string | null
          concluida_por: string | null
          concluido_em: string | null
          created_at: string
          created_by: string | null
          data: string
          fiscal_id: string | null
          id: string
          iniciado_em: string
          motivo_cancelamento: string | null
          obra_id: string
          observacoes: string | null
          organization_id: string | null
          sequencia: number
          status: string
          tipo: string
          updated_at: string
          vistoria_origem_id: string | null
        }
        Insert: {
          cancelada_em?: string | null
          cancelada_por?: string | null
          concluida_por?: string | null
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          fiscal_id?: string | null
          id?: string
          iniciado_em?: string
          motivo_cancelamento?: string | null
          obra_id: string
          observacoes?: string | null
          organization_id?: string | null
          sequencia?: number
          status?: string
          tipo: string
          updated_at?: string
          vistoria_origem_id?: string | null
        }
        Update: {
          cancelada_em?: string | null
          cancelada_por?: string | null
          concluida_por?: string | null
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          fiscal_id?: string | null
          id?: string
          iniciado_em?: string
          motivo_cancelamento?: string | null
          obra_id?: string
          observacoes?: string | null
          organization_id?: string | null
          sequencia?: number
          status?: string
          tipo?: string
          updated_at?: string
          vistoria_origem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recebimento_vistorias_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_vistorias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_vistorias_vistoria_origem_id_fkey"
            columns: ["vistoria_origem_id"]
            isOneToOne: false
            referencedRelation: "recebimento_vistorias"
            referencedColumns: ["id"]
          },
        ]
      }
      rounding_policies: {
        Row: {
          casas_decimais: number
          codigo: string
          created_at: string
          id: string
          organization_id: string | null
          status: string
          versao: number
        }
        Insert: {
          casas_decimais?: number
          codigo: string
          created_at?: string
          id?: string
          organization_id?: string | null
          status?: string
          versao: number
        }
        Update: {
          casas_decimais?: number
          codigo?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          status?: string
          versao?: number
        }
        Relationships: []
      }
      stat_transformations: {
        Row: {
          codigo: string
          dominio: string
          engine_code: number
          nome: string
          ordem: number
        }
        Insert: {
          codigo: string
          dominio: string
          engine_code: number
          nome: string
          ordem: number
        }
        Update: {
          codigo?: string
          dominio?: string
          engine_code?: number
          nome?: string
          ordem?: number
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
          organization_id: string
          quantity: number
          type: Database["public"]["Enums"]["movement_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          material_id: string
          organization_id?: string
          quantity: number
          type: Database["public"]["Enums"]["movement_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          material_id?: string
          organization_id?: string
          quantity?: number
          type?: Database["public"]["Enums"]["movement_type"]
          updated_at?: string | null
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
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          entity: string
          id: string
          new_value: Json | null
          old_value: Json | null
          organization_id: string
          reason: string | null
          subscription_id: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          entity: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id: string
          reason?: string | null
          subscription_id?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          entity?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string
          reason?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_items: {
        Row: {
          addon_id: string | null
          amount_cents: number
          created_at: string
          descricao: string | null
          id: string
          item_type: string
          module_id: string | null
          module_tier_id: string | null
          plan_id: string | null
          price_item_id: string | null
          quantity: number
          subscription_id: string
          updated_at: string
        }
        Insert: {
          addon_id?: string | null
          amount_cents?: number
          created_at?: string
          descricao?: string | null
          id?: string
          item_type: string
          module_id?: string | null
          module_tier_id?: string | null
          plan_id?: string | null
          price_item_id?: string | null
          quantity?: number
          subscription_id: string
          updated_at?: string
        }
        Update: {
          addon_id?: string | null
          amount_cents?: number
          created_at?: string
          descricao?: string | null
          id?: string
          item_type?: string
          module_id?: string | null
          module_tier_id?: string | null
          plan_id?: string | null
          price_item_id?: string | null
          quantity?: number
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_items_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "commercial_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_items_module_tier_id_fkey"
            columns: ["module_tier_id"]
            isOneToOne: false
            referencedRelation: "module_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_items_price_item_id_fkey"
            columns: ["price_item_id"]
            isOneToOne: false
            referencedRelation: "price_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_items_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          cancelled_at: string | null
          contracted_amount_cents: number
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          discount_cents: number
          external_reference: string | null
          id: string
          notes: string | null
          organization_id: string
          origin: string
          plan_version_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancelled_at?: string | null
          contracted_amount_cents?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          discount_cents?: number
          external_reference?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          origin?: string
          plan_version_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancelled_at?: string | null
          contracted_amount_cents?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          discount_cents?: number
          external_reference?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          origin?: string
          plan_version_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_version_id_fkey"
            columns: ["plan_version_id"]
            isOneToOne: false
            referencedRelation: "plan_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      suporte_mensagens: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      travels: {
        Row: {
          created_at: string
          data_ida: string | null
          data_volta: string | null
          destino: string
          diarias: number | null
          id: string
          manager_ids: string[]
          motivo: string
          organization_id: string | null
          servidor: string
          ticket_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_ida?: string | null
          data_volta?: string | null
          destino: string
          diarias?: number | null
          id?: string
          manager_ids?: string[]
          motivo: string
          organization_id?: string | null
          servidor: string
          ticket_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_ida?: string | null
          data_volta?: string | null
          destino?: string
          diarias?: number | null
          id?: string
          manager_ids?: string[]
          motivo?: string
          organization_id?: string | null
          servidor?: string
          ticket_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      user_read_notifications: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_saved_filters: {
        Row: {
          created_at: string
          filters: Json
          id: string
          is_default: boolean
          name: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          is_default?: boolean
          name: string
          scope: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          is_default?: boolean
          name?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      validation_foundation_items: {
        Row: {
          avaliacao_id: string
          codigo: string
          created_at: string
          criterio_codigo: string | null
          details_json: Json
          grade_achieved: string | null
          id: string
          item_number: number
          mandatory_for_grade: boolean
          organization_id: string
          points: number
          source_type: string
          status: string
          titulo: string
          validation_id: string
        }
        Insert: {
          avaliacao_id: string
          codigo: string
          created_at?: string
          criterio_codigo?: string | null
          details_json?: Json
          grade_achieved?: string | null
          id?: string
          item_number: number
          mandatory_for_grade?: boolean
          organization_id: string
          points?: number
          source_type: string
          status: string
          titulo: string
          validation_id: string
        }
        Update: {
          avaliacao_id?: string
          codigo?: string
          created_at?: string
          criterio_codigo?: string | null
          details_json?: Json
          grade_achieved?: string | null
          id?: string
          item_number?: number
          mandatory_for_grade?: boolean
          organization_id?: string
          points?: number
          source_type?: string
          status?: string
          titulo?: string
          validation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_foundation_items_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_foundation_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_foundation_items_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "model_validations"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_foundation_manual_grades: {
        Row: {
          avaliacao_id: string
          codigo: string
          created_at: string
          created_by: string
          grau: string
          id: string
          justificativa: string
          modelo_id: string
          organization_id: string
        }
        Insert: {
          avaliacao_id: string
          codigo: string
          created_at?: string
          created_by?: string
          grau: string
          id?: string
          justificativa: string
          modelo_id: string
          organization_id: string
        }
        Update: {
          avaliacao_id?: string
          codigo?: string
          created_at?: string
          created_by?: string
          grau?: string
          id?: string
          justificativa?: string
          modelo_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_foundation_manual_grades_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_foundation_manual_grades_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_foundation_manual_grades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_foundation_summary: {
        Row: {
          avaliacao_id: string
          created_at: string
          grade_calculated: string | null
          id: string
          mandatory_requirements_json: Json
          organization_id: string
          pendencias: Json
          policy_id: string
          policy_reference: string | null
          policy_version: number
          requirements_met: boolean
          total_points: number
          validation_id: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          grade_calculated?: string | null
          id?: string
          mandatory_requirements_json?: Json
          organization_id: string
          pendencias?: Json
          policy_id: string
          policy_reference?: string | null
          policy_version: number
          requirements_met: boolean
          total_points: number
          validation_id: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          grade_calculated?: string | null
          id?: string
          mandatory_requirements_json?: Json
          organization_id?: string
          pendencias?: Json
          policy_id?: string
          policy_reference?: string | null
          policy_version?: number
          requirements_met?: boolean
          total_points?: number
          validation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_foundation_summary_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_foundation_summary_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_foundation_summary_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "validation_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_foundation_summary_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: true
            referencedRelation: "model_validations"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_manual_reviews: {
        Row: {
          avaliacao_id: string
          codigo: string
          created_at: string
          created_by: string
          decisao: string
          id: string
          justificativa: string
          modelo_id: string
          organization_id: string
        }
        Insert: {
          avaliacao_id: string
          codigo: string
          created_at?: string
          created_by: string
          decisao: string
          id?: string
          justificativa: string
          modelo_id: string
          organization_id: string
        }
        Update: {
          avaliacao_id?: string
          codigo?: string
          created_at?: string
          created_by?: string
          decisao?: string
          id?: string
          justificativa?: string
          modelo_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_manual_reviews_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_manual_reviews_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "avaliacao_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_policies: {
        Row: {
          codigo: string
          created_at: string
          id: string
          nome: string
          organization_id: string | null
          parametros: Json
          status: string
          versao: number
          vigente_desde: string
        }
        Insert: {
          codigo: string
          created_at?: string
          id?: string
          nome: string
          organization_id?: string | null
          parametros?: Json
          status?: string
          versao: number
          vigente_desde?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          organization_id?: string | null
          parametros?: Json
          status?: string
          versao?: number
          vigente_desde?: string
        }
        Relationships: []
      }
      validation_policy_rules: {
        Row: {
          ativo: boolean
          bloqueante: boolean
          codigo: string
          entra_fundamentacao: boolean
          id: string
          modo: string
          nome: string
          numero: number
          origem: string
          policy_id: string
          thresholds: Json
        }
        Insert: {
          ativo?: boolean
          bloqueante?: boolean
          codigo: string
          entra_fundamentacao?: boolean
          id?: string
          modo: string
          nome: string
          numero: number
          origem: string
          policy_id: string
          thresholds?: Json
        }
        Update: {
          ativo?: boolean
          bloqueante?: boolean
          codigo?: string
          entra_fundamentacao?: boolean
          id?: string
          modo?: string
          nome?: string
          numero?: number
          origem?: string
          policy_id?: string
          thresholds?: Json
        }
        Relationships: [
          {
            foreignKeyName: "validation_policy_rules_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "validation_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_snapshots: {
        Row: {
          acceptance_id: string | null
          avaliacao_id: string
          created_at: string
          dados: Json
          hash: string
          id: string
          organization_id: string
          validation_id: string
        }
        Insert: {
          acceptance_id?: string | null
          avaliacao_id: string
          created_at?: string
          dados: Json
          hash: string
          id?: string
          organization_id: string
          validation_id: string
        }
        Update: {
          acceptance_id?: string | null
          avaliacao_id?: string
          created_at?: string
          dados?: Json
          hash?: string
          id?: string
          organization_id?: string
          validation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_snapshots_acceptance_id_fkey"
            columns: ["acceptance_id"]
            isOneToOne: false
            referencedRelation: "model_acceptances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_snapshots_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_snapshots_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "model_validations"
            referencedColumns: ["id"]
          },
        ]
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
      nuclei_public: {
        Row: {
          address: string | null
          city: string | null
          coordinates_lat: number | null
          coordinates_lng: number | null
          created_at: string | null
          fire_department_license_document_url: string | null
          fire_department_license_valid_until: string | null
          horario_atendimento: string | null
          id: string | null
          is_agent_mode: boolean | null
          name: string | null
          uf: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string | null
          fire_department_license_document_url?: string | null
          fire_department_license_valid_until?: string | null
          horario_atendimento?: string | null
          id?: string | null
          is_agent_mode?: boolean | null
          name?: string | null
          uf?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string | null
          fire_department_license_document_url?: string | null
          fire_department_license_valid_until?: string | null
          horario_atendimento?: string | null
          id?: string | null
          is_agent_mode?: boolean | null
          name?: string | null
          uf?: string | null
          updated_at?: string | null
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
          crea_cau: string | null
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
          crea_cau?: string | null
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
          crea_cau?: string | null
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
      _medicao_item_same_org: { Args: { _item_id: string }; Returns: boolean }
      _rdo_progress_allowed: { Args: { _obra_id: string }; Returns: boolean }
      _s1_uuid: { Args: { p: string }; Returns: string }
      ajustar_medicao_congelada: {
        Args: {
          p_medicao_item_id: string
          p_pct: number
          p_qtd: number
          p_total: number
        }
        Returns: undefined
      }
      ajustar_medicao_congelada_lote: {
        Args: { p_ajustes: Json; p_motivo: string }
        Returns: number
      }
      aval_accept_model: {
        Args: { p_justificativa: string; p_validation: string }
        Returns: string
      }
      aval_ai_decide: {
        Args: { p_aprovar: boolean; p_conteudo: string; p_texto: string }
        Returns: undefined
      }
      aval_amostra_chave: { Args: { p: Json }; Returns: string }
      aval_amostra_payload: { Args: { p_dado: string }; Returns: Json }
      aval_amostras_adicionar: {
        Args: { p_avaliacao: string; p_dados: string[] }
        Returns: Json
      }
      aval_amostras_importar: {
        Args: { p_amostras?: string[]; p_avaliacao: string; p_origem: string }
        Returns: Json
      }
      aval_apply_change: {
        Args: {
          p_avaliacao: string
          p_campo: string
          p_entity_id: string
          p_entity_type: string
          p_motivo?: string
          p_valor: Json
        }
        Returns: Json
      }
      aval_apply_changes: {
        Args: { p_avaliacao: string; p_changes: Json; p_motivo?: string }
        Returns: Json
      }
      aval_audit: {
        Args: {
          _av: string
          _details?: Json
          _entity: string
          _entity_id: string
          _event: string
        }
        Returns: undefined
      }
      aval_banco_base: {
        Args: { p_filtros: Json; p_org: string; p_origem: string }
        Returns: {
          amostra_origem_id: string
          dado_id: string
          data_mais_recente: string
          imovel_id: string
          n_dados: number
          ord: number
          rk: number
        }[]
      }
      aval_banco_buscar: {
        Args: {
          p_avaliacao: string
          p_filtros?: Json
          p_limit?: number
          p_offset?: number
        }
        Returns: Json
      }
      aval_batch_active: { Args: never; Returns: boolean }
      aval_bump_stage: {
        Args: { _av: string; _stage: string }
        Returns: undefined
      }
      aval_can_edit: {
        Args: { _avaliacao: string; _perm: string }
        Returns: boolean
      }
      aval_cancel: {
        Args: { p_avaliacao: string; p_motivo: string }
        Returns: undefined
      }
      aval_change_level: {
        Args: {
          p_av: string
          p_campo: string
          p_ctx?: Json
          p_entity: string
          p_entity_id: string
        }
        Returns: Json
      }
      aval_changes_plan: {
        Args: { p_av: string; p_changes: Json }
        Returns: Json
      }
      aval_confirm_economic: {
        Args: {
          p_aplicar: boolean
          p_caracteristicas: string[]
          p_centro: string
          p_conclusao: string
          p_conclusao_texto: string
          p_justificativa: string
          p_projecao: string
          p_valor_arbitrado: number
        }
        Returns: string
      }
      aval_conjunto_compat: { Args: { p_conjunto: string }; Returns: Json }
      aval_create: {
        Args: {
          p_municipio_ibge: string
          p_municipio_nome: string
          p_processo?: string
          p_responsavel_id: string
          p_tipo: string
          p_tipo_imovel: string
          p_uf: string
        }
        Returns: string
      }
      aval_dataset_freeze: { Args: { p_conjunto: string }; Returns: string }
      aval_dataset_prepare: { Args: { p_avaliacao: string }; Returns: string }
      aval_domain_ok: {
        Args: { p_conjunto: string; p_t: string; p_variavel: string }
        Returns: boolean
      }
      aval_engine_persist_run: { Args: { p: Json }; Returns: string }
      aval_engine_persist_validation: { Args: { p: Json }; Returns: string }
      aval_evaluate_change_impact: {
        Args: {
          p_avaliacao: string
          p_campo: string
          p_entity_id?: string
          p_entity_type: string
        }
        Returns: Json
      }
      aval_evaluate_changes_impact: {
        Args: { p_avaliacao: string; p_changes: Json }
        Returns: Json
      }
      aval_find_duplicates: {
        Args: {
          p_anuncio_id: string
          p_anuncio_url: string
          p_area: number
          p_bairro?: string
          p_complemento: string
          p_endereco: string
          p_exclude?: string
          p_foto_hashes?: string[]
          p_latitude: number
          p_longitude: number
          p_municipio_ibge: string
          p_numero: string
          p_tipo_imovel?: string
        }
        Returns: {
          area_construida: number
          bairro: string
          complemento: string
          endereco: string
          imovel_id: string
          motivos: string[]
          numero: string
          pontos: number
        }[]
      }
      aval_fmt_money: { Args: { v: number }; Returns: string }
      aval_fmt_num: { Args: { casas: number; v: number }; Returns: string }
      aval_has_global_perm: { Args: { _perm: string }; Returns: boolean }
      aval_has_perm: {
        Args: { _avaliacao: string; _perm: string }
        Returns: boolean
      }
      aval_hash: { Args: { _j: Json }; Returns: string }
      aval_imovel_sharing: {
        Args: { p_avaliacao: string; p_dado?: string; p_imovel: string }
        Returns: Json
      }
      aval_impact_counts: {
        Args: { p_av: string; p_nivel: string }
        Returns: Json
      }
      aval_invalidate: {
        Args: {
          p_av: string
          p_motivo: string
          p_nivel: string
          p_secoes?: string[]
        }
        Returns: Json
      }
      aval_is_privileged: { Args: never; Returns: boolean }
      aval_is_reader: { Args: { _org: string }; Returns: boolean }
      aval_is_technical: { Args: { _uid: string }; Returns: boolean }
      aval_keep_snapshot: {
        Args: { p_amostra: string; p_avaliacao: string }
        Returns: undefined
      }
      aval_laudo_create_revision: {
        Args: { p_laudo: string; p_motivo: string }
        Returns: string
      }
      aval_laudo_init: { Args: { p_avaliacao: string }; Returns: string }
      aval_laudo_issue: { Args: { p_laudo_versao: string }; Returns: string }
      aval_laudo_preflight: {
        Args: { p_laudo_versao: string }
        Returns: string
      }
      aval_laudo_section_approve: {
        Args: { p_aprovar: boolean; p_secao: string }
        Returns: undefined
      }
      aval_laudo_section_refresh: {
        Args: { p_secao: string }
        Returns: undefined
      }
      aval_list_tecnicos: {
        Args: never
        Returns: {
          cargo: string
          display_name: string
          user_id: string
        }[]
      }
      aval_manual_review: {
        Args: {
          p_codigo: string
          p_decisao: string
          p_justificativa: string
          p_modelo: string
        }
        Returns: string
      }
      aval_model_archive: {
        Args: {
          p_arquivar?: boolean
          p_avaliacao: string
          p_modelos?: string[]
          p_rodada?: string
        }
        Returns: Json
      }
      aval_model_create: {
        Args: {
          p_amostras_excluidas?: string[]
          p_avaliacao: string
          p_conjunto: string
          p_dep_power: number
          p_dep_transf: string
          p_dep_var: string
          p_espaco?: string
          p_modelo_origem?: string
          p_nome: string
          p_origem_tipo?: string
          p_vars: Json
        }
        Returns: string
      }
      aval_model_create_core: {
        Args: {
          p_amostras_excluidas?: string[]
          p_avaliacao: string
          p_conjunto: string
          p_dep_power: number
          p_dep_transf: string
          p_dep_var: string
          p_espaco?: string
          p_modelo_origem?: string
          p_nome: string
          p_origem_tipo?: string
          p_vars: Json
        }
        Returns: string
      }
      aval_model_find_duplicate: {
        Args: { p_assinatura: string; p_avaliacao: string; p_conjunto: string }
        Returns: string
      }
      aval_model_flag: {
        Args: { p_candidato: boolean; p_favorito: boolean; p_modelo: string }
        Returns: undefined
      }
      aval_model_generate_batch: {
        Args: {
          p_avaliacao: string
          p_candidatos: Json
          p_confirmado?: boolean
          p_conjunto: string
          p_modo: string
        }
        Returns: string[]
      }
      aval_model_generate_round: {
        Args: {
          p_avaliacao: string
          p_candidatos: Json
          p_confirmado?: boolean
          p_conjunto: string
          p_estimados?: number
          p_modo: string
          p_parametros?: Json
        }
        Returns: Json
      }
      aval_model_list: {
        Args: {
          p_avaliacao: string
          p_desc?: boolean
          p_filtros?: Json
          p_limit?: number
          p_offset?: number
          p_ordem?: string
          p_rodada?: string
        }
        Returns: Json
      }
      aval_model_protegido: { Args: { p_modelo: string }; Returns: boolean }
      aval_model_run_archive: {
        Args: { p_arquivar?: boolean; p_run: string }
        Returns: Json
      }
      aval_model_runs: { Args: { p_avaliacao: string }; Returns: Json }
      aval_model_signature: {
        Args: {
          p_conjunto: string
          p_dep: string
          p_dep_power: number
          p_dep_transf: string
          p_excluidas: string[]
          p_vars: Json
        }
        Returns: string
      }
      aval_model_triagem_dados: {
        Args: { p_avaliacao: string; p_ids?: string[]; p_rodada?: string }
        Returns: Json
      }
      aval_model_withdraw_validation: {
        Args: { p_modelo: string; p_motivo?: string }
        Returns: Json
      }
      aval_my_perms: { Args: { p_avaliacao: string }; Returns: string[] }
      aval_next_sequence: {
        Args: { _ano: number; _org: string; _scope: string }
        Returns: number
      }
      aval_nivel_rank: { Args: { p: string }; Returns: number }
      aval_normalize_text: { Args: { t: string }; Returns: string }
      aval_origem_territorial_padrao: {
        Args: { p_av_ibge: string; p_imovel_ibge: string }
        Returns: string
      }
      aval_pendencias: { Args: { p_avaliacao: string }; Returns: Json }
      aval_run_recount: { Args: { p_run: string }; Returns: undefined }
      aval_send_to_validation: {
        Args: { p_modelo: string }
        Returns: undefined
      }
      aval_set_member: {
        Args: {
          p_ativo?: boolean
          p_avaliacao: string
          p_papel: string
          p_user: string
        }
        Returns: undefined
      }
      aval_sync_avaliando: {
        Args: { p_av: string; p_var?: string }
        Returns: number
      }
      aval_tokens: { Args: { p_avaliacao: string }; Returns: Json }
      aval_transform_ok: {
        Args: { p_t: string; p_x: number }
        Returns: boolean
      }
      aval_var_fonte: {
        Args: { p_atributo: string; p_campo: string }
        Returns: string
      }
      aval_var_no_conjunto: { Args: { p_var: string }; Returns: boolean }
      aval_var_resolve: {
        Args: {
          p_amostra: string
          p_dado: string
          p_imovel: string
          p_var: string
        }
        Returns: number
      }
      aval_var_usada: { Args: { p_var: string }; Returns: boolean }
      aval_variable_in_use: { Args: { _var: string }; Returns: boolean }
      aval_variaveis_status: { Args: { p_avaliacao: string }; Returns: Json }
      aval_vars_match: {
        Args: {
          p_av: string
          p_campos: string[]
          p_in_use: boolean
          p_locacional: boolean
        }
        Returns: boolean
      }
      can_edit: { Args: { user_uuid?: string }; Returns: boolean }
      can_edit_obra: {
        Args: { obra_uuid: string; user_uuid?: string }
        Returns: boolean
      }
      can_edit_rdo: { Args: { user_uuid?: string }; Returns: boolean }
      can_view_maintenance_ticket: {
        Args: {
          _ticket_manager_ids: string[]
          _ticket_user_id: string
          _user_id?: string
        }
        Returns: boolean
      }
      can_view_sensitive_data: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      cleanup_expired_reset_codes: { Args: never; Returns: undefined }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      cleanup_old_read_notifications: { Args: never; Returns: undefined }
      confirm_maintenance_service: {
        Args: { p_accept?: boolean; p_note?: string; p_token: string }
        Returns: Json
      }
      get_maintenance_ticket_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      get_public_rdo_progress_by_obra: {
        Args: { p_obra_id: string }
        Returns: number
      }
      get_rdo_progress_batch: {
        Args: { p_obra_ids: string[] }
        Returns: {
          obra_id: string
          progress: number
        }[]
      }
      get_rdo_progress_by_obra: { Args: { p_obra_id: string }; Returns: number }
      get_sidif_public_stats: {
        Args: never
        Returns: {
          medicoes_mes: number
          nucleos: number
          obras_ativas: number
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
      is_demo_user: { Args: { user_uuid?: string }; Returns: boolean }
      is_fiscal_of_obra: {
        Args: { obra_uuid: string; user_uuid?: string }
        Returns: boolean
      }
      is_maintenance_responsible: {
        Args: { _user_id?: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_login_attempt: {
        Args: {
          p_identifier: string
          p_ip_address?: unknown
          p_success: boolean
          p_user_agent?: string
        }
        Returns: undefined
      }
      maintenance_inbound_resolve: {
        Args: { p_recipients: string[]; p_sender: string }
        Returns: Json
      }
      my_org_can: { Args: { _feature: string }; Returns: boolean }
      my_org_storage_ok: { Args: never; Returns: boolean }
      obra_in_user_org: { Args: { _obra_id: string }; Returns: boolean }
      obra_is_demo: { Args: { obra_uuid: string }; Returns: boolean }
      obra_same_org_as_user: {
        Args: { _obra_id: string; _user_id: string }
        Returns: boolean
      }
      org_can: { Args: { _feature: string; _org: string }; Returns: boolean }
      org_limit: { Args: { _key: string; _org: string }; Returns: number }
      recalculate_entitlements: { Args: { _org: string }; Returns: undefined }
      reconcile_usage_counters: { Args: never; Returns: undefined }
      recount_org_users: { Args: { _org: string }; Returns: undefined }
      snapshot_medicao_items: {
        Args: { p_medicao_id: string }
        Returns: undefined
      }
      storage_admin_same_org_folder: {
        Args: { p_folder: string }
        Returns: boolean
      }
      storage_admin_same_org_obra_folder: {
        Args: { p_folder: string }
        Returns: boolean
      }
      storage_can_insert: {
        Args: { p_bucket: string; p_name: string }
        Returns: boolean
      }
      storage_can_modify: {
        Args: {
          p_bucket: string
          p_created_at: string
          p_name: string
          p_owner: string
        }
        Returns: boolean
      }
      storage_can_read: {
        Args: {
          p_bucket: string
          p_created_at: string
          p_name: string
          p_owner: string
        }
        Returns: boolean
      }
      storage_is_uploader: {
        Args: { p_name: string; p_owner: string }
        Returns: boolean
      }
      storage_object_obra: {
        Args: { p_bucket: string; p_name: string }
        Returns: string
      }
      storage_object_org: {
        Args: { p_created_at: string; p_name: string; p_owner: string }
        Returns: string
      }
      storage_path_entities_match_org: {
        Args: { p_name: string; p_org: string }
        Returns: boolean
      }
      super_admin_add_override: {
        Args: {
          p_key: string
          p_motivo: string
          p_organization_id: string
          p_valid_to?: string
          p_value: Json
        }
        Returns: string
      }
      super_admin_create_organization:
        | {
            Args: { p_cnpj: string; p_nome: string; p_slug: string }
            Returns: string
          }
        | {
            Args: {
              p_abrangencia?: string
              p_cnpj: string
              p_municipio_ibge?: string
              p_municipio_nome?: string
              p_nome: string
              p_slug: string
              p_uf?: string
            }
            Returns: string
          }
      super_admin_create_subscription: {
        Args: {
          p_addon_keys?: string[]
          p_billing_cycle?: string
          p_custom_amounts?: Json
          p_discount_cents?: number
          p_external_reference?: string
          p_module_tier_keys?: string[]
          p_notes?: string
          p_organization_id: string
          p_origin?: string
          p_period_end?: string
          p_plan_key: string
          p_started_at?: string
        }
        Returns: string
      }
      super_admin_remove_override: {
        Args: { p_override_id: string; p_reason: string }
        Returns: undefined
      }
      super_admin_save_maintenance_inbound: {
        Args: {
          p_addresses: string[]
          p_alias: string
          p_allowed_domains: string[]
          p_enabled: boolean
          p_organization_id: string
          p_sender_policy: string
        }
        Returns: undefined
      }
      super_admin_set_maintenance_inbound: {
        Args: {
          p_alias: string
          p_allowed_domains: string[]
          p_enabled: boolean
          p_organization_id: string
          p_sender_policy: string
        }
        Returns: undefined
      }
      super_admin_set_subscription_status: {
        Args: { p_reason: string; p_status: string; p_subscription_id: string }
        Returns: undefined
      }
      super_admin_update_item_price: {
        Args: { p_amount_cents: number; p_item_id: string; p_reason: string }
        Returns: undefined
      }
      super_admin_update_organization_scope: {
        Args: {
          p_abrangencia: string
          p_municipio_ibge: string
          p_municipio_nome: string
          p_organization_id: string
          p_uf: string
        }
        Returns: undefined
      }
      unaccent: { Args: { "": string }; Returns: string }
      user_has_obra_access: {
        Args: { obra_uuid: string; user_uuid: string }
        Returns: boolean
      }
      user_organization_id: { Args: { _user_id: string }; Returns: string }
      verify_internal_cron_token: {
        Args: { p_token: string }
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
        | "dif"
        | "segunda_sub"
        | "contratada"
        | "orcamento"
        | "dimensionamento"
        | "avaliacao"
      unit_type: "KG" | "M" | "LITRO" | "PC" | "CX"
      user_role:
        | "admin"
        | "editor"
        | "viewer"
        | "manutencao"
        | "gm"
        | "prestadora"
        | "contratada"
        | "demo"
        | "super_admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "dif",
        "segunda_sub",
        "contratada",
        "orcamento",
        "dimensionamento",
        "avaliacao",
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
        "demo",
        "super_admin",
      ],
    },
  },
} as const
