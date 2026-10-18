import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Controls from './Controls.jsx'

const limits = {
  min_grid_width: 10,
  max_grid_width: 300,
  min_colors: 1,
  max_colors: 40,
  fabric_counts: [11, 14, 16, 18, 20, 22],
  default_fabric_count: 14,
}
const values = { gridWidth: 100, nColors: 16, ignoreBackground: false, fabricCount: 14 }

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

  it('offers the fabric counts from the server', () => {
    render(<Controls limits={limits} values={values} onChange={() => {}} />)

    const select = screen.getByRole('combobox', { name: 'Tecido' })
    expect(select).toHaveValue('14')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Aida 11',
      'Aida 14',
      'Aida 16',
      'Aida 18',
      'Aida 20',
      'Aida 22',
    ])
  })

  it('reports the chosen fabric count as a number', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Controls limits={limits} values={values} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Tecido' }), '18')

    expect(onChange).toHaveBeenCalledWith({ fabricCount: 18 })
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
    expect(screen.getByRole('combobox', { name: 'Tecido' })).toBeDisabled()
  })
})
