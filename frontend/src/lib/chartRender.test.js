import { describe, expect, it, vi } from 'vitest'
import {
  MAX_CELL,
  MIN_CELL,
  cellAt,
  clampCell,
  drawChart,
  fitCellSize,
  gridOrigin,
  textColorFor,
  visibleRange,
  zoomStep,
} from './chartRender.js'

describe('textColorFor', () => {
  it('uses dark text on light colors and light text on dark colors', () => {
    expect(textColorFor([255, 255, 255])).toBe('#12081c')
    expect(textColorFor([255, 230, 0])).toBe('#12081c')
    expect(textColorFor([0, 0, 0])).toBe('#ffffff')
    expect(textColorFor([0, 0, 160])).toBe('#ffffff')
  })
})

describe('zoom', () => {
  it('keeps cell sizes inside the allowed range', () => {
    expect(clampCell(0)).toBe(MIN_CELL)
    expect(clampCell(500)).toBe(MAX_CELL)
    expect(clampCell(10.4)).toBe(10)
  })

  it('fits the whole chart in the viewport', () => {
    expect(fitCellSize(100, 50, 800, 600)).toBe(8)
    expect(fitCellSize(50, 100, 800, 600)).toBe(6)
  })

  it('never fits below the minimum or above the maximum', () => {
    expect(fitCellSize(300, 300, 300, 300)).toBe(MIN_CELL)
    expect(fitCellSize(2, 2, 800, 600)).toBe(MAX_CELL)
  })

  it('falls back to the minimum when the viewport has no size yet', () => {
    expect(fitCellSize(10, 10, 0, 0)).toBe(MIN_CELL)
  })

  it('steps in and out by at least one pixel', () => {
    expect(zoomStep(2, 1)).toBe(3)
    expect(zoomStep(3, -1)).toBe(2)
    expect(zoomStep(20, 1)).toBe(25)
    expect(zoomStep(20, -1)).toBe(16)
  })

  it('stops at the limits', () => {
    expect(zoomStep(MAX_CELL, 1)).toBe(MAX_CELL)
    expect(zoomStep(MIN_CELL, -1)).toBe(MIN_CELL)
  })

  it('always moves between two neighbouring sizes without skipping or looping', () => {
    for (let size = MIN_CELL; size < MAX_CELL; size += 1) {
      expect(zoomStep(size, 1)).toBeGreaterThan(size)
    }
    for (let size = MAX_CELL; size > MIN_CELL; size -= 1) {
      expect(zoomStep(size, -1)).toBeLessThan(size)
    }
  })
})

describe('layout', () => {
  it('centers a chart that is smaller than the viewport', () => {
    expect(gridOrigin(10, 10, 10, 300, 200)).toEqual({ x: 100, y: 50 })
  })

  it('anchors a chart that is larger than the viewport to the corner', () => {
    expect(gridOrigin(100, 100, 10, 300, 200)).toEqual({ x: 0, y: 0 })
  })

  it('finds the visible columns and rows', () => {
    const range = visibleRange({
      scrollLeft: 45,
      scrollTop: 0,
      viewportW: 100,
      viewportH: 50,
      cell: 10,
      cols: 100,
      rows: 100,
    })

    expect(range).toEqual({ colStart: 4, colEnd: 15, rowStart: 0, rowEnd: 5 })
  })

  it('never goes past the chart', () => {
    const range = visibleRange({
      scrollLeft: 0,
      scrollTop: 0,
      viewportW: 1000,
      viewportH: 1000,
      cell: 10,
      cols: 5,
      rows: 3,
    })

    expect(range).toEqual({ colStart: 0, colEnd: 5, rowStart: 0, rowEnd: 3 })
  })

  it('takes the centering offset into account', () => {
    const range = visibleRange({
      scrollLeft: 0,
      scrollTop: 0,
      viewportW: 300,
      viewportH: 200,
      cell: 10,
      cols: 10,
      rows: 10,
      originX: 100,
      originY: 50,
    })

    expect(range).toEqual({ colStart: 0, colEnd: 10, rowStart: 0, rowEnd: 10 })
  })

  it('finds the cell under a point', () => {
    const view = { scrollLeft: 0, scrollTop: 0, cell: 10, cols: 5, rows: 5 }

    expect(cellAt(25, 41, view)).toEqual({ col: 2, row: 4 })
    expect(cellAt(55, 5, view)).toBeNull()
    expect(cellAt(-1, 5, view)).toBeNull()
  })

  it('accounts for scroll and centering when finding a cell', () => {
    const view = { scrollLeft: 30, scrollTop: 0, cell: 10, cols: 50, rows: 5 }
    expect(cellAt(5, 5, view)).toEqual({ col: 3, row: 0 })

    const centered = { scrollLeft: 0, scrollTop: 0, cell: 10, cols: 5, rows: 5, originX: 100, originY: 20 }
    expect(cellAt(105, 25, centered)).toEqual({ col: 0, row: 0 })
    expect(cellAt(50, 25, centered)).toBeNull()
  })
})

function fakeContext() {
  const ctx = {
    fillRects: [],
    texts: [],
    strokes: [],
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke() {
      ctx.strokes.push({ style: ctx.strokeStyle, width: ctx.lineWidth })
    },
    fillRect(x, y, w, h) {
      ctx.fillRects.push({ x, y, w, h, style: ctx.fillStyle, alpha: ctx.globalAlpha })
    },
    fillText(text, x, y) {
      ctx.texts.push({ text, x, y })
    },
  }
  return ctx
}

const colors = [
  { code: '310', rgb: [0, 0, 0], symbol: '●' },
  { code: '666', rgb: [227, 29, 66], symbol: '■' },
]

function smallChart() {
  return { width: 3, height: 2, colors, grid: [[0, 1, -1], [1, 0, 0]] }
}

const view = (overrides = {}) => ({
  cell: 20,
  scrollLeft: 0,
  scrollTop: 0,
  viewportW: 300,
  viewportH: 200,
  dpr: 1,
  ...overrides,
})

describe('drawChart', () => {
  it('paints the fabric, then one square per stitched cell', () => {
    const ctx = fakeContext()

    drawChart(ctx, smallChart(), view())

    expect(ctx.fillRects).toHaveLength(1 + 5)
    expect(ctx.fillRects[0]).toMatchObject({ w: 300, h: 200 })
  })

  it('leaves cells without a stitch as bare fabric', () => {
    const ctx = fakeContext()
    const chart = { ...smallChart(), grid: [[-1, -1, -1], [-1, -1, -1]] }

    drawChart(ctx, chart, view())

    expect(ctx.fillRects).toHaveLength(1)
  })

  it('draws each symbol on its thread when cells are large enough', () => {
    const ctx = fakeContext()

    drawChart(ctx, smallChart(), view({ cell: 20 }))

    expect(ctx.texts.map((t) => t.text).sort()).toEqual(['■', '■', '●', '●', '●'].sort())
  })

  it('skips the symbols when cells are too small to read them', () => {
    const ctx = fakeContext()

    drawChart(ctx, smallChart(), view({ cell: 8 }))

    expect(ctx.texts).toHaveLength(0)
  })

  it('draws only the cells that are in view', () => {
    const ctx = fakeContext()
    const size = 200
    const grid = Array.from({ length: size }, () => Array(size).fill(0))
    const chart = { width: size, height: size, colors, grid }

    drawChart(ctx, chart, view({ cell: 20, viewportW: 100, viewportH: 100 }))

    expect(ctx.fillRects).toHaveLength(1 + 5 * 5)
  })

  it('dims every color except the highlighted one', () => {
    const ctx = fakeContext()

    drawChart(ctx, smallChart(), view({ highlight: 1 }))

    const stitched = ctx.fillRects.slice(1)
    const bright = stitched.filter((rect) => rect.alpha === 1)
    const dimmed = stitched.filter((rect) => rect.alpha < 1)
    expect(bright).toHaveLength(2)
    expect(dimmed).toHaveLength(3)
  })

  it('draws thin lines and gold guides when zoomed in', () => {
    const ctx = fakeContext()

    drawChart(ctx, smallChart(), view({ cell: 20 }))

    const styles = ctx.strokes.map((stroke) => stroke.style)
    expect(styles).toContain('rgba(29, 15, 46, 0.16)')
    expect(styles).toContain('#b88a2b')
  })

  it('keeps only the gold guides when zoomed far out', () => {
    const ctx = fakeContext()

    drawChart(ctx, smallChart(), view({ cell: 4 }))

    expect(ctx.strokes.every((stroke) => stroke.style === '#b88a2b')).toBe(true)
  })

  it('scales the drawing for high-density screens', () => {
    const ctx = fakeContext()

    drawChart(ctx, smallChart(), view({ dpr: 2 }))

    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
  })
})
