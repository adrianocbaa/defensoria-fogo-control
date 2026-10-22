const messages: Record<string, string> = {
  reset_code_invalid_or_expired: 'O código expirou ou já foi utilizado. Solicite uma nova recuperação de senha.',
  password_rejected: 'Essa senha não pode ser utilizada. Escolha uma senha diferente que atenda aos requisitos de segurança.',
  password_policy: 'Essa senha não pode ser utilizada. Escolha uma senha diferente que atenda aos requisitos de segurança.',
  password_requirements: 'A senha deve ter no mínimo 8 caracteres, incluindo 1 letra maiúscula e 1 número.',
  invalid_request: 'Informe o código de recuperação e a nova senha.',
  internal_error: 'Não foi possível redefinir a senha. Tente novamente.',
  user_not_found: 'Não foi possível redefinir a senha. Tente novamente.',
};

function payloadMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || !('error' in payload) || typeof payload.error !== 'string') return;
  // Only allowlisted categories or exact legacy messages; never display response text.
  const legacy: Record<string, string> = {
    'Código inválido ou expirado': 'reset_code_invalid_or_expired',
    'A senha deve ter no mínimo 8 caracteres, incluindo 1 letra maiúscula e 1 número': 'password_requirements',
  };
  const category = legacy[payload.error] ?? payload.error;
  return Object.prototype.hasOwnProperty.call(messages, category) ? messages[category] : undefined;
}

export async function resetPasswordErrorMessage(error: unknown, payload?: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error && error.context instanceof Response) {
    try {
      const message = payloadMessage(await error.context.clone().json());
      if (message) return message;
    } catch {
      // Missing, consumed, non-JSON or malformed response: use the safe fallback.
    }
  }
  return payloadMessage(payload) ?? messages.internal_error;
}