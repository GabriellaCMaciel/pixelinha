import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FolderPanel from './FolderPanel.jsx'

const folders = [
  { id: 'f1', name: 'Presentes' },
  { id: 'f2', name: 'Pets' },
]

function show(overrides = {}) {
  const props = {
    folders,
    counts: { f1: 3, f2: 1 },
    total: 5,
    loose: 1,
    selected: 'all',
    onSelect: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(undefined),
    onRename: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(<FolderPanel {...props} />)
  return { props, user: userEvent.setup() }
}

describe('FolderPanel', () => {
  it('lists everything, the loose ones and each folder with its count', () => {
    show()

    expect(screen.getByRole('button', { name: /Todos os bordados/ })).toHaveTextContent('5')
    expect(screen.getByRole('button', { name: /Sem pasta/ })).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: /^Presentes/ })).toHaveTextContent('3')
    expect(screen.getByRole('button', { name: /^Pets/ })).toHaveTextContent('1')
  })

  it('marks the selected one and selects another on click', async () => {
    const { props, user } = show({ selected: 'f1' })

    expect(screen.getByRole('button', { name: /^Presentes/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /^Pets/ }))

    expect(props.onSelect).toHaveBeenCalledWith('f2')
  })

  it('creates a folder and clears the field', async () => {
    const { props, user } = show()

    await user.type(screen.getByLabelText('Nova pasta'), '  Flores ')
    await user.click(screen.getByRole('button', { name: 'Criar' }))

    expect(props.onCreate).toHaveBeenCalledWith('  Flores ')
    expect(screen.getByLabelText('Nova pasta')).toHaveValue('')
  })

  it('keeps the typed name when creating fails', async () => {
    const { user } = show({ onCreate: vi.fn().mockRejectedValue(new Error('x')) })

    await user.type(screen.getByLabelText('Nova pasta'), 'Flores')
    await user.click(screen.getByRole('button', { name: 'Criar' }))

    expect(screen.getByLabelText('Nova pasta')).toHaveValue('Flores')
  })

  it('does not create a folder without a name', () => {
    show()

    expect(screen.getByRole('button', { name: 'Criar' })).toBeDisabled()
  })

  it('renames a folder', async () => {
    const { props, user } = show()

    await user.click(screen.getByRole('button', { name: 'Renomear a pasta Presentes' }))
    const field = screen.getByLabelText('Novo nome da pasta Presentes')
    expect(field).toHaveValue('Presentes')
    await user.clear(field)
    await user.type(field, 'Aniversários')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(props.onRename).toHaveBeenCalledWith('f1', 'Aniversários')
    expect(screen.queryByLabelText('Novo nome da pasta Presentes')).not.toBeInTheDocument()
  })

  it('can cancel a rename', async () => {
    const { props, user } = show()

    await user.click(screen.getByRole('button', { name: 'Renomear a pasta Presentes' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(props.onRename).not.toHaveBeenCalled()
  })

  it('asks before deleting and says the embroideries are kept', async () => {
    const { props, user } = show()

    await user.click(screen.getByRole('button', { name: 'Excluir a pasta Presentes' }))
    const confirm = screen.getByRole('group', { name: 'Confirmar exclusão da pasta Presentes' })
    expect(confirm).toHaveTextContent('não serão apagados')
    expect(props.onDelete).not.toHaveBeenCalled()

    await user.click(within(confirm).getByRole('button', { name: 'Excluir pasta' }))

    expect(props.onDelete).toHaveBeenCalledWith('f1')
  })

  it('can give up deleting a folder', async () => {
    const { props, user } = show()

    await user.click(screen.getByRole('button', { name: 'Excluir a pasta Pets' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(props.onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })
})
