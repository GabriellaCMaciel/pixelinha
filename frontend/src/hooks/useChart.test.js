import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api.js'
import { DEBOUNCE_MS, useChart } from './useChart.js'

vi.mock('../services/api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  generateChart: vi.fn(),
}))

const { generateChart } = await import('../services/api.js')

const fileA = new File(['a'], 'a.png', { type: 'image/png' })
const fileB = new File(['b'], 'b.png', { type: 'image/png' })
const base = { gridWidth: 100, nColors: 16, ignoreBackground: false }
const chartOf = (width) => ({ width, height: width, total_stitches: 1, colors: [], grid: [], background: null })

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  generateChart.mockReset()
  generateChart.mockImplementation(({ gridWidth }) => Promise.resolve(chartOf(gridWidth)))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useChart', () => {
  it('stays idle until there is an image', () => {
    const { result } = renderHook(() => useChart({ file: null, ...base }))

    expect(result.current.status).toBe('idle')
    expect(result.current.chart).toBeNull()
    expect(generateChart).not.toHaveBeenCalled()
  })

  it('sends a new image right away', async () => {
    const { result } = renderHook(() => useChart({ file: fileA, ...base }))

    expect(result.current.status).toBe('loading')
    await flush(0)

    expect(generateChart).toHaveBeenCalledTimes(1)
    expect(generateChart.mock.calls[0][0]).toMatchObject({ file: fileA, gridWidth: 100, nColors: 16 })
    expect(result.current.status).toBe('ready')
    expect(result.current.chart.width).toBe(100)
  })

  it('waits for a slider to stop moving before asking again', async () => {
    const { result, rerender } = renderHook((props) => useChart(props), {
      initialProps: { file: fileA, ...base },
    })
    await flush(0)

    rerender({ file: fileA, ...base, gridWidth: 110 })
    await flush(100)
    rerender({ file: fileA, ...base, gridWidth: 120 })
    await flush(DEBOUNCE_MS - 1)
    expect(generateChart).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('loading')

    await flush(1)

    expect(generateChart).toHaveBeenCalledTimes(2)
    expect(generateChart.mock.calls[1][0].gridWidth).toBe(120)
    expect(result.current.chart.width).toBe(120)
  })

  it('keeps the previous chart while the next one loads', async () => {
    const { result, rerender } = renderHook((props) => useChart(props), {
      initialProps: { file: fileA, ...base },
    })
    await flush(0)

    rerender({ file: fileA, ...base, nColors: 8 })

    expect(result.current.status).toBe('loading')
    expect(result.current.chart.width).toBe(100)
  })

  it('cancels the request that is no longer needed', async () => {
    let signal
    generateChart.mockImplementationOnce((args) => {
      signal = args.signal
      return new Promise(() => {})
    })
    const { rerender } = renderHook((props) => useChart(props), {
      initialProps: { file: fileA, ...base },
    })
    await flush(0)

    rerender({ file: fileA, ...base, gridWidth: 90 })

    expect(signal.aborted).toBe(true)
  })

  it('ignores a cancelled request', async () => {
    generateChart.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const { result } = renderHook(() => useChart({ file: fileA, ...base }))
    await flush(0)

    expect(result.current.status).toBe('loading')
    expect(result.current.error).toBeNull()
  })

  it('reports the server error and keeps the chart from the same image', async () => {
    const { result, rerender } = renderHook((props) => useChart(props), {
      initialProps: { file: fileA, ...base },
    })
    await flush(0)

    generateChart.mockRejectedValueOnce(
      new ApiError({ status: 422, code: 'too_many_stitches', details: { max_grid_width: 250 } }),
    )
    rerender({ file: fileA, ...base, gridWidth: 300 })
    await flush(DEBOUNCE_MS)

    expect(result.current.status).toBe('error')
    expect(result.current.error.code).toBe('too_many_stitches')
    expect(result.current.chart.width).toBe(100)
  })

  it('drops the old chart when the new image fails', async () => {
    const { result, rerender } = renderHook((props) => useChart(props), {
      initialProps: { file: fileA, ...base },
    })
    await flush(0)

    generateChart.mockRejectedValueOnce(new ApiError({ status: 415, code: 'unsupported_format' }))
    rerender({ file: fileB, ...base })
    await flush(0)

    expect(result.current.status).toBe('error')
    expect(result.current.chart).toBeNull()
  })

  it('turns an unexpected failure into an unknown error', async () => {
    generateChart.mockRejectedValueOnce(new TypeError('boom'))
    const { result } = renderHook(() => useChart({ file: fileA, ...base }))
    await flush(0)

    expect(result.current.error.code).toBe('unknown')
  })

  it('tries again on request', async () => {
    generateChart.mockRejectedValueOnce(new ApiError({ code: 'network' }))
    const { result } = renderHook(() => useChart({ file: fileA, ...base }))
    await flush(0)
    expect(result.current.status).toBe('error')

    act(() => result.current.retry())
    await flush(DEBOUNCE_MS)

    expect(generateChart).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('ready')
    expect(result.current.error).toBeNull()
  })

  it('clears everything when the image is removed', async () => {
    const { result, rerender } = renderHook((props) => useChart(props), {
      initialProps: { file: fileA, ...base },
    })
    await flush(0)

    rerender({ file: null, ...base })

    expect(result.current.status).toBe('idle')
    expect(result.current.chart).toBeNull()
  })
})
