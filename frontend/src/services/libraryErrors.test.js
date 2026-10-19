import { describe, expect, it } from 'vitest'
import { describeLibraryError } from './libraryErrors.js'

describe('describeLibraryError', () => {
  it.each([
    ['limit_embroideries', /limite de 100 bordados/],
    ['limit_folders', /limite de 30 pastas/],
    ['duplicate_folder', /já tem uma pasta com esse nome/],
    ['network', /falar com o servidor/],
    ['unavailable', /não está disponível/],
    ['unknown', /Tente de novo/],
  ])('explains %s', (code, expected) => {
    expect(describeLibraryError({ code })).toMatch(expected)
  })
})
