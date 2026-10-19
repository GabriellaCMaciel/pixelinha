import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  MAX_CELL,
  MIN_CELL,
  cellAt,
  clampCell,
  drawChart,
  fitCellSize,
  gridOrigin,
  zoomStep,
} from '../lib/chartRender.js'
import './GridViewer.css'

function describeCell(chart, hover) {
  if (!hover) return ''
  const place = `Linha ${hover.row + 1}, coluna ${hover.col + 1}`
  const index = chart.grid[hover.row][hover.col]
  if (index < 0) return `${place}: sem ponto`
  const color = chart.colors[index]
  return `${place}: ${color.symbol} ${color.code} ${color.name_pt ?? color.name}`
}

/**
 * Chart on a canvas that only paints what is on screen, so a 300 x 300 chart
 * stays smooth. The scroller holds an empty spacer with the full size of the
 * chart, and the canvas stays pinned to the visible window.
 */
export default function GridViewer({ chart, highlight = null, busy = false }) {
  const scrollerRef = useRef(null)
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const anchorRef = useRef(null)
  const drawRef = useRef(() => {})

  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(null)
  const [hover, setHover] = useState(null)

  const { width: cols, height: rows } = chart

  // A manual zoom belongs to one chart size; a chart with new dimensions starts
  // fitted to the screen again.
  const sizeKey = `${cols}x${rows}`
  const manualCell = zoom?.key === sizeKey ? zoom.cell : null
  const fit = manualCell === null
  const cell = manualCell ?? fitCellSize(cols, rows, viewport.w, viewport.h)
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1

  // Follow the size of the visible window.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return undefined

    const measure = () => setViewport({ w: scroller.clientWidth, h: scroller.clientHeight })
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  const zoomTo = useCallback(
    (next) => {
      const scroller = scrollerRef.current
      if (!scroller) return
      const origin = gridOrigin(cols, rows, cell, viewport.w, viewport.h)
      // Remember which cell is in the middle so it stays there after the zoom.
      anchorRef.current = {
        col: (scroller.scrollLeft + viewport.w / 2 - origin.x) / cell,
        row: (scroller.scrollTop + viewport.h / 2 - origin.y) / cell,
      }
      setZoom({ key: sizeKey, cell: clampCell(next) })
    },
    [cell, cols, rows, sizeKey, viewport.w, viewport.h],
  )

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const anchor = anchorRef.current
    if (!scroller || !anchor) return
    anchorRef.current = null

    const origin = gridOrigin(cols, rows, cell, viewport.w, viewport.h)
    scroller.scrollLeft = anchor.col * cell + origin.x - viewport.w / 2
    scroller.scrollTop = anchor.row * cell + origin.y - viewport.h / 2
  }, [cell, cols, rows, viewport.w, viewport.h])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const scroller = scrollerRef.current
    if (!canvas || !scroller || viewport.w === 0 || viewport.h === 0) return

    const context = canvas.getContext('2d')
    if (!context) return

    drawChart(context, chart, {
      cell,
      scrollLeft: scroller.scrollLeft,
      scrollTop: scroller.scrollTop,
      viewportW: viewport.w,
      viewportH: viewport.h,
      dpr,
      highlight,
    })
  }, [chart, cell, viewport.w, viewport.h, dpr, highlight])

  useEffect(() => {
    drawRef.current = draw
    draw()
  }, [draw])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const handleScroll = () => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => drawRef.current())
  }

  const handleMouseMove = (event) => {
    const scroller = scrollerRef.current
    const bounds = scroller.getBoundingClientRect()
    const origin = gridOrigin(cols, rows, cell, viewport.w, viewport.h)
    const hit = cellAt(event.clientX - bounds.left, event.clientY - bounds.top, {
      scrollLeft: scroller.scrollLeft,
      scrollTop: scroller.scrollTop,
      cell,
      cols,
      rows,
      originX: origin.x,
      originY: origin.y,
    })
    setHover((previous) =>
      previous?.col === hit?.col && previous?.row === hit?.row ? previous : hit,
    )
  }

  const handleKeyDown = (event) => {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      zoomTo(zoomStep(cell, 1))
    } else if (event.key === '-') {
      event.preventDefault()
      zoomTo(zoomStep(cell, -1))
    } else if (event.key === '0') {
      event.preventDefault()
      setZoom(null)
    }
  }

  const summary = `Gráfico de ponto cruz com ${cols} por ${rows} pontos e ${chart.colors.length} ${
    chart.colors.length === 1 ? 'cor' : 'cores'
  }`

  return (
    <section className={`viewer${busy ? ' viewer--busy' : ''}`} aria-label="Gráfico">
      <div className="viewer__toolbar">
        <div className="viewer__zoom" role="group" aria-label="Aproximar ou afastar">
          <button
            type="button"
            className="viewer__button"
            onClick={() => zoomTo(zoomStep(cell, -1))}
            disabled={cell <= MIN_CELL}
          >
            <span aria-hidden="true">−</span> Afastar
          </button>
          <output className="visually-hidden" aria-label="Tamanho de cada ponto">
            {cell} px
          </output>
          <button
            type="button"
            className="viewer__button"
            onClick={() => zoomTo(zoomStep(cell, 1))}
            disabled={cell >= MAX_CELL}
          >
            <span aria-hidden="true">+</span> Aproximar
          </button>
          <button
            type="button"
            className="viewer__button viewer__button--text"
            onClick={() => setZoom(null)}
            disabled={fit}
          >
            Ver tudo
          </button>
        </div>
        <p className="viewer__hover" aria-hidden="true">
          {describeCell(chart, hover)}
        </p>
      </div>

      <div
        ref={scrollerRef}
        className="viewer__scroller"
        tabIndex={0}
        role="group"
        aria-label={`${summary}. Use as setas para rolar, mais e menos para o zoom e zero para ajustar à tela.`}
        onScroll={handleScroll}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        onKeyDown={handleKeyDown}
      >
        <canvas
          ref={canvasRef}
          className="viewer__canvas"
          role="img"
          aria-label={summary}
          width={Math.round(viewport.w * dpr)}
          height={Math.round(viewport.h * dpr)}
          style={{
            width: viewport.w,
            height: viewport.h,
            marginRight: -viewport.w,
            marginBottom: -viewport.h,
          }}
        />
        <div
          className="viewer__spacer"
          aria-hidden="true"
          style={{ width: cols * cell, height: rows * cell }}
        />
      </div>

      <p className="viewer__tip">
        Aproxime para ver cada ponto. Arraste ou role para ver o resto do gráfico.
      </p>
    </section>
  )
}
