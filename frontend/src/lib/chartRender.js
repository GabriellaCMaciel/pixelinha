/*
  Drawing helpers for the chart viewer.

  A chart can have 90,000 cells and be zoomed to 48 pixels per cell, which is
  far more than a canvas can hold. So only the cells inside the visible window
  are ever drawn, and the layout math lives here as plain functions.
*/

export const MIN_CELL = 2
export const MAX_CELL = 48

const SYMBOL_MIN_CELL = 12
const GRID_MIN_CELL = 6
const GUIDE_MIN_CELL = 3
const GUIDE_EVERY = 10

const FABRIC = '#f6f1e6'
const THIN_LINE = 'rgba(59, 24, 48, 0.16)'
const GUIDE_LINE = '#b24577'
const DIMMED_ALPHA = 0.18

export function clampCell(size) {
  return Math.min(MAX_CELL, Math.max(MIN_CELL, Math.round(size)))
}

/** Largest whole cell size at which the whole chart fits in the viewport. */
export function fitCellSize(cols, rows, viewportW, viewportH) {
  if (cols < 1 || rows < 1 || viewportW <= 0 || viewportH <= 0) return MIN_CELL
  return clampCell(Math.floor(Math.min(viewportW / cols, viewportH / rows)))
}

/** Next zoom level: about 25% larger or smaller, and always at least 1 px different. */
export function zoomStep(size, direction) {
  const next =
    direction > 0
      ? Math.max(size + 1, Math.round(size * 1.25))
      : Math.min(size - 1, Math.round(size / 1.25))
  return clampCell(next)
}

/** Top-left corner of the chart inside the viewport. Small charts are centered. */
export function gridOrigin(cols, rows, cell, viewportW, viewportH) {
  return {
    x: Math.max(0, Math.floor((viewportW - cols * cell) / 2)),
    y: Math.max(0, Math.floor((viewportH - rows * cell) / 2)),
  }
}

const within = (value, low, high) => Math.min(high, Math.max(low, value))

/** Columns and rows (end exclusive) that intersect the viewport. */
export function visibleRange({
  scrollLeft,
  scrollTop,
  viewportW,
  viewportH,
  cell,
  cols,
  rows,
  originX = 0,
  originY = 0,
}) {
  const left = scrollLeft - originX
  const top = scrollTop - originY
  return {
    colStart: within(Math.floor(left / cell), 0, cols),
    colEnd: within(Math.ceil((left + viewportW) / cell), 0, cols),
    rowStart: within(Math.floor(top / cell), 0, rows),
    rowEnd: within(Math.ceil((top + viewportH) / cell), 0, rows),
  }
}

/** Cell under a point of the viewport, or null when the point is outside the chart. */
export function cellAt(x, y, { scrollLeft, scrollTop, cell, cols, rows, originX = 0, originY = 0 }) {
  const col = Math.floor((x + scrollLeft - originX) / cell)
  const row = Math.floor((y + scrollTop - originY) / cell)
  if (col < 0 || row < 0 || col >= cols || row >= rows) return null
  return { col, row }
}

/** Black or white, whichever reads better on top of the given color. */
export function textColorFor([r, g, b]) {
  const channel = (value) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  return luminance > 0.179 ? '#3b1830' : '#ffffff'
}

function strokeLines(ctx, positions, from, to, vertical) {
  if (positions.length === 0) return
  ctx.beginPath()
  for (const position of positions) {
    if (vertical) {
      ctx.moveTo(position, from)
      ctx.lineTo(position, to)
    } else {
      ctx.moveTo(from, position)
      ctx.lineTo(to, position)
    }
  }
  ctx.stroke()
}

/**
 * Draw the visible part of the chart.
 *
 * chart: { width, height, grid, colors } as returned by the API, where grid
 *   holds a color index per cell and -1 for a cell with no stitch.
 * view: { cell, scrollLeft, scrollTop, viewportW, viewportH, dpr, highlight }
 *   `highlight` is a color index; every other color is dimmed.
 */
export function drawChart(ctx, chart, view) {
  const { cell, scrollLeft, scrollTop, viewportW, viewportH, dpr = 1, highlight = null } = view
  const { width: cols, height: rows, grid, colors } = chart

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, viewportW, viewportH)
  ctx.globalAlpha = 1
  ctx.fillStyle = FABRIC
  ctx.fillRect(0, 0, viewportW, viewportH)

  const origin = gridOrigin(cols, rows, cell, viewportW, viewportH)
  const { colStart, colEnd, rowStart, rowEnd } = visibleRange({
    scrollLeft,
    scrollTop,
    viewportW,
    viewportH,
    cell,
    cols,
    rows,
    originX: origin.x,
    originY: origin.y,
  })
  if (colStart >= colEnd || rowStart >= rowEnd) return

  const screenX = (col) => origin.x - scrollLeft + col * cell
  const screenY = (row) => origin.y - scrollTop + row * cell

  const fills = colors.map((color) => `rgb(${color.rgb[0]}, ${color.rgb[1]}, ${color.rgb[2]})`)
  const inks = colors.map((color) => textColorFor(color.rgb))
  const showSymbols = cell >= SYMBOL_MIN_CELL

  if (showSymbols) {
    ctx.font = `600 ${Math.round(cell * 0.6)}px 'Hanken Grotesk Variable', system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
  }

  for (let row = rowStart; row < rowEnd; row += 1) {
    for (let col = colStart; col < colEnd; col += 1) {
      const index = grid[row][col]
      if (index < 0) continue

      ctx.globalAlpha = highlight === null || highlight === index ? 1 : DIMMED_ALPHA
      ctx.fillStyle = fills[index]
      ctx.fillRect(screenX(col), screenY(row), cell, cell)

      if (showSymbols) {
        ctx.fillStyle = inks[index]
        ctx.fillText(colors[index].symbol, screenX(col) + cell / 2, screenY(row) + cell / 2 + 1)
      }
    }
  }
  ctx.globalAlpha = 1

  // Thin lines between stitches, then gold guides every ten, like a printed chart.
  const left = screenX(colStart)
  const right = screenX(colEnd)
  const top = screenY(rowStart)
  const bottom = screenY(rowEnd)

  const thinCols = []
  const thinRows = []
  const guideCols = []
  const guideRows = []
  for (let col = colStart; col <= colEnd; col += 1) {
    const x = Math.round(screenX(col)) + 0.5
    if (col % GUIDE_EVERY === 0 || col === cols) guideCols.push(x)
    else thinCols.push(x)
  }
  for (let row = rowStart; row <= rowEnd; row += 1) {
    const y = Math.round(screenY(row)) + 0.5
    if (row % GUIDE_EVERY === 0 || row === rows) guideRows.push(y)
    else thinRows.push(y)
  }

  if (cell >= GRID_MIN_CELL) {
    ctx.lineWidth = 1
    ctx.strokeStyle = THIN_LINE
    strokeLines(ctx, thinCols, top, bottom, true)
    strokeLines(ctx, thinRows, left, right, false)
  }
  if (cell >= GUIDE_MIN_CELL) {
    ctx.lineWidth = 1.5
    ctx.strokeStyle = GUIDE_LINE
    strokeLines(ctx, guideCols, top, bottom, true)
    strokeLines(ctx, guideRows, left, right, false)
  }
}
