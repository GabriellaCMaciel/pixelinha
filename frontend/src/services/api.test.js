import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, downloadPdf, fetchLimits, generateChart } from './api.js'

function reply(body, status = 200) {
  return { ok: status < 400, status, json: async () => body }
}

const file = new File(['pixels'], 'photo.png', { type: 'image/png' })

describe('api client', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('generateChart', () => {
    it('posts the image and the settings as form data', async () => {
      fetchMock.mockResolvedValue(reply({ width: 10 }))

      const chart = await generateChart({ file, gridWidth: 80, nColors: 12 })

      expect(chart).toEqual({ width: 10 })
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/v1/cross-stitch/preview')
      expect(options.method).toBe('POST')
      expect(options.body.get('image')).toBe(file)
      expect(options.body.get('grid_width')).toBe('80')
      expect(options.body.get('n_colors')).toBe('12')
      expect(options.body.get('ignore_background')).toBe('false')
      expect(options.body.has('background_code')).toBe(false)
    })

    it('sends the background options when they are set', async () => {
      fetchMock.mockResolvedValue(reply({}))

      await generateChart({
        file,
        gridWidth: 50,
        nColors: 2,
        ignoreBackground: true,
        backgroundCode: '310',
      })

      const body = fetchMock.mock.calls[0][1].body
      expect(body.get('ignore_background')).toBe('true')
      expect(body.get('background_code')).toBe('310')
    })

    it('sends the fabric count only when it is set', async () => {
      fetchMock.mockResolvedValue(reply({}))

      await generateChart({ file, gridWidth: 50, nColors: 4 })
      await generateChart({ file, gridWidth: 50, nColors: 4, fabricCount: 18 })

      expect(fetchMock.mock.calls[0][1].body.has('fabric_count')).toBe(false)
      expect(fetchMock.mock.calls[1][1].body.get('fabric_count')).toBe('18')
    })

    it('turns a structured API error into an ApiError', async () => {
      fetchMock.mockResolvedValue(
        reply(
          {
            detail: {
              code: 'too_many_stitches',
              message: 'too big',
              max_grid_width: 120,
              max_stitches: 90000,
            },
          },
          422,
        ),
      )

      const error = await generateChart({ file, gridWidth: 300, nColors: 8 }).catch((e) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(422)
      expect(error.code).toBe('too_many_stitches')
      expect(error.details).toEqual({ max_grid_width: 120, max_stitches: 90000 })
    })

    it('reports a server error whose body is not JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('not json')
        },
      })

      const error = await generateChart({ file, gridWidth: 50, nColors: 4 }).catch((e) => e)

      expect(error.code).toBe('server')
      expect(error.status).toBe(502)
    })

    it('reports a validation error that has no code as unknown', async () => {
      fetchMock.mockResolvedValue(reply({ detail: [{ msg: 'field required' }] }, 422))

      const error = await generateChart({ file, gridWidth: 50, nColors: 4 }).catch((e) => e)

      expect(error.code).toBe('unknown')
    })

    it('reports a failure to reach the server as a network error', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

      const error = await generateChart({ file, gridWidth: 50, nColors: 4 }).catch((e) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error.code).toBe('network')
    })

    it('lets an aborted request through untouched', async () => {
      const abort = new DOMException('Aborted', 'AbortError')
      fetchMock.mockRejectedValue(abort)

      await expect(generateChart({ file, gridWidth: 50, nColors: 4 })).rejects.toBe(abort)
    })

    it('passes the abort signal to fetch', async () => {
      fetchMock.mockResolvedValue(reply({}))
      const controller = new AbortController()

      await generateChart({ file, gridWidth: 50, nColors: 4, signal: controller.signal })

      expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal)
    })
  })

  describe('downloadPdf', () => {
    const pdfReply = (headers = {}) => ({
      ok: true,
      status: 200,
      headers: { get: (name) => headers[name] ?? null },
      blob: async () => new Blob(['%PDF'], { type: 'application/pdf' }),
    })

    it('posts the chart settings, the title and the style', async () => {
      fetchMock.mockResolvedValue(pdfReply())

      await downloadPdf({
        file,
        gridWidth: 80,
        nColors: 12,
        fabricCount: 16,
        title: '  Minha flor ',
        style: 'bw',
      })

      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/v1/cross-stitch/pdf')
      expect(options.method).toBe('POST')
      expect(options.body.get('image')).toBe(file)
      expect(options.body.get('grid_width')).toBe('80')
      expect(options.body.get('fabric_count')).toBe('16')
      expect(options.body.get('title')).toBe('Minha flor')
      expect(options.body.get('style')).toBe('bw')
    })

    it('leaves out an empty title and defaults to color', async () => {
      fetchMock.mockResolvedValue(pdfReply())

      await downloadPdf({ file, gridWidth: 80, nColors: 12, title: '   ' })

      const body = fetchMock.mock.calls[0][1].body
      expect(body.has('title')).toBe(false)
      expect(body.get('style')).toBe('color')
    })

    it('resolves with the file and the name the server chose', async () => {
      fetchMock.mockResolvedValue(
        pdfReply({ 'Content-Disposition': 'attachment; filename="minha-flor.pdf"' }),
      )

      const { blob, fileName } = await downloadPdf({ file, gridWidth: 80, nColors: 12 })

      expect(blob.type).toBe('application/pdf')
      expect(fileName).toBe('minha-flor.pdf')
    })

    it('has a name of its own when the server sends none', async () => {
      fetchMock.mockResolvedValue(pdfReply())

      const { fileName } = await downloadPdf({ file, gridWidth: 80, nColors: 12 })

      expect(fileName).toBe('grafico-ponto-cruz.pdf')
    })

    it('reports the same errors as the preview', async () => {
      fetchMock.mockResolvedValue(
        reply({ detail: { code: 'invalid_style', message: 'bad', allowed: ['color', 'bw'] } }, 422),
      )

      const error = await downloadPdf({ file, gridWidth: 80, nColors: 12 }).catch((e) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error.code).toBe('invalid_style')
    })
  })

  describe('fetchLimits', () => {
    it('returns the limits from the server', async () => {
      fetchMock.mockResolvedValue(reply({ max_grid_width: 300 }))

      await expect(fetchLimits()).resolves.toEqual({ max_grid_width: 300 })
      expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/limits')
    })

    it('fails with an ApiError when the server answers with an error', async () => {
      fetchMock.mockResolvedValue(reply({}, 500))

      await expect(fetchLimits()).rejects.toBeInstanceOf(ApiError)
    })
  })
})
