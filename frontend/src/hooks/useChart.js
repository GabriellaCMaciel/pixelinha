import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, generateChart } from '../services/api.js'

export const DEBOUNCE_MS = 350

/**
 * Asks the server for a chart whenever the image or a setting changes.
 *
 * - A new image is sent at once; slider changes wait until they stop moving.
 * - An older request is cancelled when a newer one starts.
 * - The previous chart stays available while the next one loads, so the page
 *   does not flash empty.
 *
 * status is 'idle' (no image), 'loading', 'ready' or 'error'.
 */
export function useChart({ file, gridWidth, nColors, ignoreBackground, fabricCount }) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ request: null, chart: null, error: null })
  const lastFile = useRef(null)

  // A new object for every combination of inputs: an answer belongs to the
  // request that produced it, which is how we know whether it is still current.
  const request = useMemo(
    () => (file ? { file, gridWidth, nColors, ignoreBackground, fabricCount, attempt } : null),
    [file, gridWidth, nColors, ignoreBackground, fabricCount, attempt],
  )

  useEffect(() => {
    if (!request) return undefined

    const delay = lastFile.current === request.file ? DEBOUNCE_MS : 0
    lastFile.current = request.file

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const chart = await generateChart({ ...request, signal: controller.signal })
        setResult({ request, chart, error: null })
      } catch (error) {
        if (error?.name === 'AbortError') return
        const apiError = error instanceof ApiError ? error : new ApiError({ code: 'unknown' })
        // Keep the old chart only if it was made from the same image.
        setResult((previous) => ({
          request,
          chart: previous.request?.file === request.file ? previous.chart : null,
          error: apiError,
        }))
      }
    }, delay)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [request])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  let status = 'idle'
  if (request) {
    if (result.request !== request) status = 'loading'
    else status = result.error ? 'error' : 'ready'
  }

  // With no image there is nothing to show, whatever was loaded before.
  const chart = request ? result.chart : null
  const error = status === 'error' ? result.error : null

  return { chart, status, error, retry }
}
