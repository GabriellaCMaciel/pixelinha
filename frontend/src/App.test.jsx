import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { ApiError } from './services/api.js'

vi.mock('./services/api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchLimits: vi.fn(),
  generateChart: vi.fn(),
}))

vi.mock('./lib/sampleImage.js', () => ({
  createSampleImage: vi.fn(() =>
    Promise.resolve(new File(['x'], 'flor-de-exemplo.png', { type: 'image/png' })),
  ),
}))

const { fetchLimits, generateChart } = await import('./services/api.js')

const limits = {
  max_upload_bytes: 10 * 1024 * 1024,
  max_image_pixels: 40_000_000,
  min_grid_width: 10,
  max_grid_width: 300,
  min_colors: 1,
  max_colors: 40,
  max_stitches: 90_000,
}

function chartOf(width, extra = {}) {
  return {
    width,
    height: width,
    total_stitches: width * width,
    colors: [
      { code: '310', name: 'Black', hex: '#000000', rgb: [0, 0, 0], symbol: '●', count: width * width },
    ],
    grid: Array.from({ length: width }, () => Array(width).fill(0)),
    background: null,
    ...extra,
  }
}

beforeEach(() => {
  fetchLimits.mockReset()
  generateChart.mockReset()
  fetchLimits.mockResolvedValue(limits)
  generateChart.mockImplementation(({ gridWidth }) => Promise.resolve(chartOf(gridWidth)))

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    new Proxy({}, { get: () => () => {}, set: () => true }),
  )
})

describe('App', () => {
  it('shows the name of the product', async () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'StitchLab' })).toBeInTheDocument()
    await screen.findByRole('slider', { name: 'Largura' })
  })

  it('tells the person it is connecting to the server', async () => {
    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent('Conectando ao servidor')
    await screen.findByRole('slider', { name: 'Largura' })
  })

  it('offers a retry when the server cannot be reached', async () => {
    const user = userEvent.setup()
    fetchLimits.mockRejectedValueOnce(new ApiError({ code: 'network' }))
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível falar com o servidor')

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByRole('slider', { name: 'Largura' })).toBeInTheDocument()
  })

  it('invites the person to pick an image before there is a chart', async () => {
    render(<App />)

    expect(await screen.findByText('O gráfico aparece aqui')).toBeInTheDocument()
    expect(screen.getByText(/As cores, os símbolos e a quantidade de pontos aparecem aqui/)).toBeInTheDocument()
    expect(generateChart).not.toHaveBeenCalled()
  })

  it('makes a chart from the example image', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Testar com uma imagem de exemplo' }))

    expect(await screen.findByRole('img', { name: /Gráfico de ponto cruz com 100 por 100/ })).toBeInTheDocument()
    expect(screen.getByText('DMC 310')).toBeInTheDocument()
    expect(generateChart.mock.calls[0][0]).toMatchObject({ gridWidth: 100, nColors: 16, ignoreBackground: false })
  })

  it('asks again with the new setting after a slider stops moving', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Testar com uma imagem de exemplo' }))
    await screen.findByRole('img')

    fireEvent.change(screen.getByRole('slider', { name: 'Largura' }), { target: { value: '60' } })

    await waitFor(() => expect(generateChart).toHaveBeenCalledTimes(2))
    expect(generateChart.mock.calls[1][0].gridWidth).toBe(60)
    expect(await screen.findByRole('img', { name: /60 por 60/ })).toBeInTheDocument()
  })

  it('sends the unstitched background option', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Testar com uma imagem de exemplo' }))
    await screen.findByRole('img')

    await user.click(screen.getByRole('checkbox', { name: /Deixar o fundo sem ponto/ }))

    await waitFor(() => expect(generateChart).toHaveBeenCalledTimes(2))
    expect(generateChart.mock.calls[1][0].ignoreBackground).toBe(true)
  })

  it('explains an error in Portuguese and keeps the chart on screen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Testar com uma imagem de exemplo' }))
    await screen.findByRole('img')

    generateChart.mockRejectedValueOnce(
      new ApiError({ status: 422, code: 'nothing_to_stitch' }),
    )
    fireEvent.change(screen.getByRole('slider', { name: 'Cores' }), { target: { value: '1' } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Só sobrou o fundo')
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('highlights a thread from the legend', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Testar com uma imagem de exemplo' }))

    const row = await screen.findByRole('button', { name: /DMC 310/ })
    await user.click(row)

    expect(row).toHaveAttribute('aria-pressed', 'true')
  })
})
