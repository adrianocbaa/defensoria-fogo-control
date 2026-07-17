import type { EncerramentoData, EncerramentoTipo, ValidationIssue, ValidationResult } from './types';

function push(list: ValidationIssue[], campo: string, mensagem: string, severidade: 'erro' | 'aviso' = 'erro') {
  list.push({ campo, mensagem, severidade });
}

function validaBase(data: EncerramentoData): ValidationIssue[] {
  const erros: ValidationIssue[] = [];
  const { obra, empresa, dpg, institucional } = data;

  if (!obra.nome) push(erros, 'obra.nome', 'Nome da obra é obrigatório');
  if (!obra.n_contrato) push(erros, 'obra.n_contrato', 'Nº do contrato é obrigatório');
  if (!obra.endereco_completo) push(erros, 'obra.endereco_completo', 'Endereço completo da obra é obrigatório');
  if (!obra.municipio) push(erros, 'obra.municipio', 'Município é obrigatório');
  if (!obra.data_inicio) push(erros, 'obra.data_inicio', 'Data de início é obrigatória');

  if (!empresa) {
    push(erros, 'empresa', 'Empresa contratada não vinculada à obra');
  } else {
    if (!empresa.cnpj) push(erros, 'empresa.cnpj', 'CNPJ da contratada é obrigatório');
    if (!empresa.representante_legal_nome) push(erros, 'empresa.representante_legal_nome', 'Representante legal da contratada é obrigatório');
    if (!empresa.responsavel_tecnico_nome) push(erros, 'empresa.responsavel_tecnico_nome', 'Responsável técnico da contratada é obrigatório');
    if (!empresa.conselho_numero) push(erros, 'empresa.conselho_numero', 'Registro no conselho profissional é obrigatório');
  }

  if (!dpg) push(erros, 'dpg', 'DPG em exercício não configurado no painel administrativo');
  if (!institucional?.cnpj) push(erros, 'institucional.cnpj', 'CNPJ institucional não configurado');

  return erros;
}

export function validaDocumento(tipo: EncerramentoTipo, data: EncerramentoData): ValidationResult {
  const erros = validaBase(data);
  const avisos: ValidationIssue[] = [];
  const { obra } = data;

  const artsContrato = (obra.arts || []).filter((a) => !a.aditivo_session_id);

  if (tipo === 'TRP') {
    if (!obra.data_recebimento_provisorio) push(erros, 'obra.data_recebimento_provisorio', 'Informe a data do recebimento provisório');
    if (artsContrato.length === 0) push(avisos, 'obra.arts', 'Recomenda-se cadastrar ao menos uma ART/RRT do contrato', 'aviso');
  }

  if (tipo === 'TRD') {
    if (!obra.data_recebimento_provisorio) push(erros, 'obra.data_recebimento_provisorio', 'TRD exige recebimento provisório prévio');
    if (!obra.data_recebimento_definitivo) push(erros, 'obra.data_recebimento_definitivo', 'Informe a data do recebimento definitivo');
    if (obra.data_recebimento_provisorio && obra.data_recebimento_definitivo && obra.data_recebimento_definitivo < obra.data_recebimento_provisorio) {
      push(erros, 'obra.data_recebimento_definitivo', 'Recebimento definitivo não pode ser anterior ao provisório');
    }
  }

  if (tipo === 'ACT') {
    if (!obra.data_termino_real) push(erros, 'obra.data_termino_real', 'ACT exige data de término real da obra');
    if (artsContrato.length === 0) push(erros, 'obra.arts', 'Cadastre ao menos uma ART/RRT vinculada ao contrato para emitir o ACT');
    if (obra.valor_executado <= 0) push(avisos, 'obra.valor_executado', 'Valor executado da obra está zerado', 'aviso');
  }

  return {
    ok: erros.length === 0,
    erros,
    avisos,
  };
}
