import { describe, expect, it } from 'vitest'
import { ApiError } from './api.js'
import { describeError } from './errors.js'

function error(code, details = {}) {
  return new ApiError({ status: 422, code, details })
}

describe('describeError', () => {
  it('names the allowed range for the grid width', () => {
    expect(describeError(error('invalid_grid_width', { min: 10, max: 300 }))).toBe(
      'A largura precisa ficar entre 10 e 300 pontos.',
    )
  })

  it('names the allowed range for the colors', () => {
    expect(describeError(error('invalid_colors', { min: 1, max: 40 }))).toBe(
      'O número de cores precisa ficar entre 1 e 40.',
    )
  })

  it('shows the upload limit in megabytes', () => {
    const message = describeError(error('file_too_large', { max_bytes: 10 * 1024 * 1024 }))

    expect(message).toContain('10 MB')
  })

  it('suggests a width that works for the image', () => {
    const message = describeError(error('too_many_stitches', { max_grid_width: 120 }))

    expect(message).toContain('120')
  })

  it('tells the user how to fix a chart that has only background', () => {
    expect(describeError(error('nothing_to_stitch'))).toContain('2')
  })

  it('warns that a sleeping server can take a while to answer', () => {
    expect(describeError(error('network'))).toContain('1 minuto')
  })

  it.each([
    'image_too_large',
    'unsupported_format',
    'corrupted_image',
    'background_not_in_palette',
    'invalid_fabric_count',
    'invalid_style',
    'server',
  ])('has a message for %s', (code) => {
    const message = describeError(error(code))

    expect(message.length).toBeGreaterThan(10)
    expect(message).not.toContain(code)
  })

  it('falls back to a generic message for unknown errors', () => {
    expect(describeError(error('something_new'))).toBe(
      'Não foi possível gerar o gráfico. Tente de novo.',
    )
    expect(describeError(undefined)).toBe('Não foi possível gerar o gráfico. Tente de novo.')
  })
})
