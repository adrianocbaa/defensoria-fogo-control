export interface Orcamento {
  id: string;
  codigo: string;
  nome: string;
  cliente: string | null;
  categoria: string | null;
  data_criacao: string;
  prazo_entrega: string | null;
  
  // Configurações de cálculo
  bdi_percentual: number;
  tipo_encargo: 'onerado' | 'desonerado';
  encargos_sociais_percentual: number;
  arredondamento: 'truncar_2' | 'arredondar_2' | 'nao_arredondar';
  bdi_incidencia: 'preco_unitario' | 'preco_final';
  bdi_manual: number | null;
  
  // Bases de referência
  bases_referencia: BaseReferencia[];
  
  // Totais
  valor_total_sem_bdi: number;
  valor_total_bdi: number;
  valor_total: number;
  
  // Status e metadados
  status: 'nao_iniciado' | 'em_andamento' | 'concluido' | 'arquivado';
  is_licitacao: boolean;
  tipo_licitacao: string | null;
  data_abertura_licitacao: string | null;
  numero_processo_licitacao: string | null;
  
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrcamentoItem {
  id: string;
  orcamento_id: string;
  parent_id: string | null;
  
  nivel: number;
  ordem: number;
  item_numero: string;
  
  tipo: 'etapa' | 'servico' | 'composicao' | 'insumo';
  
  codigo: string | null;
  codigo_base: string | null;
  fonte: string | null;
  descricao: string;
  unidade: string | null;
  
  quantidade: number;
  preco_unitario_base: number;
  preco_unitario_com_bdi: number;
  valor_total: number;
  
  bdi_personalizado: number | null;
  encargo_personalizado: number | null;
  
  eh_mao_de_obra: boolean;
  
  created_at: string;
  updated_at: string;
  
  // Virtual fields for tree rendering
  children?: OrcamentoItem[];
}

export interface BaseComposicao {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_unitario: number;
  fonte: string;
  tipo: 'composicao' | 'insumo' | 'mao_de_obra' | 'equipamento';
  estado: string | null;
  versao: string | null;
  composicao_itens: ComposicaoItem[];
  eh_mao_de_obra: boolean;
  grupo: string | null;
  observacao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComposicaoItem {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
}

export interface BaseReferencia {
  nome: string;
  local: string;
  versao: string;
  arredondamento?: string;
}

// Form types
export interface OrcamentoFormData {
  // Step 1 - Informações Gerais
  codigo: string;
  nome: string;
  cliente: string;
  categoria: string;
  prazo_entrega: string;
  is_licitacao: boolean;
  tipo_licitacao: string;
  data_abertura_licitacao: string;
  numero_processo_licitacao: string;
  
  // Step 2 - Arredondamento, encargos e BDI
  arredondamento: 'truncar_2' | 'arredondar_2' | 'nao_arredondar';
  tipo_encargo: 'onerado' | 'desonerado';
  bdi_incidencia: 'preco_unitario' | 'preco_final';
  bdi_percentual: number;
  bdi_manual: number | null;
  
  // Step 3 - Bases
  bases_referencia: BaseReferencia[];
}

// Curva ABC
export interface CurvaABCItem {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  percentual: number;
  percentual_acumulado: number;
  classificacao: 'A' | 'B' | 'C';
}
