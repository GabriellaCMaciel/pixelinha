import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api.js'
import PdfExport from './PdfExport.jsx'

vi.mock('../services/api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  downloadPdf: vi.fn(),
}))

vi.mock('../lib/saveFile.js', () => ({ saveFile: vi.fn() }))

const { downloadPdf } = await import('../services/api.js')
const { saveFile } = await import('../lib/saveFile.js')

const file = new File(['x'], 'foto.png', { type: 'image/png' })
const settings = { gridWidth: 80, nColors: 12, ignoreBackground: true, fabricCount: 16 }
const blob = new Blob(['%PDF'], { type: 'application/pdf' })

beforeEach(() => {
  downloadPdf.mockReset()
  saveFile.mockReset()
  downloadPdf.mockResolvedValue({ blob, fileName: 'minha-flor.pdf' })
})

describe('PdfExport', () => {
  it('waits for a chart before offering the download', () => {
    render(<PdfExport file={null} settings={settings} ready={false} />)

    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeDisabled()
    expect(screen.getByText(/Escolha uma imagem e espere o gráfico/)).toBeInTheDocument()
  })

  it('downloads the chart with the settings on screen', async () => {
    const user = userEvent.setup()
    render(<PdfExport file={file} settings={settings} ready />)

    await user.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    await waitFor(() => expect(saveFile).toHaveBeenCalledWith(blob, 'minha-flor.pdf'))
    expect(downloadPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        file,
        gridWidth: 80,
        nColors: 12,
        ignoreBackground: true,
        fabricCount: 16,
        title: '',
        style: 'color',
      }),
    )
  })

  it('sends the title and the black and white style that were chosen', async () => {
    const user = userEvent.setup()
    render(<PdfExport file={file} settings={settings} ready />)

    await user.type(screen.getByLabelText(/Título/), 'Flor da vovó')
    await user.click(screen.getByRole('radio', { name: /Preto e branco/ }))
    await user.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    await waitFor(() => expect(downloadPdf).toHaveBeenCalled())
    expect(downloadPdf.mock.calls[0][0]).toMatchObject({ title: 'Flor da vovó', style: 'bw' })
  })

  it('starts on the colored style', () => {
    render(<PdfExport file={file} settings={settings} ready />)

    expect(screen.getByRole('radio', { name: /Colorido/ })).toBeChecked()
  })

  it('shows progress and blocks a second click while the PDF is made', async () => {
    const user = userEvent.setup()
    downloadPdf.mockReturnValue(new Promise(() => {}))
    render(<PdfExport file={file} settings={settings} ready />)

    await user.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    expect(screen.getByRole('button', { name: 'Gerando o PDF…' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Montando as páginas')
  })

  it('confirms when the PDF was downloaded', async () => {
    const user = userEvent.setup()
    render(<PdfExport file={file} settings={settings} ready />)

    await user.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    expect(await screen.findByText(/PDF baixado/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeEnabled()
  })

  it('explains an error in Portuguese and allows another try', async () => {
    const user = userEvent.setup()
    downloadPdf.mockRejectedValueOnce(new ApiError({ code: 'network' }))
    render(<PdfExport file={file} settings={settings} ready />)

    await user.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível falar com o servidor')
    expect(saveFile).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Baixar PDF' }))
    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('cancels a pending download when it goes away', async () => {
    const user = userEvent.setup()
    let signal
    downloadPdf.mockImplementation((args) => {
      signal = args.signal
      return new Promise(() => {})
    })
    const { unmount } = render(<PdfExport file={file} settings={settings} ready />)

    await user.click(screen.getByRole('button', { name: 'Baixar PDF' }))
    unmount()

    expect(signal.aborted).toBe(true)
  })
})
