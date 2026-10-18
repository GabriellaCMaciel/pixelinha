import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Uploader from './Uploader.jsx'

vi.mock('../lib/sampleImage.js', () => ({
  createSampleImage: vi.fn(() =>
    Promise.resolve(new File(['x'], 'flor-de-exemplo.png', { type: 'image/png' })),
  ),
}))

const png = (name = 'foto.png', size = 10) =>
  new File([new Uint8Array(size)], name, { type: 'image/png' })

describe('Uploader', () => {
  it('sends the chosen image', async () => {
    const user = userEvent.setup()
    const onFile = vi.fn()
    render(<Uploader onFile={onFile} />)

    const file = png()
    await user.upload(screen.getByLabelText(/Arraste uma imagem/), file)

    expect(onFile).toHaveBeenCalledWith(file)
  })

  it('accepts an image dropped on the area', () => {
    const onFile = vi.fn()
    render(<Uploader onFile={onFile} />)
    const file = png()

    fireEvent.drop(screen.getByText(/Arraste uma imagem/), { dataTransfer: { files: [file] } })

    expect(onFile).toHaveBeenCalledWith(file)
  })

  it('refuses a format that is not an image the server reads', () => {
    const onFile = vi.fn()
    render(<Uploader onFile={onFile} />)
    const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' })

    fireEvent.drop(screen.getByText(/Arraste uma imagem/), { dataTransfer: { files: [pdf] } })

    expect(onFile).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Formato não suportado')
  })

  it('refuses a file over the size limit', () => {
    const onFile = vi.fn()
    render(<Uploader maxBytes={1024 * 1024} onFile={onFile} />)
    const big = png('grande.png', 2 * 1024 * 1024)

    fireEvent.drop(screen.getByText(/Arraste uma imagem/), { dataTransfer: { files: [big] } })

    expect(onFile).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('passa de 1 MB')
  })

  it('clears the warning after a valid image', () => {
    render(<Uploader onFile={() => {}} />)
    const zone = screen.getByText(/Arraste uma imagem/)

    fireEvent.drop(zone, { dataTransfer: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] } })
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.drop(zone, { dataTransfer: { files: [png()] } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the size limit in the hint', () => {
    render(<Uploader maxBytes={10 * 1024 * 1024} />)

    expect(screen.getByText(/até 10 MB/)).toBeInTheDocument()
  })

  it('shows the current file name', () => {
    render(<Uploader file={png('gato.png')} />)

    expect(screen.getByText('gato.png')).toBeInTheDocument()
    expect(screen.getByText(/para trocar/)).toBeInTheDocument()
  })

  it('offers an example image while nothing is loaded', async () => {
    const user = userEvent.setup()
    const onFile = vi.fn()
    render(<Uploader onFile={onFile} />)

    await user.click(screen.getByRole('button', { name: 'Testar com uma imagem de exemplo' }))

    await waitFor(() => expect(onFile).toHaveBeenCalled())
    expect(onFile.mock.calls[0][0].name).toBe('flor-de-exemplo.png')
  })

  it('hides the example once an image is loaded', () => {
    render(<Uploader file={png()} />)

    expect(screen.queryByRole('button', { name: /exemplo/ })).not.toBeInTheDocument()
  })

  it('does nothing while disabled', () => {
    const onFile = vi.fn()
    render(<Uploader disabled onFile={onFile} />)

    fireEvent.drop(screen.getByText(/Arraste uma imagem/), { dataTransfer: { files: [png()] } })

    expect(onFile).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/Arraste uma imagem/)).toBeDisabled()
  })
})
