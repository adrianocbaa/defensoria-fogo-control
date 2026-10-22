export type ResetErrorCategory = 'invalid_request' | 'password_requirements' | 'reset_code_invalid_or_expired' | 'password_rejected' | 'password_policy' | 'internal_error';

export const resetErrorMessages: Record<ResetErrorCategory, string> = {
  invalid_request: 'Informe o código de recuperação e a nova senha.',
  password_requirements: 'A senha deve ter no mínimo 8 caracteres, incluindo 1 letra maiúscula e 1 número.',
  reset_code_invalid_or_expired: 'O código expirou ou já foi utilizado. Solicite uma nova recuperação de senha.',
  password_rejected: 'Essa senha não pode ser utilizada. Escolha uma senha diferente.',
  password_policy: 'Essa senha é considerada muito comum ou fácil de adivinhar. Escolha uma senha mais exclusiva.',
  internal_error: 'Não foi possível redefinir a senha. Tente novamente.',
};

export function classifyPasswordUpdateError(error: unknown): ResetErrorCategory {
  if (!error || typeof error !== 'object') return 'internal_error';
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  if (code === 'weak_password') return 'password_policy';
  if (['same_password', 'password_rejected', 'password_compromised', 'password_pwned'].includes(code)) return 'password_rejected';
  // Older Auth versions may provide only a message. Use it solely for classification.
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  if (/password.*(weak|policy|requirements)|weak password/i.test(message)) return 'password_policy';
  if (/password.*(compromised|leaked|breach|pwned)|new password.*different|same password/i.test(message)) return 'password_rejected';
  return 'internal_error';
}