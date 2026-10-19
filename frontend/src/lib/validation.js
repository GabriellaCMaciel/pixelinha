/** Checks for the sign-in and sign-up forms. Messages are meant to be read by people. */

export const PASSWORD_MIN = 8
// Supabase hashes passwords with bcrypt, which only reads the first 72 bytes.
export const PASSWORD_MAX_BYTES = 72

const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/

// A short list of the passwords people choose most often.
const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '87654321',
  'password',
  'password1',
  'senha123',
  'senha1234',
  'qwerty123',
  'abc12345',
  'abcd1234',
  'iloveyou1',
  'brasil123',
  'mudar123',
])

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

/** An empty string means the e-mail looks fine. */
export function validateEmail(value) {
  const email = normalizeEmail(value)
  if (!email) return 'Digite o seu e-mail.'
  const [local = ''] = email.split('@')
  if (
    email.length > 254 ||
    local.length > 64 ||
    email.includes('..') ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    !EMAIL_PATTERN.test(email)
  ) {
    return 'Esse e-mail não parece válido. Confira se digitou certo, por exemplo nome@exemplo.com.'
  }
  return ''
}

/** What a new password needs, each with whether it is already met. */
export function passwordChecks(password) {
  return [
    { id: 'length', label: `Pelo menos ${PASSWORD_MIN} caracteres`, ok: password.length >= PASSWORD_MIN },
    { id: 'letter', label: 'Uma letra', ok: /\p{L}/u.test(password) },
    { id: 'number', label: 'Um número', ok: /\d/.test(password) },
  ]
}

/** An empty string means the new password is acceptable. */
export function validateNewPassword(password, email = '') {
  if (!password) return 'Escolha uma senha.'
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return 'Essa senha é longa demais. Use no máximo 72 caracteres.'
  }
  if (passwordChecks(password).some((check) => !check.ok)) {
    return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres, com letras e números.`
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'Essa senha é muito comum e fácil de adivinhar. Escolha outra.'
  }
  if (normalizeEmail(email) === password.toLowerCase()) {
    return 'A senha não pode ser igual ao e-mail.'
  }
  return ''
}

export function validateConfirmation(password, confirmation) {
  if (!confirmation) return 'Digite a senha de novo para confirmar.'
  if (password !== confirmation) return 'As senhas não são iguais. Confira e tente de novo.'
  return ''
}
