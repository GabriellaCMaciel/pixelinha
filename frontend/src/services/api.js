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

async function request(path, options) {
  let response
  try {
    response = await fetch(`${API_BASE}${PREFIX}${path}`, options)
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError({ code: 'network', message: String(error?.message ?? error) })
  }

  if (!response.ok) throw await toApiError(response)
  return response.json()
}

/** Limits enforced by the server, so the interface never drifts from them. */
export function fetchLimits({ signal } = {}) {
  return request('/limits', { signal })
}

/**
 * Turn an image into a cross-stitch chart.
 * `backgroundCode` leaves one DMC thread unstitched; `ignoreBackground` lets the
 * server pick the color that is most common along the border.
 */
export function generateChart({
  file,
  gridWidth,
  nColors,
  ignoreBackground = false,
  backgroundCode = null,
  signal,
}) {
  const form = new FormData()
  form.append('image', file)
  form.append('grid_width', String(gridWidth))
  form.append('n_colors', String(nColors))
  form.append('ignore_background', ignoreBackground ? 'true' : 'false')
  if (backgroundCode) form.append('background_code', backgroundCode)

  return request('/cross-stitch/preview', { method: 'POST', body: form, signal })
}
