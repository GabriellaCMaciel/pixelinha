import { describe, expect, it, vi } from 'vitest'
import { createSampleImage, paintSample } from './sampleImage.js'

function fakeContext() {
  const calls = { fills: [] }
  const ctx = {
    calls,
    fillStyle: '',
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fill() {
      calls.fills.push(ctx.fillStyle)
    },
  }
  return ctx
}

describe('sample image', () => {
  it('paints a flat background first, so the unstitched-background option has something to remove', () => {
    const ctx = fakeContext()

    paintSample(ctx)

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 240, 240)
  })

  it('draws several different colors', () => {
    const ctx = fakeContext()

    paintSample(ctx)

    expect(new Set(ctx.calls.fills).size).toBeGreaterThanOrEqual(4)
  })

  it('scales the drawing to the requested size', () => {
    const ctx = fakeContext()

    paintSample(ctx, 480)

    expect(ctx.scale).toHaveBeenCalledWith(2, 2)
  })

  it('makes a PNG file', async () => {
    const ctx = fakeContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done) =>
      done(new Blob(['png'], { type: 'image/png' })),
    )

    const file = await createSampleImage()

    expect(file).toBeInstanceOf(File)
    expect(file.type).toBe('image/png')
    expect(file.name).toBe('flor-de-exemplo.png')
    vi.restoreAllMocks()
  })

  it('fails clearly when the canvas is not available', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    await expect(createSampleImage()).rejects.toThrow('canvas-unavailable')
    vi.restoreAllMocks()
  })
})
