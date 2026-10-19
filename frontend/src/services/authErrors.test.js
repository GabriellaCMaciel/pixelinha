import { describe, expect, it } from 'vitest'
import { describeAuthError } from './authErrors.js'

describe('describeAuthError', () => {
  it('explains wrong credentials', () => {
    expect(describeAuthError({ code: 'invalid_credentials' })).toMatch(/E-mail ou senha incorretos/)
  })

  it('points to signing in when the account already exists', () => {
    expect(describeAuthError({ code: 'user_already_exists' })).toMatch(/Já existe uma conta/)
  })

  it('asks for a stronger password', () => {
    expect(describeAuthError({ code: 'weak_password' })).toMatch(/6 caracteres/)
  })

  it('says to wait when there were too many attempts', () => {
    expect(describeAuthError({ code: 'over_request_rate_limit' })).toMatch(/Espere alguns minutos/)
  })

  it('explains a network failure', () => {
    const error = { name: 'AuthRetryableFetchError', message: 'Failed to fetch' }

    expect(describeAuthError(error)).toMatch(/falar com o servidor/)
  })

  it('has a plain fallback for anything else', () => {
    expect(describeAuthError(new Error('boom'))).toMatch(/Tente de novo/)
  })
})
