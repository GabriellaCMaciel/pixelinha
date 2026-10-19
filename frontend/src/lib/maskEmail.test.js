import { describe, expect, it } from 'vitest'
import { accountLabel, maskEmail } from './maskEmail.js'

describe('maskEmail', () => {
  it('keeps only the first letters of each part', () => {
    expect(maskEmail('gabriella@gmail.com')).toBe('ga•••@g•••.com')
  })

  it('keeps the ending of the domain', () => {
    expect(maskEmail('ana@empresa.com.br')).toBe('an•••@e•••.br')
  })

  it('never shows a short name in full', () => {
    expect(maskEmail('a@b.co')).toBe('a•••@b•••.co')
  })

  it('hides anything that is not an e-mail', () => {
    expect(maskEmail('texto')).toBe('•••')
    expect(maskEmail(undefined)).toBe('•••')
  })

  it('never contains the full address', () => {
    expect(maskEmail('gabriella@gmail.com')).not.toContain('gabriella')
  })
})

describe('accountLabel', () => {
  it('prefers the chosen name', () => {
    const user = { email: 'ana@x.com', user_metadata: { display_name: ' Ana ' } }

    expect(accountLabel(user)).toEqual({ name: 'Ana', masked: null })
  })

  it('falls back to the hidden e-mail', () => {
    expect(accountLabel({ email: 'ana@x.com' })).toEqual({ name: null, masked: 'an•••@x•••.com' })
  })
})
