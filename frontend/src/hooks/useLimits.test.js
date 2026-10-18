import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api.js'
import { useLimits } from './useLimits.js'

vi.mock('../services/api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchLimits: vi.fn(),
}))

const { fetchLimits } = await import('../services/api.js')

const limits = { min_grid_width: 10, max_grid_width: 300, min_colors: 1, max_colors: 40 }

beforeEach(() => {
  fetchLimits.mockReset()
})

describe('useLimits', () => {
  it('loads the limits from the server', async () => {
    fetchLimits.mockResolvedValue(limits)
    const { result } = renderHook(() => useLimits())

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(result.current.limits).toEqual(limits)
    expect(result.current.error).toBeNull()
  })

  it('reports a failure and lets the caller try again', async () => {
    fetchLimits.mockRejectedValueOnce(new ApiError({ code: 'network' }))
    fetchLimits.mockResolvedValueOnce(limits)
    const { result } = renderHook(() => useLimits())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error.code).toBe('network')
    expect(result.current.limits).toBeNull()

    act(() => result.current.retry())
    expect(result.current.status).toBe('loading')

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.limits).toEqual(limits)
  })

  it('cancels the request when unmounted', async () => {
    let signal
    fetchLimits.mockImplementation((args) => {
      signal = args.signal
      return new Promise(() => {})
    })
    const { unmount } = renderHook(() => useLimits())

    unmount()

    expect(signal.aborted).toBe(true)
  })
})
