export type EncerramentoTipo = 'TRP' | 'TRD' | 'ACT';

export type ArtTipo =
  | 'execucao'
  | 'projeto'
  | 'complementar'
  | 'fiscalizacao'
  | 'prazo'
  | 'valor'
  | 'prazo_valor'
  | 'supressao';

export const ART_TIPO_LABEL: Record<string, string> = {
  execucao: 'Execução',
  projeto: 'Projeto',
  complementar: 'Complementar',
  fiscalizacao: 'Fiscalização',
  prazo: 'Prazo',
  valor: 'Valor',
  prazo_valor: 'Prazo e valor',
  supressao: 'Supressão',
};

export interface EncerramentoArt {
  id: string;
  numero_art: string;
  tipo: ArtTipo | string;
  aditivo_session_id: string | null;
  aditivo_sequencia: number | null;
  aditivo_tipo: string | null;
}

export interface EncerramentoObra {
  id: string;
  nome: string;
  municipio: string | null;
  endereco_completo: string | null;
  n_contrato: string | null;
  sei_numero: string | null;
  data_inicio: string | null;
  previsao_termino: string | null;
  data_termino_real: string | null;
  data_recebimento_provisorio: string | null;
  data_recebimento_definitivo: string | null;
  status: string;
  valor_inicial: number;
  valor_aditivado: number;
  valor_final: number;
  valor_executado: number;
  fiscal_nome?: string | null;
  nucleo_nome?: string | null;
  sistemas_servicos_ids?: string[];
  sistemas_servicos_textos?: string[];
  arts: EncerramentoArt[];
}


export interface EncerramentoEmpresa {
  id: string;
  razao_social: string;
  cnpj: string;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  representante_legal_nome: string | null;
  representante_legal_cpf: string | null;
  representante_legal_cargo: string | null;
  responsavel_tecnico_nome: string | null;
  responsavel_tecnico_cpf: string | null;
  responsavel_tecnico_profissao: string | null;
  conselho_tipo: string | null;
  conselho_numero: string | null;
  conselho_uf: string | null;
}

export interface EncerramentoDPG {
  id: string;
  nome: string;
  cargo: string;
  condicao: string;
  texto_cargo_documento: string;
  cpf: string | null;
  assinatura_url: string | null;
}

export interface EncerramentoInstitucional {
  cnpj: string | null;
  razao_social: string;
  endereco: string | null;
  cidade: string;
}

export interface EncerramentoData {
  obra: EncerramentoObra;
  empresa: EncerramentoEmpresa | null;
  dpg: EncerramentoDPG | null;
  institucional: EncerramentoInstitucional | null;
}

export interface ValidationIssue {
  campo: string;
  mensagem: string;
  severidade: 'erro' | 'aviso';
}

export interface ValidationResult {
  ok: boolean;
  erros: ValidationIssue[];
  avisos: ValidationIssue[];
}
