import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Controls from './Controls.jsx'

const limits = { min_grid_width: 10, max_grid_width: 300, min_colors: 1, max_colors: 40 }
const values = { gridWidth: 100, nColors: 16, ignoreBackground: false }

describe('Controls', () => {
  it('uses the server limits for the sliders', () => {
    render(<Controls limits={limits} values={values} onChange={() => {}} />)

    const width = screen.getByRole('slider', { name: 'Largura' })
    expect(width).toHaveAttribute('min', '10')
    expect(width).toHaveAttribute('max', '300')
    expect(width).toHaveValue('100')

    const colors = screen.getByRole('slider', { name: 'Cores' })
    expect(colors).toHaveAttribute('min', '1')
    expect(colors).toHaveAttribute('max', '40')
    expect(colors).toHaveValue('16')
  })

  it('shows the current values with their units', () => {
    render(<Controls limits={limits} values={{ ...values, nColors: 1 }} onChange={() => {}} />)

    expect(screen.getByText('100 pontos')).toBeInTheDocument()
    expect(screen.getByText('1 cor')).toBeInTheDocument()
  })

  it('reports the new width as a number', () => {
    const onChange = vi.fn()
    render(<Controls limits={limits} values={values} onChange={onChange} />)

    fireEvent.change(screen.getByRole('slider', { name: 'Largura' }), { target: { value: '150' } })

    expect(onChange).toHaveBeenCalledWith({ gridWidth: 150 })
  })

  it('reports the new number of colors', () => {
    const onChange = vi.fn()
    render(<Controls limits={limits} values={values} onChange={onChange} />)

    fireEvent.change(screen.getByRole('slider', { name: 'Cores' }), { target: { value: '8' } })

    expect(onChange).toHaveBeenCalledWith({ nColors: 8 })
  })

  it('toggles the unstitched background', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Controls limits={limits} values={values} onChange={onChange} />)

    await user.click(screen.getByRole('checkbox', { name: /Deixar o fundo sem ponto/ }))

    expect(onChange).toHaveBeenCalledWith({ ignoreBackground: true })
  })

  it('reflects the checked state', () => {
    render(<Controls limits={limits} values={{ ...values, ignoreBackground: true }} onChange={() => {}} />)

    expect(screen.getByRole('checkbox', { name: /Deixar o fundo sem ponto/ })).toBeChecked()
  })

  it('can be disabled as a whole', () => {
    render(<Controls limits={limits} values={values} onChange={() => {}} disabled />)

    expect(screen.getByRole('slider', { name: 'Largura' })).toBeDisabled()
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })
})
