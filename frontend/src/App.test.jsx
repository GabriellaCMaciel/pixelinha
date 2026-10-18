import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { ApiError } from './services/api.js'

vi.mock('./services/api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchLimits: vi.fn(),
  generateChart: vi.fn(),
  downloadPdf: vi.fn(),
}))

vi.mock('./lib/saveFile.js', () => ({ saveFile: vi.fn() }))

vi.mock('./lib/sampleImage.js', () => ({
  createSampleImage: vi.fn(() =>
    Promise.resolve(new File(['x'], 'flor-de-exemplo.png', { type: 'image/png' })),
  ),
}))

const { fetchLimits, generateChart, downloadPdf } = await import('./services/api.js')
const { saveFile } = await import('./lib/saveFile.js')

const limits = {
  max_upload_bytes: 10 * 1024 * 1024,
  max_image_pixels: 40_000_000,
  min_grid_width: 10,
  max_grid_width: 300,
  min_colors: 1,
  max_colors: 40,
  max_stitches: 90_000,
  fabric_counts: [11, 14, 16, 18, 20, 22],
  default_fabric_count: 14,
}

function chartOf(width, extra = {}) {
  return {
    width,
    height: width,
    total_stitches: width * width,
    fabric: { count: 14, width_cm: 10, height_cm: 10 },
    colors: [
      { code: '310', name: 'Black', hex: '#000000', rgb: [0, 0, 0], symbol: '●', count: width * width, skeins: 2 },
    ],
    grid: Array.from({ length: width }, () => Array(width).fill(0)),
    background: null,
    ...extra,
  }
}

beforeEach(() => {
  fetchLimits.mockReset()
  generateChart.mockReset()
  downloadPdf.mockReset()
  saveFile.mockReset()
  fetchLimits.mockResolvedValue(limits)
  downloadPdf.mockResolvedValue({ blob: new Blob(['%PDF']), fileName: 'grafico.pdf' })
  generateChart.mockImplementation(({ gridWidth }) => Promise.resolve(chartOf(gridWidth)))

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    new Proxy({}, { get: () => () => {}, set: () => true }),
  )
})

describe('App', () => {
  it('shows the name of the product', async () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'PixeLinha' })).toBeInTheDocument()
    await screen.findByRole('button', { name: 'Testar com uma imagem de exemplo' })
  })

  it('tells the person it is connecting to the server', async () => {
    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent('Conectando ao servidor')
    await screen.findByRole('button', { name: 'Testar com uma imagem de exemplo' })
  })

  it('offers a retry when the server cannot be reached', async () => {
    const user = userEvent.setup()
    fetchLimits.mockRejectedValueOnce(new ApiError({ code: 'network' }))
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível falar com o servidor')

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByRole('button', { name: 'Testar com uma imagem de exemplo' })).toBeInTheDocument()
  })

  it('invites the person to pick an image before there is a chart', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Escolha a foto' })).toBeInTheDocument()
    expect(screen.getByText('Escolha uma foto no passo 1 e o gráfico aparece aqui.')).toBeInTheDocument()
    expect(generateChart).not.toHaveBeenCalled()
  })

  it('shows only the first step until there is a photo', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Escolha a foto' })

    expect(screen.queryByRole('heading', { name: 'Ajuste do seu jeito' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Baixe e imprima' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Testar com uma imagem de exemplo' }))

    expect(await screen.findByRole('heading', { name: 'Ajuste do seu jeito' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Baixe e imprima' })).toBeInTheDocument()
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

    await user.click(screen.getByRole('radio', { name: /Personalizado/ }))
    fireEvent.change(screen.getByRole('slider', { name: 'Largura do bordado' }), { target: { value: '60' } })

    await waitFor(() => expect(generateChart).toHaveBeenCalledTimes(2))
    expect(generateChart.mock.calls[1][0].gridWidth).toBe(60)
    expect(await screen.findByRole('img', { name: /60 por 60/ })).toBeInTheDocument()
  })

  it('asks again with the width of the chosen size', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Testar com uma imagem de exemplo' }))
    await screen.findByRole('img')

    await user.click(screen.getByRole('radio', { name: /Pequeno/ }))

    await waitFor(() => expect(generateChart).toHaveBeenCalledTimes(2))
    expect(generateChart.mock.calls[1][0].gridWidth).toBe(50)
  })

  it('asks again with the chosen fabric', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Testar com uma imagem de exemplo' }))
    await screen.findByRole('img')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Tecido' }), '18')

    await waitFor(() => expect(generateChart).toHaveBeenCalledTimes(2))
    expect(generateChart.mock.calls[0][0].fabricCount).toBe(14)
    expect(generateChart.mock.calls[1][0].fabricCount).toBe(18)
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

  it('keeps the PDF button locked while the chart is loading', async () => {
    const user = userEvent.setup()
    generateChart.mockReturnValue(new Promise(() => {}))
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Testar com uma imagem de exemplo' }))

    expect(await screen.findByRole('button', { name: 'Baixar PDF' })).toBeDisabled()
  })

  it('downloads the PDF of the chart on screen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Testar com uma imagem de exemplo' }))
    await screen.findByRole('img')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Tecido' }), '18')
    await waitFor(() => expect(generateChart).toHaveBeenCalledTimes(2))
    await screen.findByRole('img')
    await user.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    await waitFor(() => expect(saveFile).toHaveBeenCalled())
    expect(downloadPdf.mock.calls[0][0]).toMatchObject({
      gridWidth: 100,
      nColors: 16,
      fabricCount: 18,
      style: 'color',
    })
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
