import { describe, expect, it } from 'vitest'
import {
  normalizeEmail,
  passwordChecks,
  validateConfirmation,
  validateEmail,
  validateNewPassword,
} from './validation.js'

describe('validateEmail', () => {
  it.each(['ana@exemplo.com', 'ana.silva+pixe@exemplo.com.br', 'A@b.co', '  Ana@Exemplo.COM  '])(
    'accepts %s',
    (email) => {
      expect(validateEmail(email)).toBe('')
    },
  )

  it.each([
    '',
    '   ',
    'ana',
    'ana@',
    '@exemplo.com',
    'ana@exemplo',
    'ana@exemplo.c',
    'ana@@exemplo.com',
    'ana silva@exemplo.com',
    'ana..silva@exemplo.com',
    '.ana@exemplo.com',
    'ana.@exemplo.com',
    'ana@-exemplo.com',
    'ana@exemplo..com',
    'ana@exemplo.com.',
  ])('rejects "%s"', (email) => {
    expect(validateEmail(email)).not.toBe('')
  })

  it('rejects an address that is too long', () => {
    expect(validateEmail(`${'a'.repeat(65)}@exemplo.com`)).not.toBe('')
    expect(validateEmail(`ana@${'b'.repeat(250)}.com`)).not.toBe('')
  })

  it('asks for the e-mail when it is empty', () => {
    expect(validateEmail('')).toBe('Digite o seu e-mail.')
  })
})

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Ana@Exemplo.COM ')).toBe('ana@exemplo.com')
  })
})

describe('validateNewPassword', () => {
  it('accepts letters and numbers with 8 characters or more', () => {
    expect(validateNewPassword('bordado2026')).toBe('')
    expect(validateNewPassword('ponto cruz 1')).toBe('')
  })

  it('asks for a password when empty', () => {
    expect(validateNewPassword('')).toBe('Escolha uma senha.')
  })

  it.each(['curta1', 'somenteletras', '1234567890123'])('rejects "%s"', (password) => {
    expect(validateNewPassword(password)).toMatch(/pelo menos 8 caracteres, com letras e números|comum/)
  })

  it('rejects very common passwords', () => {
    expect(validateNewPassword('senha123')).toMatch(/muito comum/)
    expect(validateNewPassword('Password1')).toMatch(/muito comum/)
  })

  it('rejects a password longer than 72 bytes', () => {
    expect(validateNewPassword(`a1${'x'.repeat(71)}`)).toMatch(/longa demais/)
    expect(validateNewPassword(`a1${'x'.repeat(70)}`)).toBe('')
  })

  it('counts accented letters as letters but also as more than one byte', () => {
    expect(validateNewPassword('açúcar123')).toBe('')
    expect(validateNewPassword(`${'ç'.repeat(36)}1`)).toMatch(/longa demais/)
  })

  it('rejects a password equal to the e-mail', () => {
    expect(validateNewPassword('ana1@exemplo.com', 'Ana1@Exemplo.com')).toMatch(/igual ao e-mail/)
  })
})

describe('passwordChecks', () => {
  it('tells which requirements are met', () => {
    expect(passwordChecks('abc').map((check) => check.ok)).toEqual([false, true, false])
    expect(passwordChecks('abcdefg1').map((check) => check.ok)).toEqual([true, true, true])
  })
})

describe('validateConfirmation', () => {
  it('needs the same password twice', () => {
    expect(validateConfirmation('abc12345', 'abc12345')).toBe('')
    expect(validateConfirmation('abc12345', 'abc1234')).toMatch(/não são iguais/)
    expect(validateConfirmation('abc12345', '')).toMatch(/Digite a senha de novo/)
  })
})
