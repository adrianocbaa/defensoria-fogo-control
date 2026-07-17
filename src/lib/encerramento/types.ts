export type EncerramentoTipo = 'TRP' | 'TRD' | 'ACT';

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
  numero_art_execucao: string | null;
  status: string;
  valor_inicial: number;
  valor_aditivado: number;
  valor_final: number;
  valor_executado: number;
  fiscal_nome?: string | null;
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
