import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EmbroideryCard from './EmbroideryCard.jsx'

const item = {
  id: 'e1',
  title: 'Maria Marta',
  folder_id: 'f2',
  settings: { gridWidth: 100, nColors: 16 },
  created_at: '2026-10-19T12:00:00Z',
}
const folders = [
  { id: 'f1', name: 'Presentes' },
  { id: 'f2', name: 'Pets' },
]

function show() {
  const props = {
    item,
    thumbUrl: 'https://example.com/thumb.jpg',
    folders,
    onOpen: vi.fn(),
    onMove: vi.fn().mockResolvedValue(undefined),
    onRename: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
  }
  render(
    <ul>
      <EmbroideryCard {...props} />
    </ul>,
  )
  return { props, user: userEvent.setup() }
}

describe('EmbroideryCard', () => {
  it('shows the title, the size and the folder', () => {
    show()

    expect(screen.getByRole('heading', { name: 'Maria Marta' })).toBeInTheDocument()
    expect(screen.getByText(/100 pontos de largura · 16 cores/)).toBeInTheDocument()
    expect(screen.getByLabelText('Pasta')).toHaveValue('f2')
  })

  it('opens the embroidery', async () => {
    const { props, user } = show()

    await user.click(screen.getByRole('button', { name: 'Abrir' }))

    expect(props.onOpen).toHaveBeenCalledWith(item)
  })

  it('moves it to another folder and out of any folder', async () => {
    const { props, user } = show()

    await user.selectOptions(screen.getByLabelText('Pasta'), 'f1')
    await user.selectOptions(screen.getByLabelText('Pasta'), '')

    expect(props.onMove).toHaveBeenNthCalledWith(1, 'e1', 'f1')
    expect(props.onMove).toHaveBeenNthCalledWith(2, 'e1', null)
  })

  it('renames it', async () => {
    const { props, user } = show()

    await user.click(screen.getByRole('button', { name: 'Renomear Maria Marta' }))
    const field = screen.getByLabelText('Novo título de Maria Marta')
    await user.clear(field)
    await user.type(field, 'Kiara')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(props.onRename).toHaveBeenCalledWith('e1', 'Kiara')
  })

  it('asks before deleting and warns that the photo goes too', async () => {
    const { props, user } = show()

    await user.click(screen.getByRole('button', { name: 'Excluir Maria Marta' }))
    const confirm = screen.getByRole('group', { name: 'Confirmar exclusão de Maria Marta' })
    expect(confirm).toHaveTextContent('apaga também a foto guardada')
    expect(props.onDelete).not.toHaveBeenCalled()

    await user.click(within(confirm).getByRole('button', { name: 'Excluir bordado' }))

    expect(props.onDelete).toHaveBeenCalledWith(item)
  })
})
