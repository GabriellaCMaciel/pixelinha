import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../hooks/authContext.js'
import LibraryPage from './LibraryPage.jsx'

vi.mock('../services/library.js', () => ({
  listFolders: vi.fn(),
  createFolder: vi.fn(),
  renameFolder: vi.fn(),
  deleteFolder: vi.fn(),
  listEmbroideries: vi.fn(),
  updateEmbroidery: vi.fn(),
  deleteEmbroidery: vi.fn(),
  thumbnailUrls: vi.fn(),
  deleteAccount: vi.fn(),
}))

const library = await import('../services/library.js')

const folders = [
  { id: 'f1', name: 'Presentes' },
  { id: 'f2', name: 'Pets' },
]
const embroideries = [
  { id: 'e1', title: 'Maria Marta', folder_id: 'f2', settings: { gridWidth: 100 }, thumb_path: 'u/e1-thumb.jpg', created_at: '2026-10-19T12:00:00Z' },
  { id: 'e2', title: 'Flor da vovó', folder_id: 'f1', settings: { gridWidth: 80 }, thumb_path: 'u/e2-thumb.jpg', created_at: '2026-10-18T12:00:00Z' },
  { id: 'e3', title: 'Sem lar', folder_id: null, settings: { gridWidth: 50 }, thumb_path: 'u/e3-thumb.jpg', created_at: '2026-10-17T12:00:00Z' },
]

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + (location.state?.opened ? `:${location.state.opened.id}` : '')}</p>
}

function show(auth = { user: { id: 'u1' }, enabled: true, status: 'ready', requestLogin: vi.fn() }) {
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/meus-bordados']}>
        <Routes>
          <Route path="/meus-bordados" element={<LibraryPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return { user: userEvent.setup(), auth }
}

beforeEach(() => {
  vi.clearAllMocks()
  library.listFolders.mockResolvedValue(folders)
  library.listEmbroideries.mockResolvedValue(embroideries)
  library.thumbnailUrls.mockResolvedValue({})
})

describe('LibraryPage without an account', () => {
  it('asks the person to sign in and explains why', async () => {
    const requestLogin = vi.fn()
    const { user } = show({ user: null, enabled: true, status: 'ready', requestLogin })

    expect(screen.getByText(/salvar os bordados, voltar a eles depois e organizá-los em pastas/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Entrar ou criar conta' }))

    expect(requestLogin).toHaveBeenCalled()
    expect(library.listFolders).not.toHaveBeenCalled()
  })
})

describe('LibraryPage', () => {
  it('shows every embroidery and the folders with their counts', async () => {
    show()

    expect(await screen.findByRole('heading', { name: 'Maria Marta' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Flor da vovó' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Todos os bordados/ })).toHaveTextContent('3')
    expect(screen.getByRole('button', { name: /^Presentes/ })).toHaveTextContent('1')
  })

  it('filters by folder and by "without folder"', async () => {
    const { user } = show()
    await screen.findByRole('heading', { name: 'Maria Marta' })

    await user.click(screen.getByRole('button', { name: /^Pets/ }))
    expect(screen.getByRole('heading', { name: 'Maria Marta' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Flor da vovó' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Sem pasta/ }))
    expect(screen.getByRole('heading', { name: 'Sem lar' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Maria Marta' })).not.toBeInTheDocument()
  })

  it('moves an embroidery to another folder', async () => {
    library.updateEmbroidery.mockResolvedValue({ ...embroideries[2], folder_id: 'f1' })
    const { user } = show()
    await screen.findByRole('heading', { name: 'Sem lar' })
    const card = screen.getByRole('heading', { name: 'Sem lar' }).closest('li')

    await user.selectOptions(within(card).getByLabelText('Pasta'), 'f1')

    expect(library.updateEmbroidery).toHaveBeenCalledWith('e3', { folderId: 'f1' })
    await waitFor(() => expect(screen.getByRole('button', { name: /^Presentes/ })).toHaveTextContent('2'))
  })

  it('creates a folder', async () => {
    library.createFolder.mockResolvedValue({ id: 'f3', name: 'Flores' })
    const { user } = show()
    await screen.findByRole('heading', { name: 'Maria Marta' })

    await user.type(screen.getByLabelText('Nova pasta'), 'Flores')
    await user.click(screen.getByRole('button', { name: 'Criar' }))

    expect(await screen.findByRole('button', { name: /^Flores/ })).toBeInTheDocument()
  })

  it('explains a duplicate folder name', async () => {
    library.createFolder.mockRejectedValue(Object.assign(new Error('dup'), { code: 'duplicate_folder' }))
    const { user } = show()
    await screen.findByRole('heading', { name: 'Maria Marta' })

    await user.type(screen.getByLabelText('Nova pasta'), 'Pets')
    await user.click(screen.getByRole('button', { name: 'Criar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('já tem uma pasta com esse nome')
  })

  it('deleting a folder keeps its embroideries, which become "without folder"', async () => {
    library.deleteFolder.mockResolvedValue(undefined)
    const { user } = show()
    await screen.findByRole('heading', { name: 'Maria Marta' })

    await user.click(screen.getByRole('button', { name: 'Excluir a pasta Pets' }))
    await user.click(screen.getByRole('button', { name: 'Excluir pasta' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: /^Pets/ })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Maria Marta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sem pasta/ })).toHaveTextContent('2')
  })

  it('deletes an embroidery after asking', async () => {
    library.deleteEmbroidery.mockResolvedValue(undefined)
    const { user } = show()
    await screen.findByRole('heading', { name: 'Sem lar' })

    await user.click(screen.getByRole('button', { name: 'Excluir Sem lar' }))
    await user.click(screen.getByRole('button', { name: 'Excluir bordado' }))

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Sem lar' })).not.toBeInTheDocument())
    expect(library.deleteEmbroidery).toHaveBeenCalledWith(embroideries[2])
  })

  it('opens an embroidery in the generator', async () => {
    const { user } = show()
    await screen.findByRole('heading', { name: 'Maria Marta' })
    const card = screen.getByRole('heading', { name: 'Maria Marta' }).closest('li')

    await user.click(within(card).getByRole('button', { name: 'Abrir' }))

    expect(await screen.findByTestId('where')).toHaveTextContent('/:e1')
  })

  it('says so when there is nothing saved yet', async () => {
    library.listEmbroideries.mockResolvedValue([])
    show()

    expect(await screen.findByText(/Você ainda não salvou nenhum bordado/)).toBeInTheDocument()
  })

  it('offers to try again when loading fails', async () => {
    library.listFolders.mockRejectedValueOnce(new Error('x'))
    const { user } = show()

    expect(await screen.findByText('Não foi possível carregar os seus bordados.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByRole('heading', { name: 'Maria Marta' })).toBeInTheDocument()
  })

  it('deletes the account, then leaves for the home page', async () => {
    library.deleteAccount.mockResolvedValue(undefined)
    const { user } = show()
    await screen.findByRole('heading', { name: 'Maria Marta' })

    await user.click(screen.getByRole('button', { name: 'Quero excluir minha conta' }))
    await user.type(screen.getByLabelText(/digite EXCLUIR/), 'EXCLUIR')
    await user.click(screen.getByRole('button', { name: 'Excluir tudo para sempre' }))

    expect(library.deleteAccount).toHaveBeenCalledWith('u1')
    expect(await screen.findByTestId('where')).toHaveTextContent('/')
  })
})
