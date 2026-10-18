import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GridViewer from './GridViewer.jsx'

const colors = [
  { code: '310', name: 'Black', hex: '#000000', rgb: [0, 0, 0], symbol: '●', count: 1500 },
  { code: '666', name: 'Bright Red', hex: '#e31d42', rgb: [227, 29, 66], symbol: '■', count: 99 },
]

function makeChart(size = 40) {
  const grid = Array.from({ length: size }, () => Array(size).fill(0))
  grid[0][0] = 1
  grid[1][2] = -1
  return { width: size, height: size, total_stitches: size * size - 1, colors, grid, background: null }
}

function fakeContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  }
}

let context

beforeEach(() => {
  context = fakeContext()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)

  // jsdom does no layout, so give every element a 400 x 300 window.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GridViewer', () => {
  it('describes the chart for screen readers', () => {
    render(<GridViewer chart={makeChart()} />)

    expect(screen.getByRole('img', { name: 'Gráfico de ponto cruz com 40 por 40 pontos e 2 cores' })).toBeInTheDocument()
  })

  it('uses the singular for a chart with a single color', () => {
    const chart = { ...makeChart(10), colors: [colors[0]], grid: Array.from({ length: 10 }, () => Array(10).fill(0)) }
    render(<GridViewer chart={chart} />)

    expect(screen.getByRole('img')).toHaveAccessibleName(/1 cor$/)
  })

  it('starts fitted to the screen', () => {
    render(<GridViewer chart={makeChart()} />)

    expect(screen.getByLabelText('Tamanho de cada ponto')).toHaveTextContent('7 px')
    expect(screen.getByRole('button', { name: 'Ver tudo' })).toBeDisabled()
  })

  it('paints the visible cells on the canvas', () => {
    render(<GridViewer chart={makeChart()} />)

    expect(context.fillRect).toHaveBeenCalled()
  })

  it('zooms in and out with the buttons', async () => {
    const user = userEvent.setup()
    render(<GridViewer chart={makeChart()} />)
    const level = screen.getByLabelText('Tamanho de cada ponto')

    await user.click(screen.getByRole('button', { name: 'Aproximar' }))
    expect(level).toHaveTextContent('9 px')

    await user.click(screen.getByRole('button', { name: 'Afastar' }))
    await user.click(screen.getByRole('button', { name: 'Afastar' }))
    expect(level).toHaveTextContent('6 px')
  })

  it('goes back to the fitted size', async () => {
    const user = userEvent.setup()
    render(<GridViewer chart={makeChart()} />)
    const fit = screen.getByRole('button', { name: 'Ver tudo' })

    await user.click(screen.getByRole('button', { name: 'Aproximar' }))
    expect(fit).toBeEnabled()

    await user.click(fit)
    expect(screen.getByLabelText('Tamanho de cada ponto')).toHaveTextContent('7 px')
    expect(fit).toBeDisabled()
  })

  it('disables zoom out at the smallest size', () => {
    render(<GridViewer chart={makeChart(300)} />)

    expect(screen.getByLabelText('Tamanho de cada ponto')).toHaveTextContent('2 px')
    expect(screen.getByRole('button', { name: 'Afastar' })).toBeDisabled()
  })

  it('disables zoom in at the largest size', () => {
    render(<GridViewer chart={makeChart(4)} />)

    expect(screen.getByLabelText('Tamanho de cada ponto')).toHaveTextContent('48 px')
    expect(screen.getByRole('button', { name: 'Aproximar' })).toBeDisabled()
  })

  it('zooms with the keyboard', async () => {
    const user = userEvent.setup()
    render(<GridViewer chart={makeChart()} />)
    const level = screen.getByLabelText('Tamanho de cada ponto')

    screen.getByRole('group', { name: /Use as setas/ }).focus()

    await user.keyboard('+')
    expect(level).toHaveTextContent('9 px')

    await user.keyboard('-')
    expect(level).toHaveTextContent('7 px')

    await user.keyboard('+')
    await user.keyboard('0')
    expect(level).toHaveTextContent('7 px')
    expect(screen.getByRole('button', { name: 'Ver tudo' })).toBeDisabled()
  })

  it('tells which thread is under the pointer', () => {
    render(<GridViewer chart={makeChart()} />)
    const scroller = screen.getByRole('group', { name: /Use as setas/ })

    // The 40 x 40 chart is centered in the 400 x 300 window, starting at (60, 10).
    fireEvent.mouseMove(scroller, { clientX: 60 + 3, clientY: 10 + 3 })
    expect(screen.getByText('Linha 1, coluna 1: ■ 666 Bright Red')).toBeInTheDocument()

    fireEvent.mouseMove(scroller, { clientX: 60 + 7 * 5 + 1, clientY: 10 + 7 * 4 + 1 })
    expect(screen.getByText('Linha 5, coluna 6: ● 310 Black')).toBeInTheDocument()
  })

  it('says when a cell has no stitch', () => {
    render(<GridViewer chart={makeChart()} />)
    const scroller = screen.getByRole('group', { name: /Use as setas/ })

    fireEvent.mouseMove(scroller, { clientX: 60 + 7 * 2 + 1, clientY: 10 + 7 + 1 })

    expect(screen.getByText('Linha 2, coluna 3: sem ponto')).toBeInTheDocument()
  })

  it('clears the readout when the pointer leaves', () => {
    render(<GridViewer chart={makeChart()} />)
    const scroller = screen.getByRole('group', { name: /Use as setas/ })

    fireEvent.mouseMove(scroller, { clientX: 63, clientY: 13 })
    fireEvent.mouseLeave(scroller)

    expect(screen.queryByText(/Linha/)).not.toBeInTheDocument()
  })

  it('ignores the pointer outside the chart', () => {
    render(<GridViewer chart={makeChart()} />)
    const scroller = screen.getByRole('group', { name: /Use as setas/ })

    fireEvent.mouseMove(scroller, { clientX: 5, clientY: 5 })

    expect(screen.queryByText(/Linha/)).not.toBeInTheDocument()
  })

  it('fits again when a chart with other dimensions arrives', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<GridViewer chart={makeChart(40)} />)
    await user.click(screen.getByRole('button', { name: 'Aproximar' }))

    rerender(<GridViewer chart={makeChart(20)} />)

    expect(screen.getByLabelText('Tamanho de cada ponto')).toHaveTextContent('15 px')
    expect(screen.getByRole('button', { name: 'Ver tudo' })).toBeDisabled()
  })

  it('explains how to look around the chart', () => {
    render(<GridViewer chart={makeChart()} />)

    expect(screen.getByText(/Arraste ou role para ver o resto do gráfico/)).toBeInTheDocument()
  })

  it('marks the viewer as busy while a new chart is loading', () => {
    const { container } = render(<GridViewer chart={makeChart()} busy />)

    expect(container.querySelector('.viewer')).toHaveClass('viewer--busy')
  })
})
