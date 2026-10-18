import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
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

function renderControls(overrides = {}, props = {}) {
  const onChange = vi.fn()
  render(<Controls limits={limits} values={{ ...values, ...overrides }} onChange={onChange} {...props} />)
  return onChange
}

describe('Controls: size', () => {
  it('offers three sizes with their width in centimeters', () => {
    renderControls()

    expect(screen.getByRole('radio', { name: /Pequeno.*9 cm de largura/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Médio.*18 cm de largura/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Grande.*29 cm de largura/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Personalizado/ })).toBeInTheDocument()
  })

  it('marks the size that matches the current width', () => {
    renderControls({ gridWidth: 100 })

    expect(screen.getByRole('radio', { name: /Médio/ })).toBeChecked()
    expect(screen.queryByRole('slider', { name: 'Largura do bordado' })).not.toBeInTheDocument()
  })

  it('changes the centimeters with the fabric', () => {
    renderControls({ fabricCount: 18 })

    expect(screen.getByRole('radio', { name: /Médio.*14 cm de largura/ })).toBeInTheDocument()
  })

  it('reports the width of the chosen size', async () => {
    const user = userEvent.setup()
    const onChange = renderControls()

    await user.click(screen.getByRole('radio', { name: /Pequeno/ }))

    expect(onChange).toHaveBeenCalledWith({ gridWidth: 50 })
  })

  it('keeps the sizes inside the server limits', () => {
    const onChange = vi.fn()
    render(
      <Controls
        limits={{ ...limits, max_grid_width: 120 }}
        values={values}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('radio', { name: /Grande.*22 cm de largura/ })).toBeInTheDocument()
  })

  it('shows a slider in centimeters for a custom size', async () => {
    const user = userEvent.setup()
    const onChange = renderControls()

    await user.click(screen.getByRole('radio', { name: /Personalizado/ }))

    const slider = screen.getByRole('slider', { name: 'Largura do bordado' })
    expect(slider).toHaveAttribute('min', '10')
    expect(slider).toHaveAttribute('max', '300')
    expect(slider).toHaveValue('100')
    expect(screen.getByText('18,1 cm (100 pontos)')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.change(slider, { target: { value: '150' } })
    expect(onChange).toHaveBeenCalledWith({ gridWidth: 150 })
  })

  it('opens the custom slider when the width matches no size', () => {
    renderControls({ gridWidth: 123 })

    expect(screen.getByRole('radio', { name: /Personalizado/ })).toBeChecked()
    expect(screen.getByRole('slider', { name: 'Largura do bordado' })).toHaveValue('123')
  })

  it('goes back to the buttons when a size is picked again', async () => {
    const user = userEvent.setup()
    function Page() {
      const [current, setCurrent] = useState({ ...values, gridWidth: 123 })
      return (
        <Controls
          limits={limits}
          values={current}
          onChange={(change) => setCurrent((previous) => ({ ...previous, ...change }))}
        />
      )
    }
    render(<Page />)

    await user.click(screen.getByRole('radio', { name: /Grande/ }))

    expect(screen.queryByRole('slider', { name: 'Largura do bordado' })).not.toBeInTheDocument()
  })
})

describe('Controls: colors', () => {
  it('uses the server limits for the colors slider', () => {
    renderControls()

    const colors = screen.getByRole('slider', { name: 'Cores' })
    expect(colors).toHaveAttribute('min', '1')
    expect(colors).toHaveAttribute('max', '40')
    expect(colors).toHaveValue('16')
    expect(screen.getByText('16 cores')).toBeInTheDocument()
  })

  it('uses the singular for one color', () => {
    renderControls({ nColors: 1 })

    expect(screen.getByText('1 cor')).toBeInTheDocument()
  })

  it('reports the new number of colors', () => {
    const onChange = renderControls()

    fireEvent.change(screen.getByRole('slider', { name: 'Cores' }), { target: { value: '8' } })

    expect(onChange).toHaveBeenCalledWith({ nColors: 8 })
  })

  it('always recommends more colors for a more detailed result', () => {
    renderControls()

    expect(screen.getByText(/Para um resultado mais detalhado, recomendamos usar mais cores/)).toBeInTheDocument()
  })

  it('warns when there are few colors', () => {
    renderControls({ nColors: 6 })

    expect(screen.getByText(/Atenção: com poucas cores, imagens cheias de detalhes perdem qualidade/)).toBeInTheDocument()
  })

  it('does not warn with enough colors', () => {
    renderControls({ nColors: 10 })

    expect(screen.queryByText(/Atenção: com poucas cores/)).not.toBeInTheDocument()
  })
})

describe('Controls: more options', () => {
  it('keeps fabric and background folded by default', () => {
    const { container } = render(<Controls limits={limits} values={values} onChange={() => {}} />)

    expect(container.querySelector('details')).not.toHaveAttribute('open')
    expect(screen.getByText('Mais opções: tecido e fundo')).toBeInTheDocument()
  })

  it('offers the fabric counts from the server and marks the usual one', () => {
    renderControls()

    const select = screen.getByRole('combobox', { name: 'Tecido' })
    expect(select).toHaveValue('14')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Aida 11',
      'Aida 14 (a mais comum)',
      'Aida 16',
      'Aida 18',
      'Aida 20',
      'Aida 22',
    ])
  })

  it('explains what Aida is', () => {
    renderControls()

    expect(screen.getByText(/Aida é o tecido quadriculado do ponto cruz/)).toBeInTheDocument()
  })

  it('reports the chosen fabric count as a number', async () => {
    const user = userEvent.setup()
    const onChange = renderControls()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Tecido' }), '18')

    expect(onChange).toHaveBeenCalledWith({ fabricCount: 18 })
  })

  it('toggles the unstitched background', async () => {
    const user = userEvent.setup()
    const onChange = renderControls()

    await user.click(screen.getByRole('checkbox', { name: /Deixar o fundo sem ponto/ }))

    expect(onChange).toHaveBeenCalledWith({ ignoreBackground: true })
  })

  it('reflects the checked state', () => {
    renderControls({ ignoreBackground: true })

    expect(screen.getByRole('checkbox', { name: /Deixar o fundo sem ponto/ })).toBeChecked()
  })

  it('can be disabled as a whole', () => {
    renderControls({}, { disabled: true })

    expect(screen.getByRole('slider', { name: 'Cores' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Médio/ })).toBeDisabled()
    expect(screen.getByRole('checkbox')).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Tecido' })).toBeDisabled()
  })
})
