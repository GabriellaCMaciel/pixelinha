/** Turns a Supabase auth error into a sentence a person can act on. */
export function describeAuthError(error) {
  const code = error?.code
  const message = String(error?.message ?? '')

  if (code === 'invalid_credentials') {
    return 'E-mail ou senha incorretos. Confira os dados e tente de novo.'
  }
  if (code === 'user_already_exists' || code === 'email_exists') {
    return 'Já existe uma conta com esse e-mail. Toque em "Entrar" para usá-la.'
  }
  if (code === 'weak_password') {
    return 'Essa senha é fraca. Use pelo menos 6 caracteres, de preferência com letras e números.'
  }
  if (code === 'email_address_invalid' || code === 'validation_failed') {
    return 'Esse e-mail não parece válido. Confira se digitou certo.'
  }
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') {
    return 'Foram muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
  }
  if (code === 'signup_disabled') {
    return 'Criar contas está desligado no momento. Tente de novo mais tarde.'
  }
  if (code === 'email_not_confirmed') {
    return 'Falta confirmar o e-mail. Abra a mensagem que enviamos e toque no link.'
  }
  if (error?.name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(message)) {
    return 'Não foi possível falar com o servidor. Confira a conexão e tente de novo.'
  }
  return 'Não deu certo desta vez. Tente de novo em instantes.'
}
