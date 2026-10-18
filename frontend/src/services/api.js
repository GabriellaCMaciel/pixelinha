const API_BASE = import.meta.env.VITE_API_URL ?? ''
const PREFIX = '/api/v1'

/** An error returned by the API, or a failure to reach it. */
export class ApiError extends Error {
  constructor({ status = 0, code = 'unknown', message = '', details = {} }) {
    super(message || code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function toApiError(response) {
  let body = null
  try {
    body = await response.json()
  } catch {
    // The body was not JSON (for example an error page from a proxy).
  }

  const detail = body?.detail
  if (detail && typeof detail === 'object' && !Array.isArray(detail) && detail.code) {
    const { code, message, ...details } = detail
    return new ApiError({ status: response.status, code, message, details })
  }

  const code = response.status >= 500 ? 'server' : 'unknown'
  return new ApiError({ status: response.status, code })
}

async function send(path, options) {
  let response
  try {
    response = await fetch(`${API_BASE}${PREFIX}${path}`, options)
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError({ code: 'network', message: String(error?.message ?? error) })
  }

  if (!response.ok) throw await toApiError(response)
  return response
}

async function request(path, options) {
  return (await send(path, options)).json()
}

/** The form every chart route reads: the image and how to turn it into a chart. */
function chartForm({
  file,
  gridWidth,
  nColors,
  ignoreBackground = false,
  backgroundCode = null,
  fabricCount = null,
}) {
  const form = new FormData()
  form.append('image', file)
  form.append('grid_width', String(gridWidth))
  form.append('n_colors', String(nColors))
  form.append('ignore_background', ignoreBackground ? 'true' : 'false')
  if (backgroundCode) form.append('background_code', backgroundCode)
  if (fabricCount) form.append('fabric_count', String(fabricCount))
  return form
}

/** Limits enforced by the server, so the interface never drifts from them. */
export function fetchLimits({ signal } = {}) {
  return request('/limits', { signal })
}

/**
 * Turn an image into a cross-stitch chart.
 * `backgroundCode` leaves one DMC thread unstitched; `ignoreBackground` lets the
 * server pick the color that is most common along the border. `fabricCount`
 * (Aida stitches per inch) only changes the size in centimeters and the skeins.
 */
export function generateChart({ signal, ...chart }) {
  return request('/cross-stitch/preview', { method: 'POST', body: chartForm(chart), signal })
}

const FALLBACK_FILE_NAME = 'grafico-ponto-cruz.pdf'

function fileNameOf(response) {
  const header = response.headers?.get?.('Content-Disposition') ?? ''
  return /filename="([^"]+)"/.exec(header)?.[1] ?? FALLBACK_FILE_NAME
}

/**
 * Ask for the chart as a printable PDF. Resolves with the file and its name.
 * `style` is 'color' or 'bw'.
 */
export async function downloadPdf({ title = '', style = 'color', signal, ...chart }) {
  const form = chartForm(chart)
  if (title.trim()) form.append('title', title.trim())
  form.append('style', style)

  const response = await send('/cross-stitch/pdf', { method: 'POST', body: form, signal })
  return { blob: await response.blob(), fileName: fileNameOf(response) }
}
