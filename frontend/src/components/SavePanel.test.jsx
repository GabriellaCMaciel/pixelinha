import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../hooks/authContext.js'
import SavePanel from './SavePanel.jsx'

vi.mock('../services/library.js', () => ({
  listFolders: vi.fn(),
  createFolder: vi.fn(),
  saveEmbroidery: vi.fn(),
  updateEmbroidery: vi.fn(),
}))

const library = await import('../services/library.js')

const file = new File(['x'], 'flor-da-vovo.png', { type: 'image/png' })
const settings = { gridWidth: 100, nColors: 16, ignoreBackground: false, fabricCount: 14 }

function show({ user = { id: 'u1' }, enabled = true, status = 'ready', requestLogin = vi.fn(), opened = null, ready = true } = {}) {
  render(
    <AuthContext.Provider value={{ user, enabled, status, requestLogin }}>
      <SavePanel file={file} settings={settings} ready={ready} opened={opened} />
    </AuthContext.Provider>,
    { wrapper: MemoryRouter },
  )
  return { requestLogin, user: userEvent.setup() }
}

beforeEach(() => {
  vi.clearAllMocks()
  library.listFolders.mockResolvedValue([
    { id: 'f1', name: 'Presentes' },
    { id: 'f2', name: 'Pets' },
  ])
  library.saveEmbroidery.mockImplementation(async ({ title }) => ({ id: 'e1', title }))
})

describe('SavePanel without an account', () => {
  it('explains that an account is needed to save, open later and organize in folders', () => {
    show({ user: null })

    expect(screen.getByText(/salvar este bordado, voltar a ele depois e organizar tudo em pastas/)).toBeInTheDocument()
    expect(screen.getByText(/Sem conta você continua podendo gerar o gráfico e baixar o PDF/)).toBeInTheDocument()
  })

  it('offers the sign-in window', async () => {
    const { requestLogin, user } = show({ user: null })

    await user.click(screen.getByRole('button', { name: 'Entrar ou criar conta' }))

    expect(requestLogin).toHaveBeenCalled()
  })

  it('shows nothing when the site has no login', () => {
    const { requestLogin } = show({ user: null, enabled: false })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(requestLogin).not.toHaveBeenCalled()
  })
})

describe('SavePanel with an account', () => {
  it('suggests the photo name as the title and lists the folders', async () => {
    show()

    expect(screen.getByLabelText('Título')).toHaveValue('flor-da-vovo')
    expect(await screen.findByRole('option', { name: 'Presentes' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sem pasta' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Criar uma pasta nova/ })).toBeInTheDocument()
  })

  it('saves in the chosen folder', async () => {
    const { user } = show()
    await screen.findByRole('option', { name: 'Pets' })

    await user.selectOptions(screen.getByLabelText('Pasta'), 'f2')
    await user.clear(screen.getByLabelText('Título'))
    await user.type(screen.getByLabelText('Título'), 'Maria Marta')
    await user.click(screen.getByRole('button', { name: 'Salvar bordado' }))

    expect(library.saveEmbroidery).toHaveBeenCalledWith({
      userId: 'u1',
      file,
      settings,
      title: 'Maria Marta',
      folderId: 'f2',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Bordado salvo: “Maria Marta”.')
    expect(screen.getByRole('link', { name: 'Ver meus bordados' })).toHaveAttribute('href', '/meus-bordados')
  })

  it('creates a new folder and saves in it', async () => {
    library.createFolder.mockResolvedValue({ id: 'f3', name: 'Flores' })
    const { user } = show()
    await screen.findByRole('option', { name: 'Pets' })

    await user.selectOptions(screen.getByLabelText('Pasta'), '__new__')
    await user.type(screen.getByLabelText('Nome da nova pasta'), 'Flores')
    await user.click(screen.getByRole('button', { name: 'Salvar bordado' }))

    await waitFor(() => expect(library.saveEmbroidery).toHaveBeenCalled())
    expect(library.createFolder).toHaveBeenCalledWith('Flores')
    expect(library.saveEmbroidery.mock.calls[0][0].folderId).toBe('f3')
  })

  it('asks for the new folder name before saving', async () => {
    const { user } = show()
    await screen.findByRole('option', { name: 'Pets' })

    await user.selectOptions(screen.getByLabelText('Pasta'), '__new__')
    await user.click(screen.getByRole('button', { name: 'Salvar bordado' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Digite o nome da nova pasta')
    expect(library.saveEmbroidery).not.toHaveBeenCalled()
  })

  it('asks for a title', async () => {
    const { user } = show()

    await user.clear(screen.getByLabelText('Título'))
    await user.click(screen.getByRole('button', { name: 'Salvar bordado' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Dê um título')
    expect(library.saveEmbroidery).not.toHaveBeenCalled()
  })

  it('explains a failure to save', async () => {
    const error = Object.assign(new Error('limit'), { code: 'limit_embroideries' })
    library.saveEmbroidery.mockRejectedValue(error)
    const { user } = show()

    await user.click(screen.getByRole('button', { name: 'Salvar bordado' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('limite de 100 bordados')
  })

  it('cannot save while the chart is not ready', () => {
    show({ ready: false })

    expect(screen.getByRole('button', { name: 'Salvar bordado' })).toBeDisabled()
  })

  it('offers to save changes or to save as a new one when a saved embroidery was opened', async () => {
    library.updateEmbroidery.mockImplementation(async (id, { title }) => ({ id, title }))
    const opened = { id: 'e9', title: 'Gato', folder_id: 'f2', settings: { ...settings, nColors: 8 } }
    const { user } = show({ opened })
    await screen.findByRole('option', { name: 'Pets' })

    expect(screen.getByLabelText('Título')).toHaveValue('Gato')
    expect(screen.getByLabelText('Pasta')).toHaveValue('f2')

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(library.updateEmbroidery).toHaveBeenCalledWith('e9', { title: 'Gato', folderId: 'f2', settings })
    expect(await screen.findByRole('status')).toHaveTextContent('Alterações salvas')
  })

  it('has nothing to save while an opened embroidery is unchanged', async () => {
    const opened = { id: 'e9', title: 'Gato', folder_id: 'f2', settings }
    show({ opened })
    await screen.findByRole('option', { name: 'Pets' })

    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salvar como novo' })).toBeEnabled()
  })
})
