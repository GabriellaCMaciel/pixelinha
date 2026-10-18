import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Legend from './Legend.jsx'

const colors = [
  { code: '310', name: 'Black', hex: '#000000', rgb: [0, 0, 0], symbol: '●', count: 1500 },
  { code: '666', name: 'Bright Red', hex: '#e31d42', rgb: [227, 29, 66], symbol: '■', count: 99 },
]

const chart = { width: 40, height: 40, total_stitches: 1599, colors, grid: [], background: null }

describe('Legend', () => {
  it('lists every thread with its code, name and count', () => {
    render(<Legend chart={chart} />)

    expect(screen.getByText('DMC 310')).toBeInTheDocument()
    expect(screen.getByText('Black')).toBeInTheDocument()
    expect(screen.getByText('1.500')).toBeInTheDocument()
    expect(screen.getByText('DMC 666')).toBeInTheDocument()
    expect(screen.getByText('99')).toBeInTheDocument()
  })

  it('shows the totals', () => {
    render(<Legend chart={chart} />)

    expect(screen.getByText('1.599 pontos em 2 cores')).toBeInTheDocument()
  })

  it('uses the singular for one stitch of one color', () => {
    const single = { ...chart, total_stitches: 1, colors: [colors[0]] }
    render(<Legend chart={single} />)

    expect(screen.getByText('1 ponto em 1 cor')).toBeInTheDocument()
  })

  it('highlights a thread when its row is picked', async () => {
    const user = userEvent.setup()
    const onHighlight = vi.fn()
    render(<Legend chart={chart} onHighlight={onHighlight} />)

    await user.click(screen.getByRole('button', { name: /DMC 666/ }))

    expect(onHighlight).toHaveBeenCalledWith(1)
  })

  it('clears the highlight when the active row is picked again', async () => {
    const user = userEvent.setup()
    const onHighlight = vi.fn()
    render(<Legend chart={chart} highlight={1} onHighlight={onHighlight} />)

    const row = screen.getByRole('button', { name: /DMC 666/ })
    expect(row).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /DMC 310/ })).toHaveAttribute('aria-pressed', 'false')

    await user.click(row)

    expect(onHighlight).toHaveBeenCalledWith(null)
  })

  it('mentions the unstitched background', () => {
    const withBackground = { ...chart, background: { code: 'B5200', name: 'Snow White', hex: '#ffffff' } }
    render(<Legend chart={withBackground} />)

    expect(screen.getByText(/Fundo sem ponto: DMC B5200 \(Snow White\)/)).toBeInTheDocument()
  })

  it('has no background note when the whole image is stitched', () => {
    render(<Legend chart={chart} />)

    expect(screen.queryByText(/Fundo sem ponto/)).not.toBeInTheDocument()
  })
})
