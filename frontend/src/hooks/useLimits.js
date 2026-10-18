import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchLimits } from '../services/api.js'

/**
 * Loads the limits enforced by the server. The first call may be slow when a
 * free server was asleep, so callers should show a waiting state.
 *
 * status is 'loading', 'ready' or 'error'.
 */
export function useLimits() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ attempt: -1, limits: null, error: null })

  useEffect(() => {
    const controller = new AbortController()

    fetchLimits({ signal: controller.signal })
      .then((limits) => setState({ attempt, limits, error: null }))
      .catch((error) => {
        if (error?.name === 'AbortError') return
        const apiError = error instanceof ApiError ? error : new ApiError({ code: 'unknown' })
        setState({ attempt, limits: null, error: apiError })
      })

    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const settled = state.attempt === attempt
  let status = 'loading'
  if (settled) status = state.error ? 'error' : 'ready'

  return {
    limits: settled ? state.limits : null,
    error: settled ? state.error : null,
    status,
    retry,
  }
}
