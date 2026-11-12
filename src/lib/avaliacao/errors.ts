// Tradução segura (allowlist) dos códigos de erro do módulo Avaliações. Nunca exibe a mensagem bruta do servidor.
const MESSAGES: Record<string, string> = {
  permission_denied: 'Você não tem permissão para esta ação nesta avaliação.',
  not_found: 'Registro não encontrado ou fora da sua organização.',
  unauthenticated: 'Sua sessão expirou. Entre novamente.',
  invalid_tipo: 'Tipo de avaliação inválido.',
  missing_required: 'Preencha os campos obrigatórios.',
  invalid_municipio: 'Escolha um município válido da lista oficial do IBGE (o código precisa ser da UF selecionada).',
  invalid_responsavel: 'O responsável técnico precisa ser um técnico ativo da sua organização.',
  invalid_member: 'A pessoa escolhida precisa ser um técnico ativo da sua organização.',
  invalid_papel: 'Papel inválido.',
  rt_required: 'A avaliação precisa ter um responsável técnico ativo.',
  justification_required: 'Escreva uma justificativa mais completa.',
  dataset_frozen: 'O conjunto de dados está congelado e não pode ser alterado. Crie uma nova versão.',
  dataset_empty: 'Selecione ao menos uma amostra antes de congelar.',
  dataset_incomplete: 'Não é possível congelar o conjunto: há amostras sem variáveis obrigatórias.',
  dependent_exists: 'Já existe uma variável dependente nesta avaliação.',
  dataset_not_frozen: 'Congele o conjunto de dados antes de criar modelos.',
  dataset_outdated: 'O conjunto vigente foi congelado antes das últimas alterações em variáveis/amostras. Congele uma nova versão do conjunto antes de gerar modelos.',
  transform_not_authorized: 'Há transformação não autorizada para uma das variáveis.',
  missing_variables: 'Escolha ao menos uma variável independente.',
  model_stale: 'Este modelo está desatualizado. Crie um novo modelo.',
  model_not_calculated: 'Calcule o modelo antes desta etapa.',
  model_immutable: 'Modelo calculado não pode ser alterado. Duplique-o para mudar.',
  model_already_executed: 'Este modelo já foi calculado e é imutável. Crie um novo para alterar.',
  model_not_in_validation: 'Envie o modelo para validação antes.',
  model_in_validation: 'Retire o modelo da validação antes de arquivá-lo.',
  validation_stale: 'A validação está desatualizada. Execute novamente.',
  validation_not_latest: 'Existe uma validação mais recente para este modelo.',
  validation_outdated_reviews: 'Há análises manuais posteriores a esta validação. Execute a validação novamente.',
  validation_not_apt: 'O modelo não está apto para aceite.',
  manual_review_pending: 'Há critérios que exigem análise manual antes do aceite.',
  projection_stale: 'A projeção está desatualizada. Calcule novamente.',
  acceptance_not_current: 'O aceite do modelo não está vigente.',
  invalid_center: 'Tendência central inválida.',
  invalid_conclusion: 'Escolha uma conclusão.',
  invalid_decision: 'Escolha manter a amostra ou excluí-la do modelo.',
  outlier_not_flagged: 'Esta amostra não foi sinalizada como possível outlier nesta validação.',
  model_create_failed: 'Não foi possível criar o novo modelo sem a amostra.',
  arbitration_out_of_field: 'O valor arbitrado está fora do campo de arbítrio.',
  characteristics_required: 'Vincule ao menos uma característica relevante ao arbítrio.',
  invalid_characteristic: 'Característica inválida.',
  section_stale: 'Revise a seção desatualizada antes de aprovar.',
  report_issued_immutable: 'Laudo emitido não pode ser alterado. Crie uma revisão.',
  preflight_required: 'Execute a verificação de emissão e corrija as falhas antes de emitir.',
  preflight_outdated: 'Houve alterações após a verificação. Execute-a novamente.',
  revision_requires_issued: 'Só é possível criar revisão de um laudo emitido.',
  evaluation_cancelled: 'Avaliação cancelada.',
  ai_already_decided: 'Este texto sugerido já foi decidido.',
  field_not_allowed: 'Este campo não pode ser alterado por aqui.',
  entity_not_allowed: 'Alteração não permitida.',
  protected_field: 'Este campo é controlado pelo sistema.',
  immutable_record: 'Registro oficial imutável.',
  organization_immutable: 'A organização do registro não pode ser alterada.',
  cross_org_reference: 'Referência a dado de outra organização não é permitida.',
  invalid_value: 'Há um valor inválido. Confira números, datas e campos obrigatórios.',
  invalid_changes: 'Não foi possível montar as alterações. Recarregue a página e tente novamente.',
  shared_choice_required: 'Este imóvel é usado em outros registros. Escolha se a correção vale para todos ou só para esta amostra.',
  use_change_flow: 'Este dado já é usado na avaliação. Corrija pelo botão de edição para registrar o impacto.',
  evaluation_not_active: 'Só é possível alterar dados de uma avaliação ativa.',
  snapshot_immutable: 'A foto dos dados usados nesta amostra é permanente e não pode ser alterada.',
  ZERO_VARIANCE: 'Uma variável não varia entre as amostras.',
  INVALID_DOMAIN: 'Há valor incompatível com a transformação escolhida (ex.: ln(x) exige valor > 0; 1/x exige valor diferente de zero).',
  N_LE_P: 'Há poucos dados para a quantidade de parâmetros do modelo.',
  RANK_DEFICIENT: 'As variáveis escolhidas não permitem estimar coeficientes independentes (colinearidade/perda de posto).',
  NON_FINITE: 'Há amostra sem valor válido para uma das variáveis do modelo.',
  ZERO_RESIDUAL_VARIANCE: 'O modelo ajusta perfeitamente os dados (sem variância residual).',
  MISSING_VALUES: 'Há amostra sem valor válido para uma das variáveis do modelo.',
  INVALID_INPUT: 'Dados de entrada incompletos.',
  forbidden: 'Você não tem permissão para esta ação.',
  candidate_confirmation_required: 'O volume de candidatos exige confirmação.',
  candidate_hard_limit: 'A quantidade de candidatos passa do máximo permitido pela sua organização.',
  invalid_domain: 'Uma transformação não é válida para algum valor do conjunto congelado (ex.: logaritmo de zero).',
  use_candidate_batch: 'Candidatos gerados devem ser criados pelo modo Assistido ou Exploração ampla.',
  invalid_mode: 'Modo de modelagem inválido.',
  technical_permission_requires_role: 'Decisões técnicas exigem papel na avaliação.',
  files_failed: 'Não foi possível gerar os arquivos oficiais. Tente novamente.',
  files_partial: 'Arquivos oficiais incompletos para esta emissão. Acione o suporte técnico.',
  snapshot_mismatch: 'O registro da emissão não confere com o snapshot oficial.',
  ai_not_configured: 'Integração de IA não configurada. O laudo pode ser redigido manualmente.',
  ai_credits: 'Sem créditos de IA no momento. O laudo pode ser redigido manualmente.',
  ai_rate_limited: 'Muitas solicitações de IA. Aguarde alguns instantes.',
  ai_denied: 'A IA não está liberada para esta organização.',
  ai_failed: 'A IA não respondeu. Tente novamente.',
  ai_rejected: 'A proposta da IA alterou dados protegidos e foi descartada. Tente novamente.',
  ai_empty_base: 'Escreva um texto antes de pedir melhoria.',
  internal_error: 'Não foi possível concluir a ação.',
};

export function avalErrorCode(err: unknown): string | null {
  const anyErr = err as { message?: string; code?: string; context?: unknown } | null;
  const msg = anyErr?.message ?? '';
  const m = /aval:([A-Za-z_]+)/.exec(msg);
  if (m) return m[1];
  // Erros do motor (EngineCallError) e de RPC trazem o código já separado; só vale se estiver na allowlist.
  if (typeof anyErr?.code === 'string' && Object.prototype.hasOwnProperty.call(MESSAGES, anyErr.code)) return anyErr.code;
  if (/row-level security/i.test(msg)) return 'permission_denied';
  if (/permission denied/i.test(msg)) return 'permission_denied';
  return null;
}

export function avalErrorMessage(err: unknown, fallback = 'Não foi possível concluir a ação.'): string {
  const code = avalErrorCode(err);
  return (code && MESSAGES[code]) || fallback;
}

export function avalMessageFromCode(code: string | null | undefined, fallback = 'Não foi possível concluir a ação.'): string {
  return (code && MESSAGES[code]) || fallback;
}
